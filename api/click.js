import pg from "pg";

export default async function handler(req, res) {
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Método no permitido" });
    return;
  }

  const { country } = req.body;

  if (!country) {
    res.status(400).json({ success: false, error: "Falta el país" });
    return;
  }

  try {
    // Sumar 1 click para ese país
    await pool.query(
      `
      INSERT INTO clicks (country, total_clicks)
      VALUES ($1, 1)
      ON CONFLICT (country)
      DO UPDATE SET total_clicks = clicks.total_clicks + 1
      `,
      [country]
    );

    const result = await pool.query(
      "SELECT country, total_clicks FROM clicks ORDER BY total_clicks DESC"
    );

    res.status(200).json({
      success: true,
      leaderboard: result.rows,
    });
  } catch (err) {
    console.error("❌ Error al sumar click:", err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    await pool.end();
  }
}

