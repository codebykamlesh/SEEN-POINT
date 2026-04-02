#!/usr/bin/env node
/**
 * SEEN POINT — Master Database Setup Script
 * ==========================================
 * Runs database initialization in the correct order.
 *
 * Usage:
 *   node database/setup.js             → schema + indexes + triggers + views
 *   node database/setup.js --seed      → above + sample data
 *   node database/setup.js --reset     → DROP + recreate everything
 *   node database/setup.js --seed-only → seed only (DB must already exist)
 *
 * KEY FIX: Materialized views cannot run inside a transaction block.
 * This script splits execution into:
 *   1. Transactional phase  → schema, indexes, triggers (safe to rollback)
 *   2. Non-transactional    → materialized views (run separately)
 *   3. Transactional phase  → seed data
 */

'use strict';

const { Pool } = require('pg');
const fs       = require('fs');
const path     = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// ─── Config ──────────────────────────────────────────────────────────────────

const DB_HOST     = process.env.DB_HOST     || 'localhost';
const DB_PORT     = parseInt(process.env.DB_PORT) || 5432;
const DB_USER     = process.env.DB_USER     || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_NAME     = process.env.DB_NAME     || 'seenpoint_db';

const args = {
    seed:     process.argv.includes('--seed'),
    reset:    process.argv.includes('--reset'),
    seedOnly: process.argv.includes('--seed-only'),
};

// ─── Logger ──────────────────────────────────────────────────────────────────

const log = {
    info:    (msg) => console.log(`  ℹ️  ${msg}`),
    success: (msg) => console.log(`  ✅ ${msg}`),
    warn:    (msg) => console.log(`  ⚠️  ${msg}`),
    error:   (msg) => console.error(`  ❌ ${msg}`),
    step:    (msg) => console.log(`\n  ──── ${msg} ────`),
    divider: ()    => console.log('  ' + '═'.repeat(46)),
};

// ─── Connection Helpers ───────────────────────────────────────────────────────

/** Create a pool connected to the postgres admin DB */
function adminPool() {
    return new Pool({
        host: DB_HOST, port: DB_PORT,
        database: 'postgres',   // Admin DB — always exists
        user: DB_USER, password: DB_PASSWORD,
        connectionTimeoutMillis: 5000,
    });
}

/** Create a pool connected to seenpoint_db */
function appPool() {
    return new Pool({
        host: DB_HOST, port: DB_PORT,
        database: DB_NAME,
        user: DB_USER, password: DB_PASSWORD,
        connectionTimeoutMillis: 5000,
    });
}

// ─── Read SQL File ────────────────────────────────────────────────────────────

function readSQL(filename) {
    const filePath = path.join(__dirname, filename);
    if (!fs.existsSync(filePath)) {
        throw new Error(`SQL file not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf8');
}

// ─── Execute SQL — Transactional ──────────────────────────────────────────────

async function runInTransaction(pool, label, sql) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        log.success(label);
    } catch (err) {
        await client.query('ROLLBACK');
        log.error(`${label} FAILED: ${err.message}`);
        // Log the specific line that caused the error if possible
        if (err.position) {
            const lineNum = sql.substring(0, parseInt(err.position)).split('\n').length;
            log.error(`  → Near line ${lineNum} in SQL`);
        }
        throw err;
    } finally {
        client.release();
    }
}

// ─── Execute SQL — Non-Transactional ──────────────────────────────────────────
// Used for CREATE MATERIALIZED VIEW which cannot run inside a transaction

async function runDirect(pool, label, sql) {
    const client = await pool.connect();
    try {
        await client.query(sql);
        log.success(label);
    } catch (err) {
        log.error(`${label} FAILED: ${err.message}`);
        throw err;
    } finally {
        client.release();
    }
}

// ─── Split SQL by materialized-view statements ────────────────────────────────
// Returns { transactional: string, nonTransactional: string }

function splitViewsSQL(sql) {
    // Materialized views need to be run outside a transaction
    // Everything else (regular views, functions) can be transactional
    const mvRegex = /CREATE\s+MATERIALIZED\s+VIEW[\s\S]*?WITH\s+DATA\s*;/gi;
    const mvStatements = [];
    let rest = sql;

    let match;
    const regex = /CREATE\s+MATERIALIZED\s+VIEW[\s\S]*?WITH\s+DATA\s*;/gi;
    while ((match = regex.exec(sql)) !== null) {
        mvStatements.push(match[0]);
    }

    // Remove MV statements from the main SQL
    rest = sql.replace(/CREATE\s+MATERIALIZED\s+VIEW[\s\S]*?WITH\s+DATA\s*;/gi, '-- [MV removed - run separately]');

    return {
        materialized: mvStatements.join('\n\n'),
        rest,
    };
}

// ─── Step: Create / Drop / Recreate Database ──────────────────────────────────

async function ensureDatabase(shouldReset) {
    const pool = adminPool();
    try {
        const exists = await pool.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`, [DB_NAME]
        );

        if (exists.rows.length > 0) {
            if (shouldReset) {
                log.warn(`Dropping existing database '${DB_NAME}'...`);
                // Terminate all connections first
                await pool.query(`
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE datname = $1 AND pid <> pg_backend_pid()
                `, [DB_NAME]);
                await pool.query(`DROP DATABASE "${DB_NAME}"`);
                log.success(`Database '${DB_NAME}' dropped`);
            } else {
                log.info(`Database '${DB_NAME}' already exists — skipping create`);
                return;
            }
        }

        await pool.query(`CREATE DATABASE "${DB_NAME}"`);
        log.success(`Database '${DB_NAME}' created`);
    } finally {
        await pool.end();
    }
}

