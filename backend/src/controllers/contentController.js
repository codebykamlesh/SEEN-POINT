/**
 * Content Controller
 * -------------------
 * Handles all content-related API operations:
 * - Browse with filtering, sorting & pagination
 * - Full-text search using PostgreSQL tsvector GIN index
 * - Trending (from mv_trending_content materialized view)
 * - Detail view with cast, genres, seasons & reviews
 * - Episodes for series
 * 
 * FALLBACK: All endpoints return dummy data if DB is empty,
 * so the frontend remains functional during development.
 */

'use strict';

const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');

// ─── Dummy Fallback Data ──────────────────────────────────────────────────────
// Returned when DB is empty so frontend always has content to display

const DUMMY_CONTENT = [
    {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Inception',
        content_type: 'movie',
        synopsis: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea.',
        release_year: 2010, duration_min: 148, maturity_rating: 'PG-13',
        poster_url: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
        backdrop_url: 'https://image.tmdb.org/t/p/original/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=YoHD9XEInc0',
        full_video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        avg_rating: 8.8, total_views: 125000, total_ratings: 500,
        is_featured: true, language: 'en', tags: ['sci-fi', 'thriller'],
        genres: [{ name: 'Action', slug: 'action' }, { name: 'Sci-Fi', slug: 'sci-fi' }],
    },
    {
        id: '22222222-2222-2222-2222-222222222222',
        title: 'Interstellar',
        content_type: 'movie',
        synopsis: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
        release_year: 2014, duration_min: 169, maturity_rating: 'PG-13',
        poster_url: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
        backdrop_url: 'https://image.tmdb.org/t/p/original/pbrkL804c8yAv3zBZR4QPEafpAR.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
        full_video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        avg_rating: 8.6, total_views: 110000, total_ratings: 450,
        is_featured: true, language: 'en', tags: ['space', 'science'],
        genres: [{ name: 'Sci-Fi', slug: 'sci-fi' }, { name: 'Drama', slug: 'drama' }],
    },
    {
        id: '33333333-3333-3333-3333-333333333333',
        title: 'The Dark Knight',
        content_type: 'movie',
        synopsis: 'When the Joker wreaks havoc on Gotham, Batman must accept one of the greatest psychological tests of his ability to fight injustice.',
        release_year: 2008, duration_min: 152, maturity_rating: 'PG-13',
        poster_url: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
        backdrop_url: 'https://image.tmdb.org/t/p/original/hqkIcbrOHL86UncnHIsHVcVmzue.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=EXeTwQWrcwY',
        full_video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        avg_rating: 9.0, total_views: 180000, total_ratings: 700,
        is_featured: false, language: 'en', tags: ['batman', 'action'],
        genres: [{ name: 'Action', slug: 'action' }, { name: 'Crime', slug: 'crime' }],
    },
    {
        id: '44444444-4444-4444-4444-444444444444',
        title: 'Breaking Bad',
        content_type: 'series',
        synopsis: 'A chemistry teacher diagnosed with cancer turns to manufacturing and selling methamphetamine to secure his family\'s future.',
        release_year: 2008, duration_min: null, maturity_rating: 'TV-MA',
        poster_url: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
        backdrop_url: 'https://image.tmdb.org/t/p/original/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=HhesaQXLuRY',
        full_video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        avg_rating: 9.5, total_views: 310000, total_ratings: 900,
        is_featured: true, language: 'en', tags: ['crime', 'drama'],
        genres: [{ name: 'Crime', slug: 'crime' }, { name: 'Drama', slug: 'drama' }],
    },
    {
        id: '55555555-5555-5555-5555-555555555555',
        title: 'Dune',
        content_type: 'movie',
        synopsis: 'Feature adaptation of Frank Herbert\'s science fiction novel, about the son of a noble family entrusted with the protection of the most valuable asset in the galaxy.',
        release_year: 2021, duration_min: 155, maturity_rating: 'PG-13',
        poster_url: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
        backdrop_url: 'https://image.tmdb.org/t/p/original/eeIStTMhkBmkltpEbcGAiDFmpuD.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=n9xhKvQKfcg',
        full_video_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        avg_rating: 8.1, total_views: 95000, total_ratings: 380,
        is_featured: true, language: 'en', tags: ['sci-fi', 'epic'],
        genres: [{ name: 'Sci-Fi', slug: 'sci-fi' }, { name: 'Adventure', slug: 'adventure' }],
    },
    {
        id: '66666666-6666-6666-6666-666666666666',
        title: 'Parasite',
        content_type: 'movie',
        synopsis: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
        release_year: 2019, duration_min: 132, maturity_rating: 'R',
        poster_url: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
        backdrop_url: 'https://image.tmdb.org/t/p/original/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg',
        trailer_url: 'https://www.youtube.com/watch?v=5xH0HfJHsaY',
        full_video_url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        avg_rating: 8.5, total_views: 92000, total_ratings: 360,
        is_featured: false, language: 'ko', tags: ['korean', 'drama'],
        genres: [{ name: 'Thriller', slug: 'thriller' }, { name: 'Drama', slug: 'drama' }],
    },
];

