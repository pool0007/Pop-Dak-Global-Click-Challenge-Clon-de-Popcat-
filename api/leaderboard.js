import { pool } from "./db.js";

export default async function handler(req, res) {
  try {
    const result = await pool.query(`
      SELECT country, clicks FROM countries
      ORDER BY clicks DESC
      LIMIT 50;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener leaderboard" });
  }
}
