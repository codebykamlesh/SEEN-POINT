/**
 * Global Error Handler Middleware
 * ---------------------------------
 * Catches all errors passed via next(err) and returns
 * a consistent JSON error response format.
 * 
 * Handles both custom app errors and PostgreSQL error codes.
 */

'use strict';

const errorHandler = (err, req, res, next) => {
    // Always log in development
    if (process.env.NODE_ENV !== 'production') {
        console.error(`\n🔴 [${req.method} ${req.path}] ${err.message}`);
        if (err.stack && err.code !== err.message) {
            console.error(err.stack.split('\n').slice(1, 4).join('\n'));
        }
    }

    // ─── PostgreSQL Error Codes ───────────────────────────────────────────────

    // 23505 — unique_violation (duplicate entry)
    if (err.code === '23505') {
        return res.status(409).json({
            success: false,
            message: 'A record with this value already exists',
            field: err.constraint,
        });
    }

    // 23503 — foreign_key_violation
    if (err.code === '23503') {
        return res.status(400).json({
            success: false,
            message: 'Referenced record does not exist',
        });
    }

    // 23514 — check_violation (constraint check failed)
    if (err.code === '23514') {
        return res.status(400).json({
            success: false,
            message: 'Value failed validation constraint',
            detail: err.detail,
        });
    }

    // 42P01 — undefined_table (relation does not exist)
    if (err.code === '42P01') {
        return res.status(503).json({
            success: false,
            message: 'Database not initialized. Please run: npm run setup-db',
            table: err.table,
        });
    }

    // 42883 — undefined_function (stored procedure/trigger missing)
    if (err.code === '42883') {
        return res.status(503).json({
            success: false,
            message: 'Database functions missing. Please run: npm run setup-db',
        });
    }

    // 08006 / ECONNREFUSED — database connection failure
    if (err.code === 'ECONNREFUSED' || err.code === '08006') {
        return res.status(503).json({
            success: false,
            message: 'Database unavailable. Please check PostgreSQL is running.',
        });
    }

    // 22P02 — invalid_text_representation (bad UUID format)
    if (err.code === '22P02') {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format',
        });
    }

    // ─── JWT / Auth Errors ────────────────────────────────────────────────────

    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired, please login again' });
    }

    // ─── Custom App Error ─────────────────────────────────────────────────────

    const statusCode = err.statusCode || err.status || 500;
    return res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
};

/**
 * 404 handler — must be registered after all routes
 */
const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.path}`,
        availableRoutes: ['/api/auth', '/api/content', '/api/user', '/api/admin', '/api/health'],
    });
};

/**
 * Async wrapper — eliminates try/catch boilerplate in every controller.
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Create a custom HTTP error with a status code
 */
const createError = (message, statusCode = 500) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

module.exports = { errorHandler, notFound, asyncHandler, createError };