const DUMMY_GENRES = [
    { id: '11111111-1111-1111-1111-aaaaaaaaaaaa', name: 'Action', slug: 'action', content_count: 5 },
    { id: '22222222-2222-2222-2222-aaaaaaaaaaaa', name: 'Drama', slug: 'drama', content_count: 7 },
    { id: '33333333-3333-3333-3333-aaaaaaaaaaaa', name: 'Sci-Fi', slug: 'sci-fi', content_count: 4 },
    { id: '44444444-4444-4444-4444-aaaaaaaaaaaa', name: 'Thriller', slug: 'thriller', content_count: 3 },
    { id: '55555555-5555-5555-5555-aaaaaaaaaaaa', name: 'Crime', slug: 'crime', content_count: 4 },
    { id: '66666666-6666-6666-6666-aaaaaaaaaaaa', name: 'Horror', slug: 'horror', content_count: 2 },
    { id: '77777777-7777-7777-7777-aaaaaaaaaaaa', name: 'Romance', slug: 'romance', content_count: 3 },
    { id: '88888888-8888-8888-8888-aaaaaaaaaaaa', name: 'Animation', slug: 'animation', content_count: 2 },
];

// ─── Helper: Check if result is empty ────────────────────────────────────────

function isEmpty(rows) {
    return !rows || rows.length === 0;
}

function extractYouTubeVideoId(value) {
    if (!value) return null;

    const trimmed = value.trim();
    const directIdMatch = trimmed.match(/^[A-Za-z0-9_-]{11}$/);
    if (directIdMatch) return trimmed;

    try {
        const url = new URL(trimmed);
        if (url.hostname.includes('youtu.be')) {
            return url.pathname.replace('/', '').trim() || null;
        }

        if (url.hostname.includes('youtube.com')) {
            return url.searchParams.get('v')
                || url.pathname.split('/').filter(Boolean).pop()
                || null;
        }
    } catch {
        return null;
    }

    return null;
}

