const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateReferralCode } = require("../utils/referralCode.js");
const https = require("https");

let referralRequestsTableReady = null;
let customerLoginOtpsTableReady = null;
const LOGIN_OTP_TTL_MINUTES = 5;
const LOGIN_OTP_MAX_ATTEMPTS = 5;
const LOGIN_OTP_RESEND_COOLDOWN_SECONDS = Math.max(
  Number(process.env.LOGIN_OTP_RESEND_COOLDOWN_SECONDS) || 60,
  1
);
const TWOFACTOR_BASE_URL = "https://2factor.in/API/V1";
const isDevAuthBypassEnabled = () =>
  process.env.NODE_ENV !== "production" &&
  String(process.env.DEV_AUTH_BYPASS_ENABLED || "").toLowerCase() === "true";

const createReferralRequestError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  err.exposeMessage = message;
  return err;
};

const normalizeMobileNumber = (value) => String(value || "").replace(/\D/g, "");

const maskMobileNumber = (mobileNumber) => {
  const clean = normalizeMobileNumber(mobileNumber);
  if (clean.length <= 4) return clean;
  return `${"*".repeat(Math.max(clean.length - 4, 0))}${clean.slice(-4)}`;
};

const formatTwoFactorMobileNumber = (mobileNumber) => {
  const raw = String(mobileNumber || "").trim();
  const clean = normalizeMobileNumber(raw);
  const defaultCountryCode = normalizeMobileNumber(process.env.DEFAULT_SMS_COUNTRY_CODE || "91");

  if (clean.length === 10 && defaultCountryCode) return `${defaultCountryCode}${clean}`;

  return clean;
};

