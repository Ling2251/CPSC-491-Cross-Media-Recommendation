const { Pool } = require('pg');

function createPool(overrides = {}) {
  return new Pool({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || undefined,
    database: process.env.PGDATABASE || 'cross_media_recommendation',
    ...overrides,
  });
}

module.exports = { createPool };