function buildYouTubeEmbedUrl(value, autoplay = false) {
    const videoId = extractYouTubeVideoId(value);
    if (!videoId) return null;

    const params = new URLSearchParams({
        autoplay: autoplay ? '1' : '0',
        rel: '0',
        modestbranding: '1',
    });

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function normalizePlaybackSource(content) {
    if (content.onedrive_file_id) {
        return {
            kind: 'onedrive',
            src: `/api/onedrive/stream/${content.onedrive_file_id}`,
            sourceType: 'onedrive',
            fileId: content.onedrive_file_id,
        };
    }

    if (!content.full_video_url) {
        console.error(`[playback] Missing full_video_url for content_id=${content.id || 'unknown'}`);
        return null;
    }

    const normalizedSourceType = content.source_type || 'public_domain';
    const fullUrl = String(content.full_video_url).trim();
    const youtubeId = extractYouTubeVideoId(fullUrl);

    if (normalizedSourceType === 'youtube' || youtubeId) {
        console.error(`[playback] Invalid full movie source for content_id=${content.id || 'unknown'}: full playback cannot use YouTube embeds`);
        return null;
    }

    return {
        kind: 'html5',
        src: fullUrl,
        sourceType: normalizedSourceType,
        fileId: null,
    };
}

function buildPlaybackData(content, isAuthenticated) {
    const trailerEmbedUrl = buildYouTubeEmbedUrl(content.trailer_url, true);
    const fullPlaybackSource = normalizePlaybackSource(content);
    const access = {
        isAuthenticated,
        canWatchFull: isAuthenticated,
        requiresLogin: !isAuthenticated,
        loginMessage: 'Login to watch full movie',
    };

    if (!isAuthenticated) {
        return {
            access,
            trailer_embed_url: trailerEmbedUrl,
            playback: trailerEmbedUrl
                ? { kind: 'youtube', src: trailerEmbedUrl, label: 'Trailer' }
                : null,
            playback_error: trailerEmbedUrl ? null : 'Trailer is not configured for this title.',
            stream_url: null,
            full_video_url: null,
            stream_path: null,
            full_playback_source: null,
        };
    }

    if (!fullPlaybackSource) {
        return {
            access,
            trailer_embed_url: trailerEmbedUrl,
            playback: null,
            playback_error: 'Full movie source is missing or invalid for this title.',
            stream_url: null,
            full_video_url: null,
            stream_path: null,
            full_playback_source: null,
        };
    }

    return {
        access,
        trailer_embed_url: trailerEmbedUrl,
        playback: { kind: 'html5', src: fullPlaybackSource.src, label: 'Full Movie' },
        playback_error: null,
        stream_url: fullPlaybackSource.src,
        full_video_url: fullPlaybackSource.kind === 'html5' ? fullPlaybackSource.src : null,
        stream_path: fullPlaybackSource.kind === 'onedrive' ? fullPlaybackSource.src : null,
        full_playback_source: {
            kind: fullPlaybackSource.kind,
            source_type: fullPlaybackSource.sourceType,
            onedrive_file_id: fullPlaybackSource.fileId,
        },
    };
}

// ─── GET /api/content ─────────────────────────────────────────────────────────

/**
 * Browse content with filters, sorting, and pagination.
 * Falls back to dummy data if DB returns nothing.
 */
const getContent = asyncHandler(async (req, res) => {
    const {
        type, genre, year, rating, sort = 'rating',
        page = 1, limit = 20, featured,
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const offset   = (pageNum - 1) * limitNum;

    const conditions = ['c.is_published = TRUE'];
    const params     = [];
    let   paramIdx   = 1;

    if (type)   { conditions.push(`c.content_type = $${paramIdx++}`); params.push(type); }
    if (year)   { conditions.push(`c.release_year = $${paramIdx++}`); params.push(parseInt(year)); }
    if (rating) { conditions.push(`c.avg_rating >= $${paramIdx++}`);  params.push(parseFloat(rating)); }
    if (featured === 'true') conditions.push(`c.is_featured = TRUE`);

    if (genre) {
        conditions.push(`EXISTS (
            SELECT 1 FROM content_genres cg
            JOIN genres g ON g.id = cg.genre_id
            WHERE cg.content_id = c.id AND g.slug = $${paramIdx++}
        )`);
        params.push(genre);
    }

    const whereClause = conditions.join(' AND ');
    const sortMap = {
        newest: 'c.release_year DESC, c.created_at DESC',
        oldest: 'c.release_year ASC',
        rating: 'c.avg_rating DESC NULLS LAST',
        views:  'c.total_views DESC',
        title:  'c.title ASC',
    };
    const orderBy = sortMap[sort] || sortMap.rating;

    try {
        const [contentResult, countResult] = await Promise.all([
            query(`
                SELECT 
                    c.id, c.title, c.slug, c.content_type, c.synopsis,
                    c.release_year, c.duration_min, c.maturity_rating,
                    c.poster_url, c.backdrop_url, c.avg_rating, c.total_ratings,
                    c.total_views, c.is_featured, c.language, c.tags,
                    COALESCE(
                        json_agg(DISTINCT jsonb_build_object(
                            'id', g.id, 'name', g.name, 'slug', g.slug
                        )) FILTER (WHERE g.id IS NOT NULL),
                        '[]'
                    ) AS genres
                FROM content c
                LEFT JOIN content_genres cg ON cg.content_id = c.id
                LEFT JOIN genres g ON g.id = cg.genre_id
                WHERE ${whereClause}
                GROUP BY c.id
                ORDER BY ${orderBy}
                LIMIT $${paramIdx++} OFFSET $${paramIdx++}
            `, [...params, limitNum, offset]),

            query(`
                SELECT COUNT(DISTINCT c.id) AS total
                FROM content c
                LEFT JOIN content_genres cg ON cg.content_id = c.id
                LEFT JOIN genres g ON g.id = cg.genre_id
                WHERE ${whereClause}
            `, params.slice(0, paramIdx - 3)), // exclude limit/offset params
        ]);

        const rows = contentResult.rows;
        const total = parseInt(countResult.rows[0].total);

        // Fallback if DB empty
        if (isEmpty(rows) && pageNum === 1 && !type && !genre && !year && !rating) {
            return res.json({
                success: true,
                data: DUMMY_CONTENT,
                pagination: { page: 1, limit: limitNum, total: DUMMY_CONTENT.length, totalPages: 1 },
                _fallback: true,
            });
        }

        res.json({
            success: true,
            data: rows,
            pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
        });
    } catch (err) {
        // On DB error (table not found), return dummy data gracefully
        if (err.code === '42P01' || err.statusCode === 503) {
            return res.json({
                success: true,
                data: DUMMY_CONTENT,
                pagination: { page: 1, limit: limitNum, total: DUMMY_CONTENT.length, totalPages: 1 },
                _fallback: true,
                _warning: 'Database not initialized — showing demo data. Run: npm run setup-db',
            });
        }
        throw err;
    }
});

// ─── GET /api/content/search ──────────────────────────────────────────────────

/**
 * Full-text search using PostgreSQL tsvector GIN index.
 * PERFORMANCE: GIN index makes this O(log n) vs ILIKE O(n).
 */
const searchContent = asyncHandler(async (req, res) => {
    const { q, type, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
        throw createError('Search query must be at least 2 characters', 400);
    }

    const pageNum  = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, parseInt(limit) || 20);
    const offset   = (pageNum - 1) * limitNum;
    const searchQ  = q.trim();

    const params = [searchQ];
    let paramIdx = 2;

    const conditions = [
        `c.is_published = TRUE`,
        `(c.search_vector @@ plainto_tsquery('english', $1)
          OR c.title ILIKE '%' || $1 || '%'
          OR c.synopsis ILIKE '%' || $1 || '%')`,
    ];

    if (type) { conditions.push(`c.content_type = $${paramIdx++}`); params.push(type); }

    const whereClause = conditions.join(' AND ');

    try {
        const [result, countResult] = await Promise.all([
            query(`
                SELECT
                    c.id, c.title, c.slug, c.content_type, c.synopsis,
                    c.release_year, c.duration_min, c.maturity_rating,
                    c.poster_url, c.avg_rating, c.total_views,
                    ts_rank_cd(c.search_vector, plainto_tsquery('english', $1)) AS relevance_score,
                    COALESCE(
                        json_agg(DISTINCT jsonb_build_object('name', g.name, 'slug', g.slug))
                        FILTER (WHERE g.id IS NOT NULL),
                        '[]'
                    ) AS genres
                FROM content c
                LEFT JOIN content_genres cg ON cg.content_id = c.id
                LEFT JOIN genres g ON g.id = cg.genre_id
                WHERE ${whereClause}
                GROUP BY c.id
                ORDER BY relevance_score DESC, c.avg_rating DESC NULLS LAST
                LIMIT $${paramIdx++} OFFSET $${paramIdx++}
            `, [...params, limitNum, offset]),

            query(`
                SELECT COUNT(DISTINCT c.id) AS total FROM content c
                WHERE ${whereClause}
            `, params),
        ]);

        // Fallback to fuzzy search in dummy data
        if (isEmpty(result.rows)) {
            const lq = searchQ.toLowerCase();
            const filtered = DUMMY_CONTENT.filter(c =>
                c.title.toLowerCase().includes(lq) ||
                c.synopsis.toLowerCase().includes(lq) ||
                (c.tags || []).some(t => t.includes(lq))
            );
            return res.json({
                success: true,
                query: searchQ,
                data: filtered,
                pagination: { page: pageNum, limit: limitNum, total: filtered.length, totalPages: 1 },
                _fallback: true,
            });
        }

        res.json({
            success: true,
            query: searchQ,
            data: result.rows,
            pagination: {
                page: pageNum, limit: limitNum,
                total: parseInt(countResult.rows[0].total),
                totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limitNum),
            },
        });
    } catch (err) {
        if (err.code === '42P01' || err.statusCode === 503) {
            const lq = searchQ.toLowerCase();
            const filtered = DUMMY_CONTENT.filter(c =>
                c.title.toLowerCase().includes(lq) || c.synopsis.toLowerCase().includes(lq)
            );
            return res.json({
                success: true, query: searchQ, _fallback: true,
                data: filtered,
                pagination: { page: 1, limit: limitNum, total: filtered.length, totalPages: 1 },
            });
        }
        throw err;
    }
});

