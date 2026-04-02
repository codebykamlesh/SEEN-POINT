-- =============================================================
-- SEEN POINT: Materialized Views
-- =============================================================
-- Materialized views store the RESULT of a query physically on disk.
-- They are perfect for expensive analytics that don't need to be
-- 100% real-time. Refreshed on schedule or on demand.
-- =============================================================

-- =============================================================
-- VIEW 1: Trending Content (last 7 days by view count)
-- Used in: Home page "Trending Now" row, Admin dashboard
-- Refresh: Every hour via pg_cron or app scheduler
-- =============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_trending_content AS
    SELECT
        c.id,
        c.title,
        c.content_type,
        c.poster_url,
        c.backdrop_url,
        c.avg_rating,
        c.maturity_rating,
        c.release_year,
        c.duration_min,
        c.total_views,
        COALESCE(COUNT(wh.id), 0) AS views_7d,
        RANK() OVER (ORDER BY COALESCE(COUNT(wh.id), 0) DESC, c.avg_rating DESC) AS trend_rank
    FROM content c
    LEFT JOIN watch_history wh ON wh.content_id = c.id
        AND wh.watched_at > NOW() - INTERVAL '7 days'
    WHERE c.is_published = TRUE
    GROUP BY c.id
    ORDER BY views_7d DESC, c.avg_rating DESC
    LIMIT 50
WITH DATA;

-- Unique index required for CONCURRENTLY refresh (allows reads during update)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_trending_content_id 
    ON mv_trending_content(id);

-- =============================================================
-- VIEW 2: Genre Statistics (for analytics dashboard)
-- Used in: Admin analytics, genre filtering
-- Refresh: Daily
-- =============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_genre_stats AS
    SELECT
        g.id AS genre_id,
        g.name AS genre_name,
        g.slug,
        COUNT(DISTINCT cg.content_id) AS total_content,
        COUNT(DISTINCT wh.id) AS total_views,
        ROUND(AVG(c.avg_rating)::NUMERIC, 2) AS avg_genre_rating,
        SUM(c.total_views) AS all_time_views
    FROM genres g
    LEFT JOIN content_genres cg ON cg.genre_id = g.id
    LEFT JOIN content c ON c.id = cg.content_id AND c.is_published = TRUE
    LEFT JOIN watch_history wh ON wh.content_id = c.id 
                                AND wh.watched_at > NOW() - INTERVAL '30 days'
    GROUP BY g.id, g.name, g.slug
    ORDER BY total_views DESC
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_genre_stats_id 
    ON mv_genre_stats(genre_id);

-- =============================================================
-- VIEW 3: Top Rated Content per Genre (for recommendations)
-- Used in: Home page carousels, recommendation engine
-- Refresh: Every 6 hours
-- =============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_by_genre AS
    SELECT
        g.id AS genre_id,
        g.name AS genre_name,
        c.id AS content_id,
        c.title,
        c.content_type,
        c.poster_url,
        c.avg_rating,
        c.total_views,
        c.release_year,
        c.maturity_rating,
        c.slug,
        RANK() OVER (
            PARTITION BY g.id 
            ORDER BY (c.avg_rating * 0.6 + LN(c.total_views + 1) * 0.4) DESC
        ) AS rank_in_genre
    FROM genres g
    INNER JOIN content_genres cg ON cg.genre_id = g.id
    INNER JOIN content c ON c.id = cg.content_id
    WHERE c.is_published = TRUE
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_by_genre 
    ON mv_top_by_genre(genre_id, content_id);
CREATE INDEX IF NOT EXISTS idx_mv_top_by_genre_rank 
    ON mv_top_by_genre(genre_id, rank_in_genre);

-- =============================================================
-- VIEW 4: Platform Summary Stats (Admin dashboard KPIs)
-- Used in: Admin dashboard header cards
-- Refresh: Every 5 minutes
-- =============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_platform_stats AS
    SELECT
        -- User metrics
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS total_users,
        (SELECT COUNT(*) FROM users 
         WHERE created_at > NOW() - INTERVAL '30 days') AS new_users_30d,
        (SELECT COUNT(*) FROM users 
         WHERE subscription_plan_id IS NOT NULL 
           AND is_active = TRUE) AS paying_users,
        -- Content metrics
        (SELECT COUNT(*) FROM content WHERE is_published = TRUE) AS total_content,
        (SELECT COUNT(*) FROM content 
         WHERE content_type = 'movie' AND is_published = TRUE) AS total_movies,
        (SELECT COUNT(*) FROM content 
         WHERE content_type = 'series' AND is_published = TRUE) AS total_series,
        -- Engagement metrics
        (SELECT COUNT(*) FROM watch_history 
         WHERE watched_at > NOW() - INTERVAL '24 hours') AS views_24h,
        (SELECT COUNT(*) FROM watch_history 
         WHERE watched_at > NOW() - INTERVAL '7 days') AS views_7d,
        (SELECT COUNT(*) FROM ratings) AS total_ratings,
        NOW() AS last_refreshed
WITH DATA;

-- No unique index needed (single row)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_platform_stats 
    ON mv_platform_stats(last_refreshed);

-- =============================================================
-- REFRESH HELPER FUNCTION
-- Call this to refresh all materialized views at once
-- Can be scheduled with pg_cron: SELECT cron.schedule(...)
-- =============================================================

CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS TEXT AS $$
BEGIN
    -- CONCURRENTLY allows reads during refresh (requires unique index)
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_trending_content;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_genre_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_by_genre;
    -- mv_platform_stats is single-row → cannot use CONCURRENTLY
    REFRESH MATERIALIZED VIEW mv_platform_stats;
    RETURN 'All materialized views refreshed at ' || NOW()::TEXT;
EXCEPTION WHEN OTHERS THEN
    -- Fallback: refresh without CONCURRENTLY if index is missing
    REFRESH MATERIALIZED VIEW mv_trending_content;
    REFRESH MATERIALIZED VIEW mv_genre_stats;
    REFRESH MATERIALIZED VIEW mv_top_by_genre;
    REFRESH MATERIALIZED VIEW mv_platform_stats;
    RETURN 'Materialized views refreshed (non-concurrent) at ' || NOW()::TEXT;
END;
$$ LANGUAGE plpgsql;
