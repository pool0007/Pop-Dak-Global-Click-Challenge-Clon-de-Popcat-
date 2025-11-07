// /api/click.js
import pg from "pg";
import fetch from "node-fetch"; // si tu entorno ya soporta fetch en Node 18+, puedes quitar esta línea

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Helper: convertir ISO2 -> nombre de país (idioma ES o EN según prefieras)
function iso2ToCountryName(iso2) {
  try {
    // usa el API Intl para traducir códigos de región a nombre legible
    const dn = new Intl.DisplayNames(['es'], { type: 'region' }); // 'es' o 'en'
    return dn.of(iso2);
  } catch (e) {
    return null;
  }
}

// Helper: obtiene IP desde headers (x-forwarded-for preferido)
function getClientIpFromReq(req) {
  const xff = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress;
  if (!xff) return null;
  // x-forwarded-for puede ser "ip1, ip2, ...". tomamos la primera.
  const ip = String(xff).split(',')[0].trim();
  // si viene con puerto o en formato ::ffff:1.2.3.4, limpiamos
  return ip.replace(/^::ffff:/, '');
}

async function lookupIpWhoIs(ip) {
  try {
    const url = `https://ipwho.is/${encodeURIComponent(ip)}`;
    const res = await fetch(url, { timeout: 4000 });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.success !== false) {
      return {
        country: json.country || null,
        countryCode: json.country_code || null,
      };
    }
    return null;
  } catch (err) {
    console.warn("ipwho.is lookup failed:", err?.message || err);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  let { country } = req.body || {}; // el cliente puede enviar country, pero si es 'Unknown' lo ignoramos
  if (country && String(country).toLowerCase() === 'unknown') country = null;

  try {
    // 1) intentamos leer header de país que Vercel/Edge normalmente envía (ISO2)
    const headerIso = (req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || req.headers['x-country-code'] || '').toUpperCase().trim();

    let countryName = null;
    if (headerIso && headerIso.length === 2) {
      countryName = iso2ToCountryName(headerIso) || null;
    }

    // 2) si no tenemos país desde header y cliente no envió uno válido, hacemos lookup por IP
    if (!countryName && !country) {
      const clientIp = getClientIpFromReq(req);
      if (clientIp) {
        const geo = await lookupIpWhoIs(clientIp);
        if (geo) {
          countryName = geo.country || (geo.countryCode ? iso2ToCountryName(geo.countryCode) : null);
        }
      }
    }

    // 3) prioridad: cliente-sent country (si es confiable), else server-detected country, else fallback "Unknown"
    const finalCountry = country || countryName || "Unknown";

    // --- DB operations (asumiendo tabla clicks(country PRIMARY KEY, total_clicks) ya creada) ---
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clicks (
        country VARCHAR(100) PRIMARY KEY,
        total_clicks BIGINT DEFAULT 0
      );
    `);

    await pool.query(
      `
      INSERT INTO clicks (country, total_clicks)
      VALUES ($1, 1)
      ON CONFLICT (country)
      DO UPDATE SET total_clicks = clicks.total_clicks + 1
      `,
      [finalCountry]
    );

    // Obtener leaderboard actualizado
    const result = await pool.query(
      "SELECT country, total_clicks FROM clicks ORDER BY total_clicks DESC LIMIT 100"
    );

    res.status(200).json({ success: true, detected: { countryFromClient: country || null, countryFromHeader: headerIso || null, countryServer: countryName || null, finalCountry }, leaderboard: result.rows });
  } catch (err) {
    console.error("Error /api/click:", err);
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
}


