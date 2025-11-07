// /api/click.js
import pg from "pg";

const { Pool } = pg;

// Helper: obtener IP cliente desde headers/proxy
function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.socket?.remoteAddress || "";
  return String(xff).split(",")[0].trim().replace(/^::ffff:/, "");
}

// Helper: ISO2 -> nombre legible (usa Intl, idioma 'es' pero puedes cambiar a 'en')
function iso2ToCountryName(iso2) {
  try {
    if (!iso2 || iso2.length !== 2) return null;
    const dn = new Intl.DisplayNames(["es"], { type: "region" });
    return dn.of(iso2.toUpperCase());
  } catch (e) {
    return null;
  }
}

// Helper: lookup por ip usando ipwho.is (servidor -> servidor)
async function lookupIp(ip) {
  try {
    if (!ip) return null;
    const url = `https://ipwho.is/${encodeURIComponent(ip)}`;
    const r = await fetch(url, { next: { revalidate: 0 } }); // usar fetch global
    if (!r.ok) return null;
    const j = await r.json();
    if (j && j.success !== false) {
      return {
        country: j.country || null,
        countryCode: j.country_code || null,
      };
    }
    return null;
  } catch (err) {
    console.warn("lookupIp error:", err?.message || err);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  // pool por petición (serverless-friendly)
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  let client;
  try {
    client = await pool.connect();

    // leer body
    const body = req.body || {};
    let bodyCountry = body.country ? String(body.country).trim() : null;
    if (bodyCountry && bodyCountry.toLowerCase() === "unknown") bodyCountry = null;

    // 1) intentamos leer header de país (ISO2)
    const headerIso = (req.headers["x-vercel-ip-country"] || req.headers["cf-ipcountry"] || req.headers["x-country-code"] || "").toString().trim().toUpperCase();
    let countryNameFromHeader = null;
    if (headerIso && headerIso.length === 2) {
      countryNameFromHeader = iso2ToCountryName(headerIso);
    }

    // 2) si no hay header, lookup por IP real
    let geo = null;
    let clientIp;
    if (!countryNameFromHeader && !bodyCountry) {
      clientIp = getClientIp(req);
      if (clientIp) {
        geo = await lookupIp(clientIp);
      }
    }

    // 3) decidir country final y countryCode (si tenemos)
    const finalCountry =
      bodyCountry ||
      countryNameFromHeader ||
      (geo && geo.country) ||
      "Unknown";

    const finalCountryCode =
      (headerIso && headerIso.length === 2 ? headerIso : (geo && geo.countryCode ? geo.countryCode.toUpperCase() : null)) || null;

    // 4) crear tabla si no existe (con country PRIMARY KEY)
    await client.query(`
      CREATE TABLE IF NOT EXISTS clicks (
        country VARCHAR(100) PRIMARY KEY,
        country_code VARCHAR(2),
        total_clicks BIGINT DEFAULT 0
      );
    `);

    // 5) insertar / actualizar (upsert)
    await client.query(
      `
      INSERT INTO clicks (country, country_code, total_clicks)
      VALUES ($1, $2, 1)
      ON CONFLICT (country)
      DO UPDATE SET total_clicks = clicks.total_clicks + 1,
                    country_code = COALESCE(clicks.country_code, EXCLUDED.country_code);
      `,
      [finalCountry, finalCountryCode]
    );

    // 6) devolver leaderboard actualizado (y para debug, la detección)
    const { rows } = await client.query("SELECT country, country_code, total_clicks FROM clicks ORDER BY total_clicks DESC LIMIT 100");

    res.status(200).json({
      success: true,
      detected: {
        bodyCountry: bodyCountry || null,
        headerIso: headerIso || null,
        clientIp: clientIp || null,
        geoCountry: geo?.country || null,
        geoCountryCode: geo?.countryCode || null,
        finalCountry,
        finalCountryCode
      },
      leaderboard: rows
    });
  } catch (err) {
    console.error("Error /api/click:", err);
    res.status(500).json({ success: false, error: err.message || String(err) });
  } finally {
    try { if (client) client.release(); } catch(e){}
    try { await pool.end(); } catch(e){}
  }
}
