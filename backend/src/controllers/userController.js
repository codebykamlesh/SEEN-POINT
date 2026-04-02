/**
 * User Controller
 * ----------------
 * Handles: watch history, watchlist, ratings, reviews, notifications
 */

const { query, getClient } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');

// ─── WATCH HISTORY ──────────────────────────────────────────────────────────

/**
 * GET /api/user/continue-watching
 * Get content the user was watching but hasn't finished
 * Uses the composite index idx_watch_continue for speed
 */
const getContinueWatching = asyncHandler(async (req, res) => {
    const { profileId } = req.query;
    if (!profileId) throw createError('profileId is required', 400);

    const { rows } = await query(
        `SELECT DISTINCT ON (wh.content_id)
            wh.id, wh.content_id, wh.episode_id,
            wh.progress_seconds, wh.total_seconds, wh.watched_at,
            c.title, c.content_type, c.poster_url, c.backdrop_url, c.slug, c.duration_min,
            ROUND((wh.progress_seconds::NUMERIC / NULLIF(wh.total_seconds, 0)) * 100, 1) AS progress_pct,
            e.episode_number, e.title AS episode_title,
            s.season_number
         FROM watch_history wh
         JOIN content c ON c.id = wh.content_id
         LEFT JOIN episodes e ON e.id = wh.episode_id
         LEFT JOIN seasons s ON s.id = e.season_id
         WHERE wh.profile_id = $1
           AND wh.completed = FALSE
           AND wh.progress_seconds > 30
         ORDER BY wh.content_id, wh.watched_at DESC
         LIMIT 15`,
        [profileId]
    );

    res.json({ success: true, data: rows });
});

/**
 * POST /api/user/watch-history
 * Record/update watch progress
 */
const updateWatchHistory = asyncHandler(async (req, res) => {
    const { profileId, contentId, episodeId, progressSeconds, totalSeconds } = req.body;

    if (!profileId || !contentId) {
        throw createError('profileId and contentId are required', 400);
    }

    const completed = totalSeconds && progressSeconds >= totalSeconds * 0.9;

    // Upsert watch history record
    const { rows } = await query(
        `INSERT INTO watch_history 
            (profile_id, content_id, episode_id, progress_seconds, total_seconds, completed, watched_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id`,
        [profileId, contentId, episodeId || null, progressSeconds || 0, totalSeconds || null, completed]
    );

    res.json({ success: true, data: rows[0] });
});

/**
 * GET /api/user/watch-history
 * Get a profile's full watch history (paginated)
 */
const getWatchHistory = asyncHandler(async (req, res) => {
    const { profileId, page = 1, limit = 20 } = req.query;
    if (!profileId) throw createError('profileId is required', 400);

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows } = await query(
        `SELECT DISTINCT ON (wh.content_id)
            wh.content_id, wh.completed, wh.progress_seconds,
            wh.total_seconds, wh.watched_at,
            c.title, c.poster_url, c.content_type, c.slug
         FROM watch_history wh
         JOIN content c ON c.id = wh.content_id
         WHERE wh.profile_id = $1
         ORDER BY wh.content_id, wh.watched_at DESC
         LIMIT $2 OFFSET $3`,
        [profileId, limit, offset]
    );

    res.json({ success: true, data: rows });
});

// ─── WATCHLIST ───────────────────────────────────────────────────────────────

/**
 * GET /api/user/watchlist
 */
const getWatchlist = asyncHandler(async (req, res) => {
    const { profileId } = req.query;
    if (!profileId) throw createError('profileId is required', 400);

    const { rows } = await query(
        `SELECT w.id, w.added_at, c.id AS content_id, c.title,
                c.poster_url, c.backdrop_url, c.content_type,
                c.avg_rating, c.release_year, c.maturity_rating, c.slug
         FROM watchlist w
         JOIN content c ON c.id = w.content_id
         WHERE w.profile_id = $1
         ORDER BY w.added_at DESC`,
        [profileId]
    );

    res.json({ success: true, data: rows });
});

/**
 * POST /api/user/watchlist
 */
