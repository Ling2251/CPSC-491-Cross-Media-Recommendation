const express = require("express")
const cors = require("cors")
const pool = require("./db")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const JWT_SECRET = "development_secret"

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

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required"
      })
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    )

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        message: "An account with that email already exists"
      })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, account_state, created_at`,
      [name, email, passwordHash]
    )

    res.status(201).json({
      message: "Account created successfully",
      user: result.rows[0]
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: "Could not create account"
    })
  }
})

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      })
    }

    const result = await pool.query(
      "SELECT id, name, email, password_hash, account_state FROM users WHERE email = $1",
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password"
      })
    }

    const user = result.rows[0]

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    )

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password"
      })
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email
      },
      JWT_SECRET,
      {
        expiresIn: "1h"
      }
    )

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        account_state: user.account_state
      }
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: "Could not log in"
    })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})