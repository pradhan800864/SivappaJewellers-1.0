const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateReferralCode } = require("../utils/referralCode.js");

let referralRequestsTableReady = null;

const createReferralRequestError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  err.exposeMessage = message;
  return err;
};

const ensureReferralRequestsTable = () => {
  if (!referralRequestsTableReady) {
    referralRequestsTableReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS referral_requests (
          id BIGSERIAL PRIMARY KEY,
          child_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          requested_parent_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          request_source TEXT NOT NULL DEFAULT 'referral_code',
          referral_code_entered TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          reviewed_at TIMESTAMPTZ,
          reviewed_by INT,
          reviewer_role TEXT
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_referral_requests_status_created_at
        ON referral_requests (status, created_at DESC)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_referral_requests_child_status
        ON referral_requests (child_user_id, status, created_at DESC)
      `);
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uniq_referral_requests_pending_child
        ON referral_requests (child_user_id)
        WHERE status = 'pending'
      `);
    })().catch((err) => {
      referralRequestsTableReady = null;
      throw err;
    });
  }

  return referralRequestsTableReady;
};

const findCompanyUser = async (client) => {
  const companyRes = await client.query(
    `SELECT id, username, email, mobile_number, referral_code
       FROM users
      WHERE LOWER(TRIM(username)) = 'company'
         OR LOWER(TRIM(email)) = 'company@gmail.com'
         OR referral_code = 'COMPANY-001'
      ORDER BY id ASC
      LIMIT 1`
  );

  return companyRes.rows[0] || null;
};

