-- =============================================================
-- SEEN POINT — Migration V2: OTP Auth + Content Source Types
-- =============================================================

-- 1. OTP Codes table for Email OTP authentication
CREATE TABLE IF NOT EXISTS otp_codes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(255) NOT NULL,
    otp         VARCHAR(6) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    is_used     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast OTP lookups
CREATE INDEX IF NOT EXISTS idx_otp_email_expires
    ON otp_codes (email, expires_at DESC)
    WHERE is_used = FALSE;

-- Auto-cleanup expired OTPs (older than 24h)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM otp_codes WHERE expires_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- 2. Add source_type + streaming columns to content table
DO $$
BEGIN
    -- source_type: youtube, onedrive, or public_domain
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'content' AND column_name = 'source_type'
    ) THEN
        ALTER TABLE content ADD COLUMN source_type VARCHAR(20) DEFAULT 'onedrive'
            CHECK (source_type IN ('youtube', 'onedrive', 'public_domain'));
    END IF;

    -- full_video_url: full movie URL (for public_domain or embed URLs)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'content' AND column_name = 'full_video_url'
    ) THEN
        ALTER TABLE content ADD COLUMN full_video_url VARCHAR(1000);
    END IF;

    -- is_free: flag for free content
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'content' AND column_name = 'is_free'
    ) THEN
        ALTER TABLE content ADD COLUMN is_free BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;

    -- Make password_hash nullable for OTP-only users
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
    ALTER TABLE users ALTER COLUMN full_name DROP NOT NULL;

END $$;

-- 3. Index for content source_type filtering
CREATE INDEX IF NOT EXISTS idx_content_source_type ON content (source_type);
CREATE INDEX IF NOT EXISTS idx_content_is_free ON content (is_free);

-- 4. Partitions for 2026 (if not already created via schema.sql)
CREATE TABLE IF NOT EXISTS watch_history_2026_04 PARTITION OF watch_history
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