// ─── GET /api/content/trending ────────────────────────────────────────────────

/**
 * Returns top trending content from the mv_trending_content materialized view.
 * PERFORMANCE: Pre-calculated query — response time < 5ms vs 500ms+ real-time.
 * Falls back to content by total_views if MV is not populated.
 */
const getTrending = asyncHandler(async (req, res) => {
    const { limit = 20 } = req.query;
    const limitNum = Math.min(50, parseInt(limit) || 20);

    try {
        // Try materialized view first (fastest)
        const { rows } = await query(
            `SELECT t.id, t.title, t.content_type, t.poster_url, t.backdrop_url,
                    t.avg_rating, t.maturity_rating, t.release_year, t.duration_min,
                    t.total_views, t.views_7d, t.trend_rank,
                    COALESCE(
                        (SELECT json_agg(jsonb_build_object('name', g.name, 'slug', g.slug))
                         FROM content_genres cg JOIN genres g ON g.id = cg.genre_id
                         WHERE cg.content_id = t.id),
                        '[]'
                    ) AS genres
             FROM mv_trending_content t
             ORDER BY t.trend_rank
             LIMIT $1`,
            [limitNum]
        );

        if (isEmpty(rows)) {
            // MV empty (no watch history yet) — fall back to top-rated content
            const fallback = await query(
                `SELECT c.id, c.title, c.content_type, c.poster_url, c.backdrop_url,
                         c.avg_rating, c.maturity_rating, c.release_year, c.duration_min,
                         c.total_views, 0 AS views_7d,
                         RANK() OVER (ORDER BY c.avg_rating DESC) AS trend_rank,
                         COALESCE(
                             json_agg(DISTINCT jsonb_build_object('name', g.name, 'slug', g.slug))
                             FILTER (WHERE g.id IS NOT NULL), '[]'
                         ) AS genres
                 FROM content c
                 LEFT JOIN content_genres cg ON cg.content_id = c.id
                 LEFT JOIN genres g ON g.id = cg.genre_id
                 WHERE c.is_published = TRUE
                 GROUP BY c.id
                 ORDER BY c.avg_rating DESC NULLS LAST, c.total_views DESC
                 LIMIT $1`,
                [limitNum]
            );
            return res.json({ success: true, data: fallback.rows, _source: 'fallback_by_rating' });
        }

        res.json({ success: true, data: rows, _source: 'mv_trending_content' });
    } catch (err) {
        if (err.code === '42P01' || err.statusCode === 503) {
            return res.json({
                success: true,
                data: DUMMY_CONTENT,
                _fallback: true,
                _source: 'dummy_data',
            });
        }
        throw err;
    }
});

