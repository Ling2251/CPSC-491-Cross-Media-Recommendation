const express = require("express")
const cors = require("cors")
const pool = require("./db")

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.get("/api/test", (req, res) => {
  res.json({
    message: "Backend is working!"
  })
})

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()")

    res.json({
      message: "Database is working!",
      time: result.rows[0].now
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: "Database connection failed"
    })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})