const addToWatchlist = asyncHandler(async (req, res) => {
    const { profileId, contentId } = req.body;
    if (!profileId || !contentId) {
        throw createError('profileId and contentId are required', 400);
    }

    await query(
        `INSERT INTO watchlist (profile_id, content_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [profileId, contentId]
    );

    res.status(201).json({ success: true, message: 'Added to watchlist' });
});

/**
 * DELETE /api/user/watchlist/:contentId
 */
const removeFromWatchlist = asyncHandler(async (req, res) => {
    const { contentId } = req.params;
    const { profileId } = req.query;

    await query(
        `DELETE FROM watchlist WHERE profile_id = $1 AND content_id = $2`,
        [profileId, contentId]
    );

    res.json({ success: true, message: 'Removed from watchlist' });
});

// ─── RATINGS ─────────────────────────────────────────────────────────────────

/**
 * POST /api/user/ratings
 * Rate or update a rating for content
 * The trigger fn_update_content_rating auto-updates content.avg_rating
 */
const rateContent = asyncHandler(async (req, res) => {
    const { profileId, contentId, score } = req.body;

    if (!profileId || !contentId || !score) {
        throw createError('profileId, contentId, and score are required', 400);
    }
    if (score < 1 || score > 10) {
        throw createError('Score must be between 1 and 10', 400);
    }

    const { rows } = await query(
        `INSERT INTO ratings (profile_id, content_id, score, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (profile_id, content_id)
         DO UPDATE SET score = EXCLUDED.score, updated_at = NOW()
         RETURNING *`,
        [profileId, contentId, score]
    );

    res.json({ success: true, data: rows[0], message: 'Rating saved' });
});

/**
 * GET /api/user/ratings/:contentId?profileId=...
 * Get a user's rating for a specific content
 */
const getUserRating = asyncHandler(async (req, res) => {
    const { contentId } = req.params;
    const { profileId } = req.query;

    const { rows } = await query(
        `SELECT score FROM ratings WHERE profile_id = $1 AND content_id = $2`,
        [profileId, contentId]
    );

    res.json({ success: true, data: rows[0] || null });
});

// ─── REVIEWS ─────────────────────────────────────────────────────────────────

/**
 * POST /api/user/reviews
 */
const addReview = asyncHandler(async (req, res) => {
    const { profileId, contentId, body, isSpoiler = false } = req.body;

    if (!profileId || !contentId || !body) {
        throw createError('profileId, contentId, and body are required', 400);
    }
    if (body.length < 10) {
        throw createError('Review must be at least 10 characters', 400);
    }

    const { rows } = await query(
        `INSERT INTO reviews (profile_id, content_id, body, is_spoiler)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [profileId, contentId, body, isSpoiler]
    );

    res.status(201).json({ success: true, data: rows[0] });
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

/**
 * GET /api/user/notifications
 */
const getNotifications = asyncHandler(async (req, res) => {
    const { rows: notifs } = await query(
        `SELECT id, type, title, body, link, is_read, created_at
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [req.user.id]
    );

    const { rows: countRows } = await query(
        `SELECT COUNT(*) AS unread FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
        [req.user.id]
    );

    res.json({
        success: true,
        data: notifs,
        unreadCount: parseInt(countRows[0].unread)
    });
});

/**
 * PUT /api/user/notifications/read
 * Mark all notifications as read
 */
const markNotificationsRead = asyncHandler(async (req, res) => {
    await query(
        `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
        [req.user.id]
    );
    res.json({ success: true, message: 'All notifications marked as read' });
});

// ─── PROFILE MANAGEMENT ──────────────────────────────────────────────────────

/**
 * PUT /api/user/profile
 * Update user's full name
 */
const updateProfile = asyncHandler(async (req, res) => {
    const { fullName } = req.body;
    if (!fullName || !fullName.trim()) throw createError('Full name is required', 400);

    await query(
        `UPDATE users SET full_name = $1, updated_at = NOW() WHERE id = $2`,
        [fullName.trim(), req.user.id]
    );

    // Also update default profile name
    await query(
        `UPDATE profiles SET name = $1 WHERE user_id = $2 AND name = (SELECT full_name FROM users WHERE id = $2 LIMIT 1)`,
        [fullName.split(' ')[0], req.user.id]
    ).catch(() => {}); // Non-fatal

    res.json({ success: true, message: 'Profile updated' });
});

/**
 * POST /api/user/change-password
 * Change authenticated user's password
 */
const changePassword = asyncHandler(async (req, res) => {
    const bcrypt = require('bcryptjs');
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) throw createError('Both passwords are required', 400);
    if (newPassword.length < 8) throw createError('New password must be at least 8 characters', 400);

    const { rows } = await query(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);
    if (!rows.length) throw createError('User not found', 404);

    const isValid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isValid) throw createError('Current password is incorrect', 401);

    const newHash = await bcrypt.hash(newPassword, 12);
    await query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [newHash, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });
});

module.exports = {
    getContinueWatching, updateWatchHistory, getWatchHistory,
    getWatchlist, addToWatchlist, removeFromWatchlist,
    rateContent, getUserRating,
    addReview,
    getNotifications, markNotificationsRead,
    updateProfile, changePassword,
};
