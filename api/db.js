import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Crear tabla al iniciar
(async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS countries (
      country TEXT PRIMARY KEY,
      clicks BIGINT DEFAULT 0
    );
  `;
  await pool.query(query);
})();
