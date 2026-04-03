-- =============================================================
-- SEEN POINT Database Schema
-- Movie Streaming Platform (DBMS Final Year Project)
-- PostgreSQL 14+
-- =============================================================
-- Description: Fully normalized schema with UUIDs as PKs,
--              advanced indexing, partitioning, and triggers.
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Trigram similarity for fuzzy search
CREATE EXTENSION IF NOT EXISTS "unaccent";       -- Accent-insensitive search

-- =============================================================
-- SECTION 1: SUBSCRIPTION PLANS
-- =============================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name         VARCHAR(50) NOT NULL UNIQUE,           -- 'Basic', 'Standard', 'Premium'
    price        DECIMAL(10,2) NOT NULL,
    max_screens  SMALLINT NOT NULL DEFAULT 1,           -- Concurrent streams allowed
    max_quality  VARCHAR(20) NOT NULL DEFAULT 'HD',     -- 'SD', 'HD', '4K'
    description  TEXT,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- SECTION 2: USERS & PROFILES
-- =============================================================

CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email               VARCHAR(255) NOT NULL UNIQUE,
    password_hash       VARCHAR(255),                    -- NULL for OTP-only users
    full_name           VARCHAR(255) NOT NULL,
    subscription_plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
    subscription_start  TIMESTAMPTZ,
    subscription_end    TIMESTAMPTZ,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    is_admin            BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified      BOOLEAN NOT NULL DEFAULT FALSE,
    last_login          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Multiple profiles per account (like Netflix)
CREATE TABLE IF NOT EXISTS profiles (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    avatar_url   VARCHAR(500),
    is_kids      BOOLEAN NOT NULL DEFAULT FALSE,         -- Kids mode restricts content
    language     VARCHAR(10) NOT NULL DEFAULT 'en',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)                               -- Unique profile names per user
);

