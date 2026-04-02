-- =============================================================
-- SEEN POINT: Indexes for Performance Optimization
-- =============================================================
-- PERFORMANCE EXPLANATION:
-- Indexes allow PostgreSQL to find rows without scanning every row
-- in a table (sequential scan). The right index can turn a O(n)
-- scan into an O(log n) B-Tree lookup.
-- =============================================================

-- =============================================================
-- B-TREE INDEXES (Default, best for equality & range queries)
-- =============================================================

-- Users: Fast lookup by email (login queries)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Users: Find active subscribers
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_plan_id) 
    WHERE is_active = TRUE;

-- Profiles: All profiles for a user (common join)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Content: Most common sort orders
CREATE INDEX IF NOT EXISTS idx_content_release_year ON content(release_year DESC);
CREATE INDEX IF NOT EXISTS idx_content_avg_rating ON content(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_content_total_views ON content(total_views DESC);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(content_type);
CREATE INDEX IF NOT EXISTS idx_content_language ON content(language);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at DESC);

-- Content cast: Fast actor/director lookup
CREATE INDEX IF NOT EXISTS idx_content_cast_content ON content_cast(content_id);
CREATE INDEX IF NOT EXISTS idx_content_cast_person ON content_cast(person_id);
CREATE INDEX IF NOT EXISTS idx_content_cast_role ON content_cast(content_id, role);

-- Seasons & Episodes
CREATE INDEX IF NOT EXISTS idx_seasons_content ON seasons(content_id, season_number);
CREATE INDEX IF NOT EXISTS idx_episodes_season ON episodes(season_id, episode_number);

-- Watch History: Most critical for performance
-- Composite index: find latest watch for a profile+content pair (continue watching)
CREATE INDEX IF NOT EXISTS idx_watch_history_profile_content 
    ON watch_history(profile_id, content_id, watched_at DESC);

-- For "what has this profile watched" queries
CREATE INDEX IF NOT EXISTS idx_watch_history_profile 
    ON watch_history(profile_id, watched_at DESC);

-- For analytics: content popularity
CREATE INDEX IF NOT EXISTS idx_watch_history_content 
    ON watch_history(content_id, watched_at DESC);

-- Ratings: One rating per profile per content
CREATE INDEX IF NOT EXISTS idx_ratings_content ON ratings(content_id);
CREATE INDEX IF NOT EXISTS idx_ratings_profile ON ratings(profile_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_content ON reviews(content_id, created_at DESC);

-- Watchlist: Quick check if content is in watchlist
CREATE INDEX IF NOT EXISTS idx_watchlist_profile_content ON watchlist(profile_id, content_id);

-- Notifications: Unread for a user
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
    ON notifications(user_id, created_at DESC) 
    WHERE is_read = FALSE;

-- Content genres: Lookup by genre
CREATE INDEX IF NOT EXISTS idx_content_genres_genre ON content_genres(genre_id);
CREATE INDEX IF NOT EXISTS idx_content_genres_content ON content_genres(content_id);

-- =============================================================
-- PARTIAL INDEXES (Only index rows matching a condition)
-- PERFORMANCE: Smaller index = faster lookup + less disk space
-- =============================================================

-- Only index published content (most queries only need published)
CREATE INDEX IF NOT EXISTS idx_content_published 
    ON content(created_at DESC, avg_rating DESC) 
    WHERE is_published = TRUE;

-- Only index featured content (very small, very fast)
CREATE INDEX IF NOT EXISTS idx_content_featured 
    ON content(id) 
    WHERE is_featured = TRUE AND is_published = TRUE;

-- Only index active users
CREATE INDEX IF NOT EXISTS idx_users_active 
    ON users(email, subscription_plan_id) 
    WHERE is_active = TRUE;

-- Only index unread notifications (most queries check unread)
CREATE INDEX IF NOT EXISTS idx_notifications_unread 
    ON notifications(user_id) 
    WHERE is_read = FALSE;

-- =============================================================
-- GIN INDEXES (Full-Text Search)
-- PERFORMANCE: GIN (Generalized Inverted Index) maps each word
-- to the documents containing it — ideal for text search.
-- =============================================================

-- Primary full-text search on content
-- This index is what makes instant search possible at scale
CREATE INDEX IF NOT EXISTS idx_content_search_vector 
    ON content USING GIN(search_vector);

-- GIN index on tags array for tag-based filtering
CREATE INDEX IF NOT EXISTS idx_content_tags 
    ON content USING GIN(tags);

-- Trigram index for fuzzy/partial matching (handles typos)
-- Example: "avengrs" will still match "Avengers"
CREATE INDEX IF NOT EXISTS idx_content_title_trgm 
    ON content USING GIN(title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_people_name_trgm 
    ON people USING GIN(name gin_trgm_ops);

-- =============================================================
-- COMPOSITE INDEXES (Multiple columns, order matters!)
-- =============================================================

-- Content browsing: type + published + rating (common filter+sort)
CREATE INDEX IF NOT EXISTS idx_content_browse 
    ON content(content_type, is_published, avg_rating DESC)
    WHERE is_published = TRUE;

-- Watch progress for "continue watching" (most used query)
CREATE INDEX IF NOT EXISTS idx_watch_continue 
    ON watch_history(profile_id, watched_at DESC) 
    WHERE completed = FALSE;
