const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateReferralCode } = require("../utils/referralCode.cjs");

// ✅ User Registration with Referral Code
// ✅ Use referral code generator in user registration
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, mobile_number, referral_code, joinCompany } = req.body;

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
      "INSERT INTO users (username, email, password, mobile_number, referral_code, referrer_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [username, email, hashedPassword, mobile_number, newReferralCode, referrerId]
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
      const user = await pool.query("SELECT id, username, email, mobile_number, referral_code FROM users WHERE id = $1", [
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

  router.post("/addReferrer", verifyToken, async (req, res) => {
    try {
      const { referral_code } = req.body;
      const userId = req.user.user_id; // ✅ Logged-in user ID
      let referrerId = null;
  
      if (referral_code) {
        // ✅ Check if the provided referral code exists
        const referrer = await pool.query(
          "SELECT id FROM users WHERE referral_code = $1",
          [referral_code]
        );
  
        if (referrer.rows.length === 0) {
          return res.status(400).json({ error: "Invalid referral code" });
        }
  
        referrerId = referrer.rows[0].id;
  
        // ✅ Get the company user ID
        const companyUser = await pool.query(
          "SELECT id FROM users WHERE username = 'COMPANY'"
        );
        const companyUserId = companyUser.rows[0]?.id;
  
        // ✅ Restrict max 2 children for non-company users
        if (referrerId !== companyUserId) { // ✅ Only restrict non-company users
          const childCount = await pool.query(
            "SELECT COUNT(*) FROM users WHERE referrer_id = $1",
            [referrerId]
          );
  
          if (parseInt(childCount.rows[0].count) >= 2) {
            return res.status(400).json({ error: "This user has already reached the maximum of 2 referrals." });
          }
        }
      } else {
        // ✅ If no referral code, assign to the Company User
        const companyUser = await pool.query(
          "SELECT id FROM users WHERE username = 'Company'"
        );
  
        if (companyUser.rows.length === 0) {
          return res.status(400).json({ error: "Company user not found" });
        }
  
        referrerId = companyUser.rows[0].id; // ✅ Assign logged-in user to Company User
      }
  
      // ✅ Update the user's referrer_id in the database
      const updateUser = await pool.query(
        "UPDATE users SET referrer_id = $1 WHERE id = $2 RETURNING *",
        [referrerId, userId]
      );
  
      res.json(updateUser.rows[0]); // ✅ Return updated user info
    } catch (error) {
      console.error("Error adding referrer:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  

// Correctly export router
module.exports = router;  // ✅ Fix: Ensure router is exported properly