const ensureCustomerLoginOtpsTable = () => {
  if (!customerLoginOtpsTableReady) {
    customerLoginOtpsTableReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS customer_login_otps (
          id BIGSERIAL PRIMARY KEY,
          user_id INT REFERENCES users(id) ON DELETE CASCADE,
          mobile_number TEXT NOT NULL,
          provider_session_id TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used BOOLEAN NOT NULL DEFAULT FALSE,
          attempts INT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`
        ALTER TABLE customer_login_otps
          ALTER COLUMN user_id DROP NOT NULL,
          ADD COLUMN IF NOT EXISTS provider_session_id TEXT,
          ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          ADD COLUMN IF NOT EXISTS used BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      `);
      await pool.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
              FROM information_schema.columns
             WHERE table_name = 'customer_login_otps'
               AND column_name = 'otp_hash'
          ) THEN
            ALTER TABLE customer_login_otps ALTER COLUMN otp_hash DROP NOT NULL;
          END IF;
        END $$;
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_customer_login_otps_user_created_at
        ON customer_login_otps (user_id, created_at DESC)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_customer_login_otps_mobile_created_at
        ON customer_login_otps (mobile_number, created_at DESC)
      `);
    })().catch((err) => {
      customerLoginOtpsTableReady = null;
      throw err;
    });
  }

  return customerLoginOtpsTableReady;
};

const findUserByMobileNumber = async (client, mobileNumber) => {
  const cleanMobile = normalizeMobileNumber(mobileNumber);
  if (cleanMobile.length < 10) return null;
  const lastTenDigits = cleanMobile.slice(-10);

  const { rows } = await client.query(
    `SELECT *
       FROM users
      WHERE regexp_replace(COALESCE(mobile_number, ''), '[^0-9]', '', 'g') = $1
         OR (
           $2::text <> ''
           AND right(regexp_replace(COALESCE(mobile_number, ''), '[^0-9]', '', 'g'), 10) = $2
         )
      LIMIT 1`,
    [cleanMobile, lastTenDigits.length === 10 ? lastTenDigits : ""]
  );

  return rows[0] || null;
};

const generateUniqueReferralCodeForClient = async (client) => {
  let newReferralCode;
  let isUnique = false;

  while (!isUnique) {
    newReferralCode = generateReferralCode();
    const existingCode = await client.query(
      "SELECT referral_code FROM users WHERE referral_code = $1",
      [newReferralCode]
    );
    if (existingCode.rows.length === 0) isUnique = true;
  }

  return newReferralCode;
};

const createOtpOnlyUser = async (client, mobileNumber) => {
  const cleanMobile = normalizeMobileNumber(mobileNumber);
  const timestamp = Date.now();
  const referralCode = await generateUniqueReferralCodeForClient(client);
  const placeholderPassword = await bcrypt.hash(`otp-login-${timestamp}-${cleanMobile}`, 10);
  const username = `Customer-${cleanMobile.slice(-4)}-${timestamp}`;
  const email = `customer-${cleanMobile}-${timestamp}@otp.local`;

  const { rows } = await client.query(
    `INSERT INTO users (username, email, password, mobile_number, referral_code, address, state, referrer_id)
     VALUES ($1, $2, $3, $4, $5, '', '', NULL)
     RETURNING *`,
    [username, email, placeholderPassword, cleanMobile, referralCode]
  );

  return rows[0] || null;
};

const getJson = (urlString, options = {}) =>
  new Promise((resolve, reject) => {
    const allowedErrorStatuses = new Set(options.allowedErrorStatuses || []);
    const url = new URL(urlString);
    const req = https.request(
      {
        method: "GET",
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        port: url.port || 443,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = data ? JSON.parse(data) : null;
          } catch (error) {
            reject(new Error(`Invalid JSON response from 2Factor: ${data}`));
            return;
          }

          if (
            (res.statusCode >= 200 && res.statusCode < 300) ||
            allowedErrorStatuses.has(res.statusCode)
          ) {
            resolve(parsed);
          } else {
            reject(new Error(`2Factor failed with status ${res.statusCode}: ${data}`));
          }
        });
      }
    );

    req.on("error", reject);
    req.end();
  });

const getTwoFactorApiKey = () => String(process.env.TWOFACTOR_API_KEY || "").trim();

const sendLoginOtpSms = async (mobileNumber) => {
  const apiKey = getTwoFactorApiKey();
  if (!apiKey) {
    throw new Error("TWOFACTOR_API_KEY is not configured");
  }

  const formattedMobile = formatTwoFactorMobileNumber(mobileNumber);
  if (!formattedMobile) {
    throw new Error("Valid mobile number is required");
  }

  const url = `${TWOFACTOR_BASE_URL}/${encodeURIComponent(apiKey)}/SMS/${encodeURIComponent(formattedMobile)}/AUTOGEN`;
  const result = await getJson(url);

  if (String(result?.Status || "").toLowerCase() !== "success" || !result?.Details) {
    throw new Error(result?.Details || "Failed to send OTP through 2Factor");
  }

  return {
    sessionId: String(result.Details),
    providerResponse: result,
  };
};

const verifyLoginOtpWithProvider = async (sessionId, otp) => {
  const apiKey = getTwoFactorApiKey();
  if (!apiKey) {
    throw new Error("TWOFACTOR_API_KEY is not configured");
  }

  const url = `${TWOFACTOR_BASE_URL}/${encodeURIComponent(apiKey)}/SMS/VERIFY/${encodeURIComponent(sessionId)}/${encodeURIComponent(otp)}`;
  const result = await getJson(url, { allowedErrorStatuses: [400] });

  return {
    verified: String(result?.Status || "").toLowerCase() === "success",
    providerResponse: result,
  };
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
        ALTER TABLE referral_requests
          ADD COLUMN IF NOT EXISTS request_source TEXT NOT NULL DEFAULT 'referral_code',
          ADD COLUMN IF NOT EXISTS referral_code_entered TEXT,
          ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
          ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS reviewed_by INT,
          ADD COLUMN IF NOT EXISTS reviewer_role TEXT
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

const resolveRequestedReferralParent = async (client, referralCode) => {
  const cleanReferralCode = String(referralCode || "").trim();

  if (cleanReferralCode) {
    const referrerRes = await client.query(
      `SELECT id, username, email, mobile_number, referral_code
         FROM users
        WHERE LOWER(referral_code) = LOWER($1)
        LIMIT 1`,
      [cleanReferralCode]
    );

    if (!referrerRes.rowCount) {
      throw createReferralRequestError(400, "Invalid referral code");
    }

    return {
      parent: referrerRes.rows[0],
      requestSource: "referral_code",
      referralCodeEntered: cleanReferralCode,
    };
  }

  const company = await findCompanyUser(client);
  if (!company) {
    throw createReferralRequestError(400, "Company user not found");
  }

  return {
    parent: company,
    requestSource: "join_company",
    referralCodeEntered: null,
  };
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
  const client = await pool.connect();
  try {
    const { username, email, password, mobile_number, referral_code, address, state, joinCompany } = req.body;
    const requestedReferralCode = joinCompany ? null : referral_code;

    await ensureReferralRequestsTable();
    await client.query("BEGIN");

    // ✅ Check if the user already exists
    const userExists = await client.query(
      "SELECT * FROM users WHERE email = $1 OR mobile_number = $2",
      [email, mobile_number]
    );

    if (userExists.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "User already exists" });
    }

    // ✅ Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const referralRequest = await resolveRequestedReferralParent(client, requestedReferralCode);

    // ✅ Generate a unique referral code
    let newReferralCode;
    let isUnique = false;
    while (!isUnique) {
      newReferralCode = generateReferralCode();
      const existingCode = await client.query(
        "SELECT referral_code FROM users WHERE referral_code = $1",
        [newReferralCode]
      );
      if (existingCode.rows.length === 0) isUnique = true;
    }

    // ✅ Insert new user into the database
    const newUser = await client.query(
      "INSERT INTO users (username, email, password, mobile_number, referral_code, address, state, referrer_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [username, email, hashedPassword, mobile_number, newReferralCode, address, state, null]
    );

    await client.query(
      `INSERT INTO referral_requests (
         child_user_id,
         requested_parent_user_id,
         request_source,
         referral_code_entered,
         status
       ) VALUES ($1, $2, $3, $4, 'pending')`,
      [
        Number(newUser.rows[0].id),
        Number(referralRequest.parent.id),
        referralRequest.requestSource,
        referralRequest.referralCodeEntered,
      ]
    );

    const pendingRequest = await fetchPendingReferralRequest(client, newUser.rows[0].id);

    await client.query("COMMIT");
    res.status(201).json({
      message: "User registered successfully. Approval has been sent to Admin for approval.",
      user: newUser.rows[0],
      request: pendingRequest,
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error registering user:", err);
    res
      .status(err.status || 500)
      .json({ error: err.exposeMessage || "Server error" });
  } finally {
    client.release();
  }
});


// Request mobile OTP for login
router.post("/login/request-otp", async (req, res) => {
  const mobileNumber = String(req.body?.mobile_number || "").trim();
  const cleanMobile = normalizeMobileNumber(mobileNumber);

  if (cleanMobile.length < 10) {
    return res.status(400).json({ error: "Valid mobile number is required" });
  }

  const client = await pool.connect();
  try {
    await ensureCustomerLoginOtpsTable();

    const user = await findUserByMobileNumber(client, mobileNumber);
    const existingUserId = user?.id || null;

    const recentOtpRes = await client.query(
      `SELECT created_at
         FROM customer_login_otps
        WHERE (
            ($1::int IS NOT NULL AND user_id = $1)
            OR ($1::int IS NULL AND mobile_number = $2)
          )
          AND used = FALSE
          AND created_at > NOW() - ($3::int * INTERVAL '1 second')
        ORDER BY created_at DESC
        LIMIT 1`,
      [existingUserId, cleanMobile, LOGIN_OTP_RESEND_COOLDOWN_SECONDS]
    );

    if (recentOtpRes.rowCount) {
      const createdAtMs = new Date(recentOtpRes.rows[0].created_at).getTime();
      const elapsedSeconds = Math.floor((Date.now() - createdAtMs) / 1000);
      const retryAfterSeconds = Math.max(
        LOGIN_OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds,
        1
      );
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        error: `OTP already sent. Please try again after ${retryAfterSeconds} second${retryAfterSeconds === 1 ? "" : "s"}.`,
        retry_after_seconds: retryAfterSeconds,
      });
    }

    const smsResult = await sendLoginOtpSms(user?.mobile_number || mobileNumber);
    const expiresAt = new Date(Date.now() + LOGIN_OTP_TTL_MINUTES * 60 * 1000);

    await client.query(
      `UPDATE customer_login_otps
          SET used = TRUE
        WHERE (
            ($1::int IS NOT NULL AND user_id = $1)
            OR ($1::int IS NULL AND mobile_number = $2)
          )
          AND used = FALSE`,
      [existingUserId, cleanMobile]
    );

    await client.query(
      `INSERT INTO customer_login_otps (user_id, mobile_number, provider_session_id, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [existingUserId, cleanMobile, smsResult.sessionId, expiresAt]
    );

    return res.json({
      success: true,
      message: "OTP sent successfully.",
      mobile_number: maskMobileNumber(user?.mobile_number || cleanMobile),
      expires_in_seconds: LOGIN_OTP_TTL_MINUTES * 60,
    });
  } catch (err) {
    console.error("Error requesting login OTP:", err);
    return res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// Verify mobile OTP and issue customer JWT
router.post("/login/verify-otp", async (req, res) => {
  const mobileNumber = String(req.body?.mobile_number || "").trim();
  const cleanMobile = normalizeMobileNumber(mobileNumber);
  const otp = String(req.body?.otp || "").trim();

  if (cleanMobile.length < 10 || !otp) {
    return res.status(400).json({ error: "Mobile number and OTP are required" });
  }

  const client = await pool.connect();
  try {
    await ensureCustomerLoginOtpsTable();
    await client.query("BEGIN");

    let user = await findUserByMobileNumber(client, mobileNumber);
    const existingUserId = user?.id || null;

    const otpRes = await client.query(
      `SELECT id, provider_session_id, expires_at, used, attempts
         FROM customer_login_otps
        WHERE (
            ($1::int IS NOT NULL AND user_id = $1)
            OR ($1::int IS NULL AND mobile_number = $2)
          )
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE`,
      [existingUserId, cleanMobile]
    );

    if (!otpRes.rowCount) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Please request an OTP first" });
    }

    const otpRow = otpRes.rows[0];
    if (otpRow.used) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "OTP already used. Please request a new OTP." });
    }

    if (new Date(otpRow.expires_at) < new Date()) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "OTP expired. Please request a new OTP.",
        otp_expired: true,
      });
    }

    if (Number(otpRow.attempts || 0) >= LOGIN_OTP_MAX_ATTEMPTS) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Too many attempts. Please request a new OTP." });
    }

    if (!otpRow.provider_session_id) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Please request a new OTP" });
    }

    const otpVerification = await verifyLoginOtpWithProvider(otpRow.provider_session_id, otp);
    await client.query(
      `UPDATE customer_login_otps
          SET attempts = attempts + 1
        WHERE id = $1`,
      [otpRow.id]
    );

    if (!otpVerification.verified) {
      await client.query("COMMIT");
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (!user) {
      user = await createOtpOnlyUser(client, mobileNumber);
      if (!user) {
        await client.query("ROLLBACK");
        return res.status(500).json({ error: "Unable to create customer account" });
      }
    }

    await client.query(
      `UPDATE customer_login_otps
          SET used = TRUE,
              user_id = $2
        WHERE id = $1`,
      [otpRow.id, user.id]
    );

    await client.query("COMMIT");

    const token = jwt.sign({ user_id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });

    return res.json({ message: "Login successful", token, user });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error verifying login OTP:", err);
    return res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// Local development only: bypass SMS OTP costs while testing.
router.post("/login/dev-bypass", async (req, res) => {
  if (!isDevAuthBypassEnabled()) {
    return res.status(404).json({ error: "Not found" });
  }

  const fallbackMobile = process.env.DEV_AUTH_BYPASS_MOBILE || "9999999999";
  const mobileNumber = String(req.body?.mobile_number || fallbackMobile).trim();
  const cleanMobile = normalizeMobileNumber(mobileNumber);

  if (cleanMobile.length < 10) {
    return res.status(400).json({ error: "Valid mobile number is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let user = await findUserByMobileNumber(client, cleanMobile);
    if (!user) {
      user = await createOtpOnlyUser(client, cleanMobile);
    }

    await client.query("COMMIT");

    const token = jwt.sign({ user_id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "12h",
    });

    return res.json({
      message: "Local development login successful",
      token,
      user,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error during dev auth bypass:", err);
    return res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// Password login has been replaced by mobile OTP login.
router.post("/login", (_req, res) => {
  return res.status(410).json({
    error: "Password login is disabled. Please login with mobile OTP.",
  });
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
      const user = await pool.query("SELECT id, username, email, mobile_number, referral_code, wallet, address, state FROM users WHERE id = $1", [
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
      const { id, username, email, mobile_number, address, state } = req.body; // ✅ Get ID from frontend
  
      // Ensure the user is updating their own profile
      if (id !== req.user.user_id) {
        return res.status(403).json({ error: "Unauthorized action" });
      }
  
      const updatedUser = await pool.query(
        "UPDATE users SET username = $1, email = $2, mobile_number = $3, address = COALESCE($4, address), state = COALESCE($5, state) WHERE id = $6 RETURNING *",
        [username, email, mobile_number, address ?? null, state ?? null, id]
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
