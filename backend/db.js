const { Pool } = require("pg");
require("dotenv").config();

const connectionConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST || "localhost",
      port: Number(process.env.PGPORT) || 5432,
      user: process.env.PGUSER || "postgres",
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE || "cross_media_recommendation",
    };

const pool = new Pool(connectionConfig);

module.exports = pool;