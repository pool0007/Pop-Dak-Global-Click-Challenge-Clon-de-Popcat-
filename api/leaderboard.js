import pg from "pg";

export default async function handler(req, res) {
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const result = await pool.query(
      "SELECT country, total_clicks FROM clicks ORDER BY total_clicks DESC"
    );
    res.status(200).json({
      success: true,
      leaderboard: result.rows,
    });
  } catch (err) {
    console.error("❌ Error al obtener leaderboard:", err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    await pool.end();
  }
}
