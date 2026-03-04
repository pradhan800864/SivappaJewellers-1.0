const path = require("path");
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
}

const env = (k, fallback) => {
  const v = process.env[k];
  return (typeof v === "string" && v.trim() !== "") ? v : fallback;
};

const databaseUrl = env("DATABASE_URL", "");

const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : new Pool({
      host: env("PG_HOST", env("DB_HOST", "localhost")),
      port: Number(env("PG_PORT", env("DB_PORT", "5432"))),
      database: env("PG_DATABASE", env("DB_NAME", "")),
      user: env("PG_USER", env("DB_USER", "")),
      password: env("PG_PASSWORD", env("DB_PASSWORD", "")),
    });

module.exports = pool;