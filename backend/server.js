
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const friendshipRoutes = require("./routes/friendshipRoutes");
const mediaRoutes = require("./routes/mediaRoutes");
const activityRoutes = require("./routes/activityRoutes");
const mediaInteractionRoutes = require("./routes/mediaInteractionRoutes");
const mediaReviewRoutes = require("./routes/mediaReviewRoutes");
const activityFeedRoutes = require("./routes/activityFeedRoutes");
const activityPrivacyRoutes = require("./routes/activityPrivacyRoutes");
const mediaForumRoutes = require("./routes/mediaForumRoutes");

const app = express()
const PORT = 3001
const JWT_SECRET = process.env.JWT_SECRET

// ==========================================
// ENVIRONMENT VALIDATION
// ==========================================

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    "JWT_SECRET must be configured with at least 32 characters."
  );
}

// ==========================================
// EXPRESS MIDDLEWARE
// ==========================================

app.use(cors());
app.use(express.json());

// ==========================================
// APPLICATION API ROUTES
// ==========================================

// Friendship Management
app.use("/api/friends", friendshipRoutes);

// Media catalog API
app.use("/api/media", mediaRoutes);

// Activity Tracking
app.use("/api/activities", activityRoutes);

// Media Interactions
app.use("/api/media-interactions", mediaInteractionRoutes);

// Activity Privacy
app.use("/api/privacy", activityPrivacyRoutes);

// Friends Activity Feed
app.use("/api/feed", activityFeedRoutes);

// Media Reviews
app.use("/api/reviews", mediaReviewRoutes);

// Media Discussion Forums
app.use("/api/forums", mediaForumRoutes);

// ==========================================
// JWT AUTHENTICATION MIDDLEWARE
// ==========================================

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  const token =
    typeof authHeader === "string" &&
    authHeader.startsWith("Bearer ")
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

    return next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}

// ==========================================
// BACKEND CONNECTION TEST
// ==========================================

app.get("/api/test", (req, res) => {
  return res.status(200).json({
    message: "Backend is working!",
  });
});

// ==========================================
// ACCOUNT REGISTRATION
// POST /api/auth/signup
// ==========================================

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
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        message: "An account with that email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, account_state, created_at
      `,
      [name, email, passwordHash]
    );

    return res.status(201).json({
      message: "Account created successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Signup error:", error);

    return res.status(500).json({
      message: "Could not create account",
    });
  }
});

// ==========================================
// USER LOGIN
// POST /api/auth/login
// ==========================================

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        password_hash,
        account_state
      FROM users
      WHERE email = $1
      `,
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
      },
      JWT_SECRET,
      {
        algorithm: "HS256",
        expiresIn: "1h",
      }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        account_state: user.account_state,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Could not log in",
    });
  }
});

// ==========================================
// SESSION RESTORATION
// GET /api/auth/me
// ==========================================

app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0 ||
      userId > 2147483647
    ) {
      return res.status(401).json({
        message: "Invalid authentication identity",
      });
    }

    const result = await pool.query(
      `
      SELECT id, name, email, account_state
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "User no longer exists",
      });
    }

    return res.status(200).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Session verification error:", error);

    return res.status(500).json({
      message: "Failed to verify session",
    });
  }
});

// ==========================================
// LOGOUT
// POST /api/auth/logout
// ==========================================

app.post("/api/auth/logout", authenticateToken, (req, res) => {
  return res.status(200).json({
    message: "Logout successful. Remove your token from the client.",
  });
});

// ==========================================
// AUTHENTICATED USER PROFILE
// GET /api/profile
// ==========================================

app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        account_state,
        created_at
      FROM users
      WHERE id = $1
      `,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Profile retrieved successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Profile error:", error);

    return res.status(500).json({
      message: "Could not retrieve profile",
    });
  }
});

// ==========================================
// INTEREST TAGS
// GET /api/interests
// ==========================================

app.get("/api/interests", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, name
      FROM interest_tags
      ORDER BY name ASC
      `
    );

    return res.status(200).json({
      interests: result.rows,
    });
  } catch (error) {
    console.error("Error retrieving interests:", error);

    return res.status(500).json({
      message: "Could not retrieve interests",
    });
  }
});

// ==========================================
// ONBOARDING ACCOUNT ACTIVATION
// ==========================================

async function activateUser(userId) {
  try {
    const result = await pool.query(
      `
      UPDATE users
      SET account_state = 'ACTIVE'
      WHERE id = $1
        AND account_state = 'ONBOARDING_REQUIRED'
      RETURNING id, account_state
      `,
      [userId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error("Error activating user:", error);
    throw error;
  }
}

// ==========================================
// START EXPRESS SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});