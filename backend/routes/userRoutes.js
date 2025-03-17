const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateReferralCode } = require("../utils/referralCode.cjs");

// ✅ Use referral code generator in user registration
router.post("/register", async (req, res) => {
  try {
      const { username, email, password, mobile_number } = req.body;

      const userExists = await pool.query(
          "SELECT * FROM users WHERE email = $1 OR mobile_number = $2",
          [email, mobile_number]
      );

      if (userExists.rows.length > 0) {
          return res.status(400).json({ error: "User already exists" });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      let referralCode;
      let isUnique = false;
      while (!isUnique) {
          referralCode = generateReferralCode();
          const existingCode = await pool.query(
              "SELECT referral_code FROM users WHERE referral_code = $1",
              [referralCode]
          );
          if (existingCode.rows.length === 0) isUnique = true;
      }

      const newUser = await pool.query(
          "INSERT INTO users (username, email, password, mobile_number, referral_code) VALUES ($1, $2, $3, $4, $5) RETURNING *",
          [username, email, hashedPassword, mobile_number, referralCode]
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

        console.log(req.body)
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

// Correctly export router
module.exports = router;  // ✅ Fix: Ensure router is exported properly