// ─── GET /api/content/featured ────────────────────────────────────────────────

const getFeatured = asyncHandler(async (req, res) => {
    try {
        const { rows } = await query(
            `SELECT c.id, c.title, c.slug, c.content_type, c.synopsis, c.tagline,
                    c.release_year, c.duration_min, c.maturity_rating,
                    c.poster_url, c.backdrop_url, c.trailer_url,
                    c.avg_rating, c.total_ratings, c.total_views, c.tags,
                    COALESCE(
                        json_agg(DISTINCT jsonb_build_object('name', g.name, 'slug', g.slug))
                        FILTER (WHERE g.id IS NOT NULL),
                        '[]'
                    ) AS genres
             FROM content c
             LEFT JOIN content_genres cg ON cg.content_id = c.id
             LEFT JOIN genres g ON g.id = cg.genre_id
             WHERE c.is_published = TRUE AND c.is_featured = TRUE
             GROUP BY c.id
             ORDER BY c.avg_rating DESC
             LIMIT 8`
        );

        // Fallback: any published content if none is featured
        if (isEmpty(rows)) {
            const { rows: any } = await query(
                `SELECT c.id, c.title, c.content_type, c.synopsis,
                         c.release_year, c.duration_min, c.maturity_rating,
                         c.poster_url, c.backdrop_url, c.avg_rating, c.total_views, c.tags,
                         '[]'::json AS genres
                 FROM content c WHERE c.is_published = TRUE
                 ORDER BY c.avg_rating DESC LIMIT 5`
            );
            return res.json({ success: true, data: any });
        }

        res.json({ success: true, data: rows });
    } catch (err) {
        if (err.code === '42P01' || err.statusCode === 503) {
            return res.json({
                success: true,
                data: DUMMY_CONTENT.filter(c => c.is_featured),
                _fallback: true,
            });
        }
        throw err;
    }
});

