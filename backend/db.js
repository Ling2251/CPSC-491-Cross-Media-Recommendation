const { Pool } = require("pg")
require("dotenv").config();

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "media_recommendation",
})

module.exports = pool