const fetchPendingReferralRequest = async (client, userId) => {
  const { rows } = await client.query(
    `SELECT
       rr.id,
       rr.child_user_id,
       rr.requested_parent_user_id,
       rr.request_source,
       rr.referral_code_entered,
       rr.status,
       rr.created_at,
       rr.updated_at,
       parent.username AS requested_parent_username,
       parent.email AS requested_parent_email,
       parent.mobile_number AS requested_parent_mobile_number,
       parent.referral_code AS requested_parent_referral_code
     FROM referral_requests rr
     JOIN users parent ON parent.id = rr.requested_parent_user_id
     WHERE rr.child_user_id = $1
       AND rr.status = 'pending'
     ORDER BY rr.created_at DESC, rr.id DESC
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
};

// ✅ User Registration with Referral Code
// ✅ Use referral code generator in user registration
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, mobile_number, referral_code, address, state, joinCompany } = req.body;

    // ✅ Check if the user already exists
    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR mobile_number = $2",
      [email, mobile_number]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    // ✅ Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ✅ Default referrer_id (If user selects "Join Company")
    let referrerId = null;

    if (joinCompany) {
      referrerId = 1; // ✅ Assign Company User (ID: 1) as parent
    } else if (referral_code) {
      const referrer = await pool.query(
        "SELECT id FROM users WHERE referral_code = $1",
        [referral_code]
      );

      if (referrer.rows.length === 0) {
        return res.status(400).json({ error: "Invalid referral code" });
      }

      referrerId = referrer.rows[0].id;

      // ✅ Get company user ID (to exclude from the child limit check)
      const companyUser = await pool.query(
        "SELECT id FROM users WHERE username = 'COMPANY'"
      );
      const companyUserId = companyUser.rows[0]?.id;

      // ✅ Check if referrer has already 2 children (except Company)
      if (referrerId !== companyUserId) {
        const childCount = await pool.query(
          "SELECT COUNT(*) FROM users WHERE referrer_id = $1",
          [referrerId]
        );

        if (parseInt(childCount.rows[0].count) >= 2) {
          return res.status(400).json({ error: "This user has already reached the maximum of 2 referrals." });
        }
      }
    }

    // ✅ Generate a unique referral code
    let newReferralCode;
    let isUnique = false;
    while (!isUnique) {
      newReferralCode = generateReferralCode();
      const existingCode = await pool.query(
        "SELECT referral_code FROM users WHERE referral_code = $1",
        [newReferralCode]
      );
      if (existingCode.rows.length === 0) isUnique = true;
    }

    // ✅ Insert new user into the database
    const newUser = await pool.query(
      "INSERT INTO users (username, email, password, mobile_number, referral_code, address, state, referrer_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [username, email, hashedPassword, mobile_number, newReferralCode, address, state, referrerId]
    );

    res.status(201).json({
      message: "User registered successfully",
      user: newUser.rows[0],
    });

  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// Login User
router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Check if user exists
      const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  
      if (user.rows.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
  
      // Compare password
      const isValid = await bcrypt.compare(password, user.rows[0].password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
  
      // Generate JWT token
      const token = jwt.sign({ user_id: user.rows[0].id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
  
      res.json({ message: "Login successful", token, user: user.rows[0] });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  });

  // Middleware to verify token
  const verifyToken = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ error: "Access denied" });
  
    try {
      const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
      req.user = decoded; // Store user ID in request
      next();
    } catch (err) {
      res.status(400).json({ error: "Invalid token" });
    }
  };
  
  // ✅ Fetch logged-in user details
  router.get("/me", verifyToken, async (req, res) => {
    try {
      const user = await pool.query("SELECT id, username, email, mobile_number, referral_code, wallet FROM users WHERE id = $1", [
        req.user.user_id,
      ]);
  
      if (user.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
  
      res.json(user.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  });


  router.put("/update", verifyToken, async (req, res) => {
    try {
      const { id, username, email, mobile_number } = req.body; // ✅ Get ID from frontend
  
      // Ensure the user is updating their own profile
      if (id !== req.user.user_id) {
        return res.status(403).json({ error: "Unauthorized action" });
      }
  
      const updatedUser = await pool.query(
        "UPDATE users SET username = $1, email = $2, mobile_number = $3 WHERE id = $4 RETURNING *",
        [username, email, mobile_number, id] // ✅ Send ID as the 4th parameter
      );
  
      if (updatedUser.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
  
      res.json(updatedUser.rows[0]); // Send updated user info
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ✅ Get List of Children (Users Referred by Logged-in User)
  router.get("/children", verifyToken, async (req, res) => {
    try {
      const userId = req.user.user_id; // Get logged-in user ID from JWT

      // ✅ Fetch users who have this user as their referrer
      const children = await pool.query(
        "SELECT id, username, email, mobile_number, referral_code FROM users WHERE referrer_id = $1",
        [userId]
      );

      res.json(children.rows);
    } catch (err) {
      console.error("❌ Error fetching children:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ✅ Get the logged-in user's referrer (parent)
  router.get("/referrer", verifyToken, async (req, res) => {
    try {
      const referrer = await pool.query(
        "SELECT id, username, email, mobile_number, referral_code FROM users WHERE id = (SELECT referrer_id FROM users WHERE id = $1)",
        [req.user.user_id]
      );

      if (referrer.rows.length === 0) {
        return res.status(404).json({ error: "No referrer found" });
      }

      res.json(referrer.rows[0]);
    } catch (error) {
      console.error("Error fetching referrer:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.get("/referrer-request", verifyToken, async (req, res) => {
    try {
      await ensureReferralRequestsTable();
      const request = await fetchPendingReferralRequest(pool, req.user.user_id);
      res.json({ request: request || null });
    } catch (error) {
      console.error("Error fetching referral request:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/addReferrer", verifyToken, async (req, res) => {
    const userId = req.user.user_id;
    const referralCode = String(req.body?.referral_code || "").trim();
    const client = await pool.connect();

    try {
      await ensureReferralRequestsTable();
      await client.query("BEGIN");

      const childRes = await client.query(
        `SELECT id, username, referrer_id
           FROM users
          WHERE id = $1
          FOR UPDATE`,
        [userId]
      );

      if (!childRes.rowCount) {
        throw createReferralRequestError(404, "User not found");
      }

      const child = childRes.rows[0];
      if (child.referrer_id) {
        throw createReferralRequestError(400, "Referrer is already assigned to your account");
      }

      const billedRes = await client.query(
        `SELECT 1
           FROM order_history
          WHERE user_id = $1
          LIMIT 1`,
        [userId]
      );

      if (!billedRes.rowCount) {
        throw createReferralRequestError(
          400,
          "Referral requests will be available after your first billed invoice"
        );
      }

      let parent = null;
      let requestSource = "join_company";

      if (referralCode) {
        const referrerRes = await client.query(
          `SELECT id, username, email, mobile_number, referral_code
             FROM users
            WHERE LOWER(referral_code) = LOWER($1)
            LIMIT 1`,
          [referralCode]
        );

        if (!referrerRes.rowCount) {
          throw createReferralRequestError(400, "Invalid referral code");
        }

        parent = referrerRes.rows[0];
        requestSource = "referral_code";
      } else {
        parent = await findCompanyUser(client);
        if (!parent) {
          throw createReferralRequestError(400, "Company user not found");
        }
      }

      if (Number(parent.id) === Number(userId)) {
        throw createReferralRequestError(400, "You cannot add yourself as your own referrer");
      }

      const pendingRes = await client.query(
        `SELECT id
           FROM referral_requests
          WHERE child_user_id = $1
            AND status = 'pending'
          ORDER BY created_at DESC, id DESC
          LIMIT 1
          FOR UPDATE`,
        [userId]
      );

      if (pendingRes.rowCount) {
        await client.query(
          `UPDATE referral_requests
              SET requested_parent_user_id = $2,
                  request_source = $3,
                  referral_code_entered = $4,
                  updated_at = NOW()
            WHERE id = $1`,
          [
            pendingRes.rows[0].id,
            Number(parent.id),
            requestSource,
            referralCode || null,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO referral_requests (
             child_user_id,
             requested_parent_user_id,
             request_source,
             referral_code_entered,
             status
           ) VALUES ($1, $2, $3, $4, 'pending')`,
          [userId, Number(parent.id), requestSource, referralCode || null]
        );
      }

      const request = await fetchPendingReferralRequest(client, userId);

      await client.query("COMMIT");
      res.json({
        success: true,
        message: "Approval has been sent to Admin for approval.",
        request,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error adding referrer:", error);
      res
        .status(error.status || 500)
        .json({ error: error.exposeMessage || "Server error" });
    } finally {
      client.release();
    }
  });
  

// Correctly export router
module.exports = router;  // ✅ Fix: Ensure router is exported properly
