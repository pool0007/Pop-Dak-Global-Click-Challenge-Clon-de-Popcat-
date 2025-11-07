import { pool } from "./db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { country, clicks } = req.body;
    if (!country || !clicks) {
      return res.status(400).json({ error: "Datos inválidos" });
    }

    const query = `
      INSERT INTO countries (country, clicks)
      VALUES ($1, $2)
      ON CONFLICT (country)
      DO UPDATE SET clicks = countries.clicks + EXCLUDED.clicks
      RETURNING clicks;
    `;

    const result = await pool.query(query, [country, clicks]);
    res.json({ success: true, total: result.rows[0].clicks });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}
