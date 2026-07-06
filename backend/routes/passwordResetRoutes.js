const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const pool = require("../db"); // adjust path if your pool file name differs
const nodemailer = require("nodemailer");

require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function genOtp() {
  // 6-digit OTP
  return String(Math.floor(100000 + Math.random() * 900000));
}

// 1) Send OTP
router.post("/forgot-password", async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "email is required" });
  
    const client = await pool.connect();
    try {
      // ✅ 0) Check user exists FIRST
      const userCheck = await client.query(
        `SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`,
        [email]
      );
  
      if (!userCheck.rows.length) {
        return res.status(404).json({
          error: "No account found for this email. Please create an account to continue.",
        });
      }
  
      // ✅ 1) generate otp + hash
      const otp = genOtp();
      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  
      // ✅ 2) invalidate previous unused OTPs for this email
      await client.query(
        `UPDATE password_reset_otps
            SET used = TRUE
          WHERE email = $1 AND used = FALSE`,
        [email]
      );
  
      // ✅ 3) insert new OTP record
      await client.query(
        `INSERT INTO password_reset_otps (email, otp_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [email, otpHash, expiresAt]
      );
  
      // ✅ 4) Send email
      await transporter.sendMail({
        from: `"Sai Suryaa Jewellers" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your password reset OTP",
        text: `Your OTP is ${otp}. It is valid for ${OTP_TTL_MINUTES} minutes.`,
      });
  
      return res.json({ ok: true, message: "OTP sent successfully." });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    } finally {
      client.release();
    }
  });
  

// 2) Verify OTP (just checks)
router.post("/verify-otp", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const otp = String(req.body.otp || "").trim();

  if (!email || !otp) return res.status(400).json({ error: "email and otp are required" });

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, otp_hash, expires_at, used, attempts
         FROM password_reset_otps
        WHERE email = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [email]
    );

    if (!rows.length) return res.status(400).json({ error: "Invalid OTP" });

    const rec = rows[0];
    if (rec.used) return res.status(400).json({ error: "OTP already used" });
    if (new Date(rec.expires_at) < new Date()) return res.status(400).json({ error: "OTP expired" });
    if (rec.attempts >= MAX_ATTEMPTS) return res.status(400).json({ error: "Too many attempts" });

    const ok = await bcrypt.compare(otp, rec.otp_hash);

    await client.query(
      `UPDATE password_reset_otps
          SET attempts = attempts + 1
        WHERE id = $1`,
      [rec.id]
    );

    if (!ok) return res.status(400).json({ error: "Invalid OTP" });

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// 3) Reset password (verify OTP + update users table)
router.post("/reset-password", async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();
    const newPassword = String(req.body.newPassword || "");
  
    if (!email || !otp || newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "email, otp, newPassword(>=6) required" });
    }
  
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
  
      // ✅ 0) Ensure user exists
      const userCheck = await client.query(
        `SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`,
        [email]
      );
  
      if (!userCheck.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          error: "No account found for this email. Please create an account to continue.",
        });
      }
  
      // ✅ 1) get latest OTP
      const { rows } = await client.query(
        `SELECT id, otp_hash, expires_at, used, attempts
           FROM password_reset_otps
          WHERE email = $1
          ORDER BY created_at DESC
          LIMIT 1
          FOR UPDATE`,
        [email]
      );
  
      if (!rows.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Invalid OTP" });
      }
  
      const rec = rows[0];
  
      if (rec.used) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "OTP already used" });
      }
  
      if (new Date(rec.expires_at) < new Date()) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "OTP expired" });
      }
  
      if (rec.attempts >= MAX_ATTEMPTS) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Too many attempts" });
      }
  
      // ✅ 2) verify OTP (and increment attempts)
      const ok = await bcrypt.compare(otp, rec.otp_hash);
  
      await client.query(
        `UPDATE password_reset_otps SET attempts = attempts + 1 WHERE id = $1`,
        [rec.id]
      );
  
      if (!ok) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Invalid OTP" });
      }
  
      // ✅ 3) update password
      const passwordHash = await bcrypt.hash(newPassword, 10);
  
      const upd = await client.query(
        `UPDATE users
            SET password = $1
          WHERE LOWER(email) = $2
          RETURNING id`,
        [passwordHash, email]
      );
  
      if (upd.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          error: "No account found for this email. Please create an account to continue.",
        });
      }
  
      // ✅ 4) mark OTP used only after success
      await client.query(
        `UPDATE password_reset_otps SET used = TRUE WHERE id = $1`,
        [rec.id]
      );
  
      await client.query("COMMIT");
      return res.json({ ok: true });
    } catch (e) {
      await client.query("ROLLBACK");
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    } finally {
      client.release();
    }
  });
  

module.exports = router;
