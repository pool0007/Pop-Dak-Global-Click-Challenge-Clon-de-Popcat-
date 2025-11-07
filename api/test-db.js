import pg from "pg";

export default async function handler(req, res) {
  const { Pool } = pg;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✅ Conectado a Neon:", result.rows[0]);
    res.status(200).json({
      success: true,
      message: "Conectado a Neon correctamente",
      result: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error al conectar con Neon:", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  } finally {
    await pool.end();
  }
}
