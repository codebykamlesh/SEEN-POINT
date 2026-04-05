/**
 * Admin Controller
 * -----------------
 * Manages: content CRUD, user management, analytics, materialized view refresh
 * All routes require Admin authentication.
 */

const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');

function normalizeContentSourceInput(payload) {
    const sourceType = (payload.sourceType || (payload.onedriveFileId ? 'onedrive' : 'public_domain') || 'public_domain')
        .toString()
        .trim()
        .toLowerCase();

    if (!['onedrive', 'public_domain', 'youtube'].includes(sourceType)) {
        throw createError('sourceType must be one of onedrive, public_domain, or youtube', 400);
    }

    const trailerUrl = payload.trailerUrl ? String(payload.trailerUrl).trim() : null;
    const onedriveFileId = payload.onedriveFileId ? String(payload.onedriveFileId).trim() : null;
    const fullVideoUrl = payload.fullVideoUrl
        ? String(payload.fullVideoUrl).trim()
        : (payload.videoUrl ? String(payload.videoUrl).trim() : null);

    if (sourceType === 'onedrive' && !onedriveFileId) {
        throw createError('onedriveFileId is required when sourceType is onedrive', 400);
    }

    if (sourceType !== 'onedrive' && !fullVideoUrl) {
        throw createError('fullVideoUrl is required for non-OneDrive content', 400);
    }

    return {
        sourceType,
        trailerUrl,
        onedriveFileId,
        fullVideoUrl,
    };
}

// ─── ANALYTICS DASHBOARD ─────────────────────────────────────────────────────

/**
 * GET /api/admin/analytics
 * Returns platform KPIs from the materialized view + recent data
 */
const getAnalytics = asyncHandler(async (req, res) => {
    const EMPTY_STATS = {
        total_users: 0, new_users_30d: 0, active_members: 0,
        total_content: 0, total_movies: 0, total_series: 0,
        views_24h: 0, views_7d: 0, total_ratings: 0,
        last_refreshed: new Date().toISOString(),
    };

    try {
        const [stats, topContent, genreStats, recentUsers, dailyViews] = await Promise.all([
            // Platform stats (from materialized view — fast!)
            query(`SELECT * FROM mv_platform_stats LIMIT 1`).catch(() => ({ rows: [EMPTY_STATS] })),

            // Top 10 content by views
            query(`
                SELECT id, title, content_type, avg_rating, total_views, total_ratings, poster_url
                FROM content WHERE is_published = TRUE
                ORDER BY total_views DESC LIMIT 10
            `).catch(() => ({ rows: [] })),

            // Genre stats (from materialized view)
            query(`SELECT * FROM mv_genre_stats ORDER BY total_views DESC LIMIT 10`)
                .catch(() => ({ rows: [] })),

            // Recent user registrations
            query(`
                SELECT u.id, u.email, u.full_name, u.created_at, u.is_active,
                       'Free Access' AS access_label
                FROM users u
                ORDER BY u.created_at DESC LIMIT 10
            `).catch(() => ({ rows: [] })),

            // Daily view counts for last 14 days
            query(`
                SELECT DATE_TRUNC('day', watched_at) AS day, COUNT(*) AS views
                FROM watch_history
                WHERE watched_at > NOW() - INTERVAL '14 days'
                GROUP BY day ORDER BY day ASC
            `).catch(() => ({ rows: [] })),
        ]);

        const statsRow = stats.rows[0] || EMPTY_STATS;
        // mv_platform_stats already exposes `active_members`; keep fallback neutral.
        if (statsRow.active_members === undefined) statsRow.active_members = 0;

        res.json({
            success: true,
            data: {
                stats: statsRow,
                topContent: topContent.rows,
                genreStats: genreStats.rows,
                recentUsers: recentUsers.rows,
                dailyViews: dailyViews.rows,
            }
        });
    } catch (err) {
        // Graceful fallback — admin panel should not crash
        res.json({
            success: true,
            data: {
                stats: EMPTY_STATS,
                topContent: [], genreStats: [], recentUsers: [], dailyViews: [],
            },
            _warning: `Analytics partially unavailable: ${err.message}`,
        });
    }
});

// ─── CONTENT MANAGEMENT ──────────────────────────────────────────────────────

/**
 * GET /api/admin/content
 * List all content including unpublished drafts
 */
const adminGetContent = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type, published } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    const params = [];
    let i = 1;

    if (type) { conditions.push(`c.content_type = $${i++}`); params.push(type); }
    if (published !== undefined) { conditions.push(`c.is_published = $${i++}`); params.push(published === 'true'); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const { rows } = await query(
        `SELECT c.id, c.title, c.content_type, c.release_year, c.is_published,
                c.is_featured, c.avg_rating, c.total_views, c.total_ratings,
                c.poster_url, c.backdrop_url, c.source_type, c.onedrive_file_id, c.full_video_url,
                c.created_at, c.updated_at
         FROM content c ${where}
         ORDER BY c.created_at DESC
         LIMIT $${i++} OFFSET $${i++}`,
        [...params, parseInt(limit), offset]
    );

    const { rows: countRows } = await query(
        `SELECT COUNT(*) AS total FROM content c ${where}`, params
    );

    res.json({
        success: true,
        data: rows,
        pagination: {
            total: parseInt(countRows[0].total),
            page: parseInt(page),
            limit: parseInt(limit),
        }
    });
});

/**
 * POST /api/admin/content
 * Create new content entry
 */