// ─── GET /api/content/:id ─────────────────────────────────────────────────────

const getContentById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const isAuthenticated = !!req.user;

    // Basic UUID validation
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
        throw createError('Invalid content ID format', 400);
    }

    try {
        const contentResult = await query(
            `SELECT c.*,
                COALESCE(
                    json_agg(DISTINCT jsonb_build_object('id', g.id, 'name', g.name, 'slug', g.slug))
                    FILTER (WHERE g.id IS NOT NULL),
                    '[]'
                ) AS genres
             FROM content c
             LEFT JOIN content_genres cg ON cg.content_id = c.id
             LEFT JOIN genres g ON g.id = cg.genre_id
             WHERE c.id = $1 AND c.is_published = TRUE
             GROUP BY c.id`,
            [id]
        );

        if (isEmpty(contentResult.rows)) {
            // Check dummy data
            const dummy = DUMMY_CONTENT.find(c => c.id === id);
            if (dummy) {
                return res.json({
                    success: true,
                    data: {
                        ...dummy,
                        ...buildPlaybackData(dummy, isAuthenticated),
                        qualities: [],
                        subtitles: [],
                        cast: [],
                        seasons: [],
                        reviews: [],
                        similar: DUMMY_CONTENT.slice(0, 4),
                    }
                });
            }
            throw createError('Content not found', 404);
        }

        const content = contentResult.rows[0];

        // Parallel fetches for related data
        const [castResult, reviewsResult, similarResult, seasonsResult, qualitiesResult, subtitlesResult] = await Promise.all([
            query(
                `SELECT p.id, p.name, p.photo_url, p.birth_date,
                         cc.role, cc.character, cc.billing_order
                 FROM content_cast cc
                 JOIN people p ON p.id = cc.person_id
                 WHERE cc.content_id = $1
                 ORDER BY cc.role, cc.billing_order`,
                [id]
            ),
            query(
                `SELECT r.id, r.body, r.helpful_votes, r.is_spoiler, r.created_at,
                         pr.name AS profile_name, pr.avatar_url
                 FROM reviews r
                 JOIN profiles pr ON pr.id = r.profile_id
                 WHERE r.content_id = $1
                 ORDER BY r.helpful_votes DESC, r.created_at DESC
                 LIMIT 10`,
                [id]
            ),
            query(
                `SELECT DISTINCT c.id, c.title, c.poster_url, c.avg_rating,
                         c.content_type, c.release_year, c.duration_min, c.slug
                 FROM content c
                 JOIN content_genres cg ON cg.content_id = c.id
                 WHERE cg.genre_id IN (
                     SELECT genre_id FROM content_genres WHERE content_id = $1
                 ) AND c.id != $1 AND c.is_published = TRUE
                 ORDER BY c.avg_rating DESC NULLS LAST
                 LIMIT 8`,
                [id]
            ),
            content.content_type === 'series'
                ? query(
                    `SELECT s.*,
                             (SELECT COUNT(*) FROM episodes e
                              WHERE e.season_id = s.id AND e.is_published = TRUE) AS episode_count
                     FROM seasons s WHERE s.content_id = $1
                     ORDER BY s.season_number`,
                    [id]
                  )
                : { rows: [] },
            isAuthenticated
                ? query(
                    `SELECT quality, onedrive_file_id
                     FROM video_qualities
                     WHERE content_id = $1
                     ORDER BY quality DESC`,
                    [id]
                ).catch(() => ({ rows: [] }))
                : { rows: [] },
            query(
                `SELECT language, file_url
                 FROM subtitle_files
                 WHERE content_id = $1
                 ORDER BY language ASC`,
                [id]
            ).catch(() => ({ rows: [] })),
        ]);

        res.json({
            success: true,
            data: {
                ...content,
                ...buildPlaybackData(content, isAuthenticated),
                qualities: qualitiesResult.rows,
                subtitles: subtitlesResult.rows,
                cast:    castResult.rows,
                seasons: seasonsResult.rows,
                reviews: reviewsResult.rows,
                similar: similarResult.rows,
            },
        });
    } catch (err) {
        if (err.code === '42P01' || err.statusCode === 503) {
            const dummy = DUMMY_CONTENT.find(c => c.id === id);
            if (dummy) {
                return res.json({
                    success: true,
                    data: {
                        ...dummy,
                        ...buildPlaybackData(dummy, isAuthenticated),
                        qualities: [],
                        subtitles: [],
                        cast: [],
                        seasons: [],
                        reviews: [],
                        similar: DUMMY_CONTENT.slice(0, 4),
                    },
                    _fallback: true,
                });
            }
        }
        throw err;
    }
});

