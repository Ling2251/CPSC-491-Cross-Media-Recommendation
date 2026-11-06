require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const friendshipRoutes = require("./routes/friendshipRoutes");

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.trim().length === 0) {
  throw new Error("JWT_SECRET must be configured");
}

app.use(cors());
app.use(express.json());

// Friendship API
app.use("/api/friends", friendshipRoutes);

// Middleware to verify JWT authentication
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
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

app.get("/api/interests", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name FROM interest_tags ORDER BY name ASC"
    );

    return res.status(200).json({ interests: result.rows });
  } catch (error) {
    console.error("Error retrieving interests:", error);

    return res.status(500).json({
      message: "Could not retrieve interests"
    });
  }
});

// Week 5: Activate user after onboarding is completed
async function activateUser(userId) {
  try {
    const result = await pool.query(
      `UPDATE users
       SET account_state = 'ACTIVE'
       WHERE id = $1
         AND account_state = 'ONBOARDING_REQUIRED'
       RETURNING id, account_state`,
      [userId]
    );

    return result.rows[0] || null;

  } catch (error) {
    console.error("Error activating user:", error);
    throw error;
  }
}

 // Sprint 4: Secure friendship accept/decline operations
 async function changeFriendRequestStatus(req, res, newStatus) {
   const requestId = Number(req.params.requestId);
   const authenticatedUserId = Number(req.user.userId);

   if (!Number.isSafeInteger(requestId) || requestId <= 0) {
     return res.status(400).json({
       message: "Invalid friend request ID"
     });
   }

   try {
     // Retrieve the request from PostgreSQL
     const result = await pool.query(
       `SELECT id, requester_id, receiver_id, status
        FROM friendships
        WHERE id = $1`,
       [requestId]
     );

     if (result.rows.length === 0) {
       return res.status(404).json({
         message: "Friend request not found"
       });
     }

     const request = result.rows[0];

     // Only the intended receiver may accept or decline
     if (Number(request.receiver_id) !== authenticatedUserId) {
       return res.status(403).json({
         message: "Not authorized to modify this request"
       });
     }

     if (request.status !== "pending") {
       return res.status(409).json({
         message: "Friend request is no longer pending"
       });
     }

     // The WHERE conditions also protect against concurrent updates
     const updated = await pool.query(
       `UPDATE friendships
        SET status = $1
        WHERE id = $2
          AND receiver_id = $3
          AND status = 'pending'
        RETURNING id, requester_id, receiver_id, status`,
       [newStatus, requestId, authenticatedUserId]
     );

     if (updated.rows.length === 0) {
       return res.status(409).json({
         message: "Friend request was already changed"
       });
     }

     return res.status(200).json({
       message: `Friend request ${newStatus}`,
       friendship: updated.rows[0]
     });

   } catch (error) {
     console.error("Friendship update error:", error.message);

     return res.status(500).json({
       message: "Could not update friend request"
     });
   }
 }

 app.post(
   "/api/friendships/:requestId/accept",
   authenticateToken,
   (req, res) => changeFriendRequestStatus(req, res, "accepted")
 );

 app.post(
   "/api/friendships/:requestId/decline",
   authenticateToken,
   (req, res) => changeFriendRequestStatus(req, res, "declined")
 );

app.get("/api/privacy", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT user_id, activity_private, updated_at
       FROM privacy_settings
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Privacy settings not found"
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Privacy settings error:", error.message);
    res.status(500).json({
      message: "Could not load privacy settings"
    });
  }
});

app.put("/api/privacy", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { activityPrivate } = req.body;

    if (typeof activityPrivate !== "boolean") {
      return res.status(400).json({
        message: "activityPrivate must be a boolean"
      });
    }

    const result = await pool.query(
      `INSERT INTO privacy_settings
         (user_id, activity_private)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET
         activity_private = EXCLUDED.activity_private,
         updated_at = NOW()
       RETURNING user_id, activity_private, updated_at`,
      [userId, activityPrivate]
    );

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Privacy update error:", error.message);
    res.status(500).json({
      message: "Could not update privacy settings"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})