/**
 * Database Configuration & Connection Pool
 * -----------------------------------------
 * Uses pg.Pool for connection pooling with:
 * - Health checking on startup
 * - Actionable error messages (wrong password, DB not found, etc.)
 * - Graceful handling of "table/view not found" errors
 * - Stats logging for debugging
 */

'use strict';

const { Pool } = require('pg');
require('dotenv').config();

// ─── Pool Configuration ───────────────────────────────────────────────────────
const pool = new Pool({
    host:                    process.env.DB_HOST     || 'localhost',
    port:                    parseInt(process.env.DB_PORT) || 5432,
    database:                process.env.DB_NAME     || 'seenpoint_db',
    user:                    process.env.DB_USER     || 'postgres',
    password:                process.env.DB_PASSWORD || 'postgres',
    // Pool sizing
    max:                     20,       // Max concurrent connections
    min:                     2,        // Min idle connections
    idleTimeoutMillis:       30000,    // Close idle connections after 30s
    connectionTimeoutMillis: 5000,     // Fail fast after 5s
    // SSL for production deployments (Railway, Render, Supabase)
    ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
});

// ─── Pool Event Listeners ─────────────────────────────────────────────────────
pool.on('connect', (client) => {
    if (process.env.DB_DEBUG === 'true') {
        console.log('  🔗 DB pool: new connection created');
    }
});

pool.on('error', (err) => {
    console.error('🔴 Unexpected DB pool error:', err.message);
    // Don't crash server on pool errors — log and continue
});

pool.on('remove', () => {
    if (process.env.DB_DEBUG === 'true') {
        console.log('  🔗 DB pool: connection released');
    }
});

// ─── Query Helper ─────────────────────────────────────────────────────────────

/**
 * Execute a parameterized query.
 * Wraps pg.pool.query with enhanced error messages.
 * 
 * @param {string} text - SQL query with $1, $2... placeholders
 * @param {any[]} params - Query parameters
 */
const query = async (text, params) => {
    try {
        const result = await pool.query(text, params);
        return result;
    } catch (err) {
        // Enhance error message for common DB issues
        if (err.code === '42P01') {
            // "relation does not exist" — DB not set up yet
            err.message = `Table/view not found: ${err.message}. Run "npm run setup-db" to initialize the database.`;
            err.statusCode = 503;
        } else if (err.code === '42883') {
            // "function does not exist" — triggers/functions missing
            err.message = `DB function missing: ${err.message}. Run "npm run setup-db" to recreate triggers.`;
            err.statusCode = 503;
        }
        throw err;
    }
};

/** Get a dedicated client for multi-statement transactions */
const getClient = () => pool.connect();

// ─── DB Health Check ──────────────────────────────────────────────────────────

/**
 * Tests the DB connection and checks if all required tables exist.
 * Called on server startup to give clear actionable feedback.
 */
async function checkDatabaseHealth() {
    const REQUIRED_TABLES = [
        'users', 'profiles', 'genres', 'content',
        'content_genres', 'people', 'content_cast', 'seasons', 'episodes',
        'watch_history', 'ratings', 'watchlist', 'notifications',
    ];
    const REQUIRED_VIEWS = ['mv_trending_content', 'mv_genre_stats', 'mv_platform_stats'];

    let client;
    try {
        client = await pool.connect();

        // Check tables
        const tableRes = await client.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE'
        `);
        const existingTables = new Set(tableRes.rows.map(r => r.table_name));

        const missingTables = REQUIRED_TABLES.filter(t => !existingTables.has(t));

        // Check materialized views
        const viewRes = await client.query(`
            SELECT matviewname FROM pg_matviews WHERE schemaname = 'public'
        `);
        const existingViews = new Set(viewRes.rows.map(r => r.matviewname));
        const missingViews = REQUIRED_VIEWS.filter(v => !existingViews.has(v));

        if (missingTables.length > 0) {
            console.warn(`  ⚠️  Missing DB tables: ${missingTables.join(', ')}`);
            console.warn('     → Run: npm run setup-db');
        }
        if (missingViews.length > 0) {
            console.warn(`  ⚠️  Missing materialized views: ${missingViews.join(', ')}`);
            console.warn('     → Run: npm run setup-db');
        }

        // Check if DB is empty
        const contentCount = await client.query('SELECT COUNT(*) FROM content');
        const count = parseInt(contentCount.rows[0].count);
        if (count === 0) {
            console.warn('  ⚠️  Content table is empty — APIs will return empty data');
            console.warn('     → Run: npm run fresh (setup + seed)');
        } else {
            console.log(`  ✅ Database healthy — ${count} content items found`);
        }

        return {
            healthy: missingTables.length === 0 && missingViews.length === 0,
            missingTables,
            missingViews,
            contentCount: count,
        };

    } catch (err) {
        // Provide actionable error messages for common connection failures
        if (err.code === 'ECONNREFUSED') {
            console.error('  ❌ Cannot connect to PostgreSQL — is it running?');
            console.error('     Windows: Open Services (Win+R → services.msc) → postgresql → Start');
        } else if (err.code === '28P01') {
            console.error('  ❌ PostgreSQL auth failed — wrong password');
            console.error(`     Update DB_PASSWORD in backend/.env (current: "${process.env.DB_PASSWORD}")`);
        } else if (err.code === '3D000') {
            console.error(`  ❌ Database '${process.env.DB_NAME || 'seenpoint_db'}' does not exist`);
            console.error('     → Run: npm run setup-db');
        } else {
            console.error('  ❌ DB health check failed:', err.message);
        }
        return { healthy: false, error: err.message };
    } finally {
        if (client) client.release();
    }
}

/** Pool stats — useful for debugging performance */
function getPoolStats() {
    return {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
    };
}

module.exports = { pool, query, getClient, checkDatabaseHealth, getPoolStats };