// ─── GET /api/content/:id/episodes ───────────────────────────────────────────

const getEpisodes = asyncHandler(async (req, res) => {
    const { id }        = req.params;
    const { season = 1 } = req.query;

    const { rows } = await query(
        `SELECT e.id, e.episode_number, e.title, e.synopsis,
                 e.duration_min, e.thumbnail_url, e.video_url,
                 e.air_date, e.is_published
         FROM episodes e
         JOIN seasons s ON s.id = e.season_id
         WHERE s.content_id = $1
           AND s.season_number = $2
           AND e.is_published = TRUE
         ORDER BY e.episode_number`,
        [id, parseInt(season)]
    );

    res.json({ success: true, data: rows });
});

// ─── GET /api/content/genres/all ─────────────────────────────────────────────

const getAllGenres = asyncHandler(async (req, res) => {
    try {
        const { rows } = await query(
            `SELECT g.id, g.name, g.slug,
                     COUNT(DISTINCT cg.content_id) AS content_count
             FROM genres g
             LEFT JOIN content_genres cg ON cg.genre_id = g.id
             LEFT JOIN content c ON c.id = cg.content_id AND c.is_published = TRUE
             GROUP BY g.id
             ORDER BY content_count DESC`
        );

        if (isEmpty(rows)) {
            return res.json({ success: true, data: DUMMY_GENRES, _fallback: true });
        }

        res.json({ success: true, data: rows });
    } catch (err) {
        if (err.code === '42P01' || err.statusCode === 503) {
            return res.json({ success: true, data: DUMMY_GENRES, _fallback: true });
        }
        throw err;
    }
});

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    getContent, searchContent, getTrending, getFeatured,
    getContentById, getEpisodes, getAllGenres,
};