-- OTP codes for email-based authentication
CREATE TABLE IF NOT EXISTS otp_codes (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email        VARCHAR(255) NOT NULL,
    code         VARCHAR(6) NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL,
    is_used      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- SECTION 3: CONTENT (Movies & TV Shows)
-- =============================================================

CREATE TABLE IF NOT EXISTS genres (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(100) NOT NULL UNIQUE,
    slug       VARCHAR(100) NOT NULL UNIQUE,             -- URL-friendly name
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(500) NOT NULL,
    original_title  VARCHAR(500),                       -- Non-English titles
    slug            VARCHAR(500) UNIQUE,                -- URL-friendly (auto-generated)
    content_type    VARCHAR(20) NOT NULL CHECK (content_type IN ('movie', 'series', 'documentary', 'short')),
    synopsis        TEXT,
    tagline         VARCHAR(500),
    release_year    SMALLINT CHECK (release_year BETWEEN 1900 AND 2100),
    duration_min    SMALLINT,                           -- Runtime in minutes (for movies)
    maturity_rating VARCHAR(10) DEFAULT 'PG-13',        -- 'G', 'PG', 'PG-13', 'R', 'NC-17', 'TV-MA'
    poster_url      VARCHAR(1000),
    backdrop_url    VARCHAR(1000),
    trailer_url     VARCHAR(1000),
    video_url       VARCHAR(1000),                      -- Actual stream URL (mock)
    language        VARCHAR(10) NOT NULL DEFAULT 'en',
    country         VARCHAR(100),
    imdb_id         VARCHAR(20) UNIQUE,
    is_published    BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured     BOOLEAN NOT NULL DEFAULT FALSE,     -- Show in hero banner
    tags            TEXT[],                             -- Array of tags for search
    -- Aggregated stats (updated by triggers)
    avg_rating      DECIMAL(4,2) DEFAULT 0,
    total_ratings   INTEGER DEFAULT 0,
    total_views     BIGINT DEFAULT 0,
    -- Full-text search vector (auto-updated by trigger)
    search_vector   TSVECTOR,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    onedrive_file_id VARCHAR(500),                      -- ID of the file in OneDrive
    -- Multi-source streaming
    source_type     VARCHAR(20) DEFAULT 'onedrive' CHECK (source_type IN ('onedrive', 'youtube', 'public_domain')),
    full_video_url  VARCHAR(1000),                      -- Direct URL or YouTube video ID
    is_free         BOOLEAN NOT NULL DEFAULT TRUE        -- Free to watch without subscription
);

-- OneDrive Integration Tables
CREATE TABLE IF NOT EXISTS onedrive_settings (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    access_token  TEXT,
    refresh_token TEXT,
    expires_at    TIMESTAMPTZ,
    folder_path   VARCHAR(1000),                      -- Base path for movies
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subtitle_files (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id  UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    language    VARCHAR(10) NOT NULL DEFAULT 'en',
    file_url    VARCHAR(1000) NOT NULL,
    format      VARCHAR(10) NOT NULL DEFAULT 'vtt',     -- 'srt', 'vtt'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_qualities (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id       UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    quality          VARCHAR(10) NOT NULL,              -- '1080p', '720p', etc.
    onedrive_file_id VARCHAR(500) NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (content_id, quality)
);

-- Many-to-many: content ↔ genres
CREATE TABLE IF NOT EXISTS content_genres (
    content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    genre_id   UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (content_id, genre_id)
);

-- =============================================================
-- SECTION 4: CAST & CREW
-- =============================================================

CREATE TABLE IF NOT EXISTS people (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    bio         TEXT,
    birth_date  DATE,
    photo_url   VARCHAR(1000),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_cast (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id  UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    person_id   UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('actor', 'director', 'writer', 'producer')),
    character   VARCHAR(255),                           -- Character name (for actors)
    billing_order SMALLINT DEFAULT 99,                 -- 1 = top billing
    UNIQUE (content_id, person_id, role)
);

-- =============================================================
-- SECTION 5: TV SERIES (Seasons & Episodes)
-- =============================================================

CREATE TABLE IF NOT EXISTS seasons (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id   UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    season_number SMALLINT NOT NULL,
    title        VARCHAR(255),
    synopsis     TEXT,
    release_year SMALLINT,
    poster_url   VARCHAR(1000),
    UNIQUE (content_id, season_number)
);

CREATE TABLE IF NOT EXISTS episodes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id       UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    episode_number  SMALLINT NOT NULL,
    title           VARCHAR(500) NOT NULL,
    synopsis        TEXT,
    duration_min    SMALLINT,
    thumbnail_url   VARCHAR(1000),
    video_url       VARCHAR(1000),
    is_published    BOOLEAN NOT NULL DEFAULT FALSE,
    air_date        DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (season_id, episode_number)
);

-- =============================================================
-- SECTION 6: WATCH HISTORY (Partitioned by Month)
-- =============================================================
-- Partitioning: large historical tables benefit enormously from
-- range partitioning as old data can be archived/detached.

CREATE TABLE IF NOT EXISTS watch_history (
    id              UUID NOT NULL DEFAULT uuid_generate_v4(),
    profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content_id      UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    episode_id      UUID REFERENCES episodes(id) ON DELETE CASCADE,
    progress_seconds INTEGER NOT NULL DEFAULT 0,        -- How far user has watched
    total_seconds   INTEGER,                            -- Total content duration
    completed       BOOLEAN NOT NULL DEFAULT FALSE,     -- Watched to end
    watched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, watched_at)                        -- Partition key must be in PK
) PARTITION BY RANGE (watched_at);

-- Create monthly partitions (2 years of data)
CREATE TABLE IF NOT EXISTS watch_history_2025_01 PARTITION OF watch_history
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE IF NOT EXISTS watch_history_2025_02 PARTITION OF watch_history
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE IF NOT EXISTS watch_history_2025_03 PARTITION OF watch_history
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE IF NOT EXISTS watch_history_2025_04 PARTITION OF watch_history
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE IF NOT EXISTS watch_history_2025_05 PARTITION OF watch_history
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE IF NOT EXISTS watch_history_2025_06 PARTITION OF watch_history
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE IF NOT EXISTS watch_history_2025_07 PARTITION OF watch_history
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE IF NOT EXISTS watch_history_2025_08 PARTITION OF watch_history
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE IF NOT EXISTS watch_history_2025_09 PARTITION OF watch_history
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE IF NOT EXISTS watch_history_2025_10 PARTITION OF watch_history
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE IF NOT EXISTS watch_history_2025_11 PARTITION OF watch_history
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE IF NOT EXISTS watch_history_2025_12 PARTITION OF watch_history
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE IF NOT EXISTS watch_history_2026_01 PARTITION OF watch_history
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE IF NOT EXISTS watch_history_2026_02 PARTITION OF watch_history
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS watch_history_2026_03 PARTITION OF watch_history
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS watch_history_2026_04 PARTITION OF watch_history
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE IF NOT EXISTS watch_history_2026_05 PARTITION OF watch_history
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE IF NOT EXISTS watch_history_2026_06 PARTITION OF watch_history
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS watch_history_2026_07 PARTITION OF watch_history
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS watch_history_2026_08 PARTITION OF watch_history
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS watch_history_2026_09 PARTITION OF watch_history
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS watch_history_2026_10 PARTITION OF watch_history
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE IF NOT EXISTS watch_history_2026_11 PARTITION OF watch_history
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE IF NOT EXISTS watch_history_2026_12 PARTITION OF watch_history
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE IF NOT EXISTS watch_history_default PARTITION OF watch_history DEFAULT;

-- =============================================================
-- SECTION 9: STREAMING SESSIONS (optional analytics)
-- =============================================================

CREATE TABLE IF NOT EXISTS streaming_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content_id      UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    episode_id      UUID REFERENCES episodes(id) ON DELETE SET NULL,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    duration_seconds INTEGER,
    quality         VARCHAR(10) DEFAULT 'HD',
    device          VARCHAR(100),
    ip_address      INET
);

-- =============================================================
-- SECTION 7: RATINGS & REVIEWS
-- =============================================================

CREATE TABLE IF NOT EXISTS ratings (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content_id  UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    score       SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 10),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (profile_id, content_id)                     -- One rating per profile per content
);

CREATE TABLE IF NOT EXISTS reviews (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content_id  UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    body        TEXT NOT NULL,
    helpful_votes INTEGER NOT NULL DEFAULT 0,
    is_spoiler  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- SECTION 8: WATCHLIST & NOTIFICATIONS
-- =============================================================

CREATE TABLE IF NOT EXISTS watchlist (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content_id  UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (profile_id, content_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,                   -- 'new_content', 'recommendation', 'system'
    title       VARCHAR(255) NOT NULL,
    body        TEXT,
    link        VARCHAR(500),                           -- Deep link to content
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log for admin actions
CREATE TABLE IF NOT EXISTS audit_log (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id   UUID,
    details     JSONB,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
