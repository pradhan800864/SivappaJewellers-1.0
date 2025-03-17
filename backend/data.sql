-- Drop existing table if it exists (to reset the schema)
DROP TABLE IF EXISTS users;

-- Create the users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(15) UNIQUE NOT NULL,
    referral_code VARCHAR(14) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ✅ Generate Unique Referral Codes for Existing Users
UPDATE users 
SET referral_code = 
  (SELECT 
     CONCAT(
       UPPER(SUBSTRING(MD5(random()::text), 1, 4)), '-',
       UPPER(SUBSTRING(MD5(random()::text), 5, 4)), '-',
       UPPER(SUBSTRING(MD5(random()::text), 9, 4))
     ))
WHERE referral_code IS NULL;

-- ✅ Ensure referral_code is NOT NULL after assigning values
ALTER TABLE users ALTER COLUMN referral_code SET NOT NULL;

-- ✅ Sample Data (Optional)
INSERT INTO users (username, email, password, mobile_number, referral_code) VALUES 
('JohnDoe', 'john@example.com', '$2a$10$abcdef1234567890', '1234567890', 'ABCD-EFGH-IJKL'),
('JaneDoe', 'jane@example.com', '$2a$10$abcdef1234567890', '0987654321', 'MNOP-QRST-UVWX');