const createContent = asyncHandler(async (req, res) => {
    const {
        title, contentType, synopsis, tagline, releaseYear,
        durationMin, maturityRating, posterUrl, backdropUrl,
        trailerUrl, videoUrl, fullVideoUrl, sourceType, language, country, imdbId,
        isPublished = false, isFeatured = false, tags = [], genreIds = [], onedriveFileId = null
    } = req.body;

    if (!title || !contentType) {
        throw createError('title and contentType are required', 400);
    }

    const normalized = normalizeContentSourceInput({
        trailerUrl,
        videoUrl,
        fullVideoUrl,
        sourceType,
        onedriveFileId,
    });

    const id = uuidv4();

    await query(
        `INSERT INTO content 
            (id, title, content_type, synopsis, tagline, release_year, duration_min,
             maturity_rating, poster_url, backdrop_url, trailer_url, video_url,
             language, country, imdb_id, is_published, is_featured, tags, onedrive_file_id,
             source_type, full_video_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
        [id, title, contentType, synopsis, tagline, releaseYear, durationMin,
         maturityRating || 'PG-13', posterUrl, backdropUrl, normalized.trailerUrl, normalized.fullVideoUrl,
         language || 'en', country, imdbId, isPublished, isFeatured, tags, normalized.onedriveFileId,
         normalized.sourceType, normalized.fullVideoUrl]
    );

    // Assign genres
    if (genreIds.length > 0) {
        const genreValues = genreIds.map(gid => `('${id}', '${gid}')`).join(', ');
        await query(`INSERT INTO content_genres (content_id, genre_id) VALUES ${genreValues} ON CONFLICT DO NOTHING`);
    }

    res.status(201).json({ success: true, message: 'Content created', id });
});

/**
 * PUT /api/admin/content/:id
 * Update content entry
 */
const updateContent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const fields = req.body;

    const shouldNormalizeSource = (
        fields.sourceType !== undefined
        || fields.onedriveFileId !== undefined
        || fields.fullVideoUrl !== undefined
        || fields.videoUrl !== undefined
        || fields.trailerUrl !== undefined
    );
    const normalizedSource = shouldNormalizeSource
        ? normalizeContentSourceInput({
            trailerUrl: fields.trailerUrl,
            videoUrl: fields.videoUrl,
            fullVideoUrl: fields.fullVideoUrl,
            sourceType: fields.sourceType,
            onedriveFileId: fields.onedriveFileId,
        })
        : null;

    // Build dynamic update query
    const allowed = ['title','synopsis','tagline','release_year','duration_min',
        'maturity_rating','poster_url','backdrop_url',
        'language','country','is_published','is_featured','tags'];

    const updates = [];
    const params = [];
    let i = 1;

    for (const field of allowed) {
        const camelKey = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        if (fields[camelKey] !== undefined) {
            updates.push(`${field} = $${i++}`);
            params.push(fields[camelKey]);
        }
    }

    if (normalizedSource) {
        const sourceFieldValues = {
            trailer_url: normalizedSource.trailerUrl,
            video_url: normalizedSource.fullVideoUrl,
            onedrive_file_id: normalizedSource.onedriveFileId,
            source_type: normalizedSource.sourceType,
            full_video_url: normalizedSource.fullVideoUrl,
        };

        for (const [field, value] of Object.entries(sourceFieldValues)) {
            updates.push(`${field} = $${i++}`);
            params.push(value);
        }
    }

    if (updates.length === 0) throw createError('No valid fields to update', 400);

    params.push(id);
    await query(
        `UPDATE content SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i}`,
        params
    );

    res.json({ success: true, message: 'Content updated' });
});

/**
 * DELETE /api/admin/content/:id
 */
const deleteContent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await query(`DELETE FROM content WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Content deleted' });
});

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 */
const getUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows } = await query(
        `SELECT u.id, u.email, u.full_name, u.is_active, u.is_admin,
                u.created_at, u.last_login,
                'Free Access' AS access_label
         FROM users u
         ORDER BY u.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
    );

    const { rows: countRows } = await query(`SELECT COUNT(*) AS total FROM users`);

    res.json({
        success: true,
        data: rows,
        pagination: { total: parseInt(countRows[0].total), page: parseInt(page), limit: parseInt(limit) }
    });
});

/**
 * POST /api/admin/refresh-views
 * Manually trigger materialized view refresh
 */
const refreshMaterializedViews = asyncHandler(async (req, res) => {
    const start = Date.now();
    try {
        const { rows } = await query(`SELECT refresh_all_materialized_views() AS result`);
        const duration = Date.now() - start;
        console.log(`  🔄 Manual MV refresh triggered by admin (${duration}ms)`);
        res.json({
            success: true,
            message: rows[0].result,
            durationMs: duration,
        });
    } catch (err) {
        // Function might not exist yet — try raw refresh
        try {
            await query(`REFRESH MATERIALIZED VIEW mv_trending_content`);
            await query(`REFRESH MATERIALIZED VIEW mv_platform_stats`);
            res.json({
                success: true,
                message: 'Materialized views refreshed (partial)',
                durationMs: Date.now() - start,
            });
        } catch (err2) {
            throw createError(`View refresh failed: ${err2.message}. Run npm run setup-db`, 503);
        }
    }
});

module.exports = {
    getAnalytics, adminGetContent, createContent, updateContent,
    deleteContent, getUsers, refreshMaterializedViews,
};
