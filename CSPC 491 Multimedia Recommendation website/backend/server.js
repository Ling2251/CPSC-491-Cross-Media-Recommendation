require("dotenv").config()

const express = require("express")
const cors = require("cors")
const pool = require("./db")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const app = express()
const PORT = 3001
const JWT_SECRET = process.env.JWT_SECRET

app.use(cors())
app.use(express.json())

// Middleware to verify JWT authentication
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      message: "Authentication required"
    });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"]
    });

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}

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
      `SELECT id, name, email, password_hash, account_state
       FROM users
       WHERE email = $1`,
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
        userId: user.id
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

// Logout endpoint
app.post("/api/auth/logout", authenticateToken, (req, res) => {
  return res.status(200).json({
    message: "Logout successful. Remove your token from the client."
  });
});

// Protected user profile endpoint
app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, account_state, created_at
       FROM users
       WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    return res.status(200).json({
      message: "Profile retrieved successfully",
      user: result.rows[0]
    });

  } catch (error) {
    console.error("Profile error:", error);

    return res.status(500).json({
      message: "Could not retrieve profile"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})