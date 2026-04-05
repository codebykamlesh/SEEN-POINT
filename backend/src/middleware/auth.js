/**
 * Authentication Middleware
 * --------------------------
 * Verifies JWT tokens on protected routes.
 * Attaches the decoded user payload to req.user.
 */

const jwt = require('jsonwebtoken');

const extractToken = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }

    if (typeof req.query.token === 'string' && req.query.token.trim()) {
        return req.query.token.trim();
    }

    return null;
};

/**
 * Middleware: require a valid JWT token
 */
const authenticate = (req, res, next) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, email, isAdmin }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired' });
        }
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

/**
 * Middleware: require admin role
 * Must be used AFTER authenticate middleware
 */
const requireAdmin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
};

/**
 * Middleware: optionally authenticate (don't fail if no token)
 * Useful for public routes that have extra features for logged-in users
 */
const optionalAuthenticate = (req, res, next) => {
    const token = extractToken(req);
    if (!token) {
        req.user = null;
        return next();
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        req.user = null;
    }
    next();
};

module.exports = { authenticate, requireAdmin, optionalAuthenticate };