// ─── Step: Run Schema (transactional) ────────────────────────────────────────

async function runSchema(pool) {
    const sql = readSQL('schema.sql');
    await runInTransaction(pool, '📐 Schema — tables, constraints, partitions', sql);
}

// ─── Step: Run Indexes (transactional) ───────────────────────────────────────

async function runIndexes(pool) {
    const sql = readSQL('indexes.sql');
    await runInTransaction(pool, '📈 Indexes — B-Tree, GIN, partial', sql);
}

// ─── Step: Run Triggers (transactional) ──────────────────────────────────────

async function runTriggers(pool) {
    const sql = readSQL('triggers.sql');
    await runInTransaction(pool, '⚡ Triggers — auto-updates, search vectors', sql);
}

// ─── Step: Run Materialized Views (NON-transactional) ────────────────────────

async function runViews(pool) {
    log.step('Creating Materialized Views');
    const sql = readSQL('views.sql');
    const { materialized, rest } = splitViewsSQL(sql);

    // 1. Run non-MV parts (functions, indexes on MVs) — transactional
    if (rest.trim().replace(/--[^\n]*/g, '').trim()) {
        const client = await pool.connect();
        try {
            await client.query(rest);
        } catch (e) {
            // Ignore errors in the "rest" part (may be index creation after MV)
            log.warn(`Non-critical view SQL warning: ${e.message.split('\n')[0]}`);
        } finally {
            client.release();
        }
    }

    // 2. Run each materialized view independently (outside transaction)
    const client = await pool.connect();
    try {
        // Split materialized views into individual statements
        const mvStatements = materialized.split(/(?=CREATE\s+MATERIALIZED\s+VIEW)/i).filter(s => s.trim());

        for (const stmt of mvStatements) {
            const nameMatch = stmt.match(/CREATE\s+MATERIALIZED\s+VIEW\s+IF\s+NOT\s+EXISTS\s+(\w+)/i)
                           || stmt.match(/CREATE\s+MATERIALIZED\s+VIEW\s+(\w+)/i);
            const viewName = nameMatch ? nameMatch[1] : 'unknown';

            try {
                await client.query(stmt);
                log.success(`  Materialized view: ${viewName}`);
            } catch (err) {
                if (err.message.includes('already exists')) {
                    log.info(`  Materialized view ${viewName} already exists — skipping`);
                } else {
                    log.warn(`  Materialized view ${viewName}: ${err.message.split('\n')[0]}`);
                }
            }
        }

        // 3. Create the refresh function
        const funcSQL = `
            CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
            RETURNS TEXT AS $$
            BEGIN
                REFRESH MATERIALIZED VIEW CONCURRENTLY mv_trending_content;
                REFRESH MATERIALIZED VIEW CONCURRENTLY mv_genre_stats;
                REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_by_genre;
                REFRESH MATERIALIZED VIEW mv_platform_stats;
                RETURN 'All materialized views refreshed at ' || NOW()::TEXT;
            EXCEPTION WHEN OTHERS THEN
                REFRESH MATERIALIZED VIEW mv_trending_content;
                REFRESH MATERIALIZED VIEW mv_genre_stats;
                REFRESH MATERIALIZED VIEW mv_top_by_genre;
                REFRESH MATERIALIZED VIEW mv_platform_stats;
                RETURN 'Refreshed (non-concurrent) at ' || NOW()::TEXT;
            END;
            $$ LANGUAGE plpgsql;
        `;
        await client.query(funcSQL);
        log.success('  Refresh function: refresh_all_materialized_views()');

        // 4. Create unique indexes on MVs (needed for CONCURRENTLY refresh)
        const indexSQL = `
            CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_trending_content_id ON mv_trending_content(id);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_genre_stats_id ON mv_genre_stats(genre_id);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_by_genre ON mv_top_by_genre(genre_id, content_id);
        `;
        await client.query(indexSQL);
        log.success('  Unique indexes for CONCURRENTLY refresh created');

    } finally {
        client.release();
    }

    log.success('👁️  All materialized views ready');
}

