const { Pool } = require("pg");

const databaseUrl = process.env.DATABASE_URL;

const pool = new Pool(
  databaseUrl
    ? { connectionString: databaseUrl }   // ✅ docker-compose provides this
    : {
        host: process.env.PG_HOST || "localhost",
        port: Number(process.env.PG_PORT || 5432),
        database: process.env.PG_DATABASE,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
      }
);

module.exports = pool;