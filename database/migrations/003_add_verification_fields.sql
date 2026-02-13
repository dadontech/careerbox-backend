-- Add email verification fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS verification_code_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_verification_sent TIMESTAMP;

-- Create verification attempts tracking table
CREATE TABLE IF NOT EXISTS verification_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_verification_code ON users(verification_code);
CREATE INDEX IF NOT EXISTS idx_verification_expires ON users(verification_code_expires);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_user ON verification_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_ip ON verification_attempts(ip_address);

-- Create function to cleanup expired verification codes
CREATE OR REPLACE FUNCTION cleanup_expired_verifications()
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET verification_code = NULL,
        verification_code_expires = NULL,
        verification_attempts = 0
    WHERE verification_code_expires < NOW();
END;
$$ LANGUAGE plpgsql;