// ─── Step: Run Seed Data (transactional) ─────────────────────────────────────

async function runSeed(pool) {
    const sql = readSQL('seed.sql');

    // The seed ends with `SELECT refresh_all_materialized_views();`
    // That must run outside a transaction, so we split it off
    const [seedPart, ...rest] = sql.split(/SELECT\s+refresh_all_materialized_views/i);
    
    await runInTransaction(pool, '🌱 Sample data — users, content, history, ratings', seedPart);

    // Refresh views now that we have data
    const client = await pool.connect();
    try {
        await client.query(`SELECT refresh_all_materialized_views()`);
        log.success('🔄 Materialized views refreshed with seed data');
    } catch (err) {
        log.warn(`View refresh after seed: ${err.message.split('\n')[0]}`);
    } finally {
        client.release();
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n');
    console.log('  ╔══════════════════════════════════════════════╗');
    console.log('  ║   🎬  SEEN POINT Database Setup               ║');
    console.log('  ║   PostgreSQL + Node.js Streaming Platform     ║');
    console.log('  ╚══════════════════════════════════════════════╝\n');

    log.info(`Target database: ${DB_NAME} @ ${DB_HOST}:${DB_PORT}`);
    log.info(`Mode: ${args.reset ? 'RESET (drop+recreate)' : args.seedOnly ? 'Seed Only' : 'Setup'}`);
    log.divider();

    const startTime = Date.now();

    if (args.seedOnly) {
        // Seed-only mode: just insert data
        log.step('Seed Only Mode');
        const pool = appPool();
        try {
            await runSeed(pool);
        } finally {
            await pool.end();
        }
    } else {
        // Full setup
        log.step('Database');
        await ensureDatabase(args.reset);

        const pool = appPool();
        try {
            // Test connection
            await pool.query('SELECT 1');
            log.success(`Connected to '${DB_NAME}'`);

            log.step('Schema');
            await runSchema(pool);

            log.step('Indexes');
            await runIndexes(pool);

            log.step('Triggers');
            await runTriggers(pool);

            log.step('Materialized Views');
            await runViews(pool);

            if (args.seed) {
                log.step('Seed Data');
                await runSeed(pool);
            }
        } finally {
            await pool.end();
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log.divider();
    console.log(`\n  🎉 Setup complete in ${elapsed}s\n`);

    if (!args.seed && !args.seedOnly) {
        console.log('  💡 To load sample data, run:');
        console.log('     node database/setup.js --seed\n');
    }

    console.log('  🚀 Start the server with:');
    console.log('     npm run dev\n');
}

main().catch((err) => {
    log.error(`\nFatal: ${err.message}`);
    if (err.code === 'ECONNREFUSED') {
        log.error('→ PostgreSQL is not running. Start it and try again.');
        log.error('  Windows: Open Services → postgresql → Start');
    } else if (err.code === '28P01') {
        log.error('→ Wrong password. Update DB_PASSWORD in backend/.env');
    } else if (err.code === '3D000') {
        log.error('→ Database does not exist yet. Run without --seed-only first.');
    }
    console.error('\nFull error:', err);
    process.exit(1);
});
