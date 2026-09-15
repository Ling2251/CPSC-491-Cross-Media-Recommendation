const express = require("express")
const cors = require("cors")
const pool = require("./db")

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

//test if backend is connected to frontend
app.get("/api/test", (req, res) => {
  res.json({
    message: "Backend is working!"
  })
})

//tests if able to connect to db
/*app.get("/api/db-test", async (req, res) => {
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
}) */

//Tests database readings 
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, account_state, created_at FROM users"
    )

    res.json(result.rows)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: "Could not retrieve users"
    })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})