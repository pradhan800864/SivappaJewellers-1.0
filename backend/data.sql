-- 🔹 Step 1: Create Database (If Not Exists)
CREATE DATABASE gold_ecommerce;

-- 🔹 Step 2: Connect to the Database
\c gold_ecommerce;

-- 🔹 Step 3: Drop the `users` table if it exists (Use with caution in production)
DROP TABLE IF EXISTS users;

-- 🔹 Step 4: Create `users` Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,               -- Auto-incrementing user ID
    username VARCHAR(255) NOT NULL,      -- Username (Required)
    email VARCHAR(255) UNIQUE NOT NULL,  -- Email (Must be unique)
    password TEXT NOT NULL,              -- Encrypted Password
    mobile_number VARCHAR(20) UNIQUE NOT NULL, -- Mobile (Must be unique)
    referral_code VARCHAR(15) UNIQUE,    -- User's unique referral code
    referrer_id INT,                     -- Parent user (who referred them)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Auto timestamp

    -- 🔹 Foreign Key Constraint (Links referrer_id to another user)
    CONSTRAINT fk_referrer FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 🔹 Step 5: Add Indexes for Faster Performance
CREATE UNIQUE INDEX idx_referral_code ON users(referral_code);
CREATE INDEX idx_referrer_id ON users(referrer_id);

-- 🔹 Step 6: Insert Default "Company" User (Referrer for Direct Signups)
INSERT INTO users (username, email, password, mobile_number, referral_code)
VALUES ('COMPANY', 'company@gmail.com', 'securepassword', '0000000000', 'COMPANY-001')
ON CONFLICT (email) DO NOTHING;