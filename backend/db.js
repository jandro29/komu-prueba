import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

export const db = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASS || "admin",
  database: process.env.DB_NAME || "catalogo_komu",
  port: process.env.DB_PORT || 5432,
});