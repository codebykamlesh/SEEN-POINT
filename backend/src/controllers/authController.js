/**
 * Authentication Controller
 * --------------------------
 * Handles: register, login, profile, token refresh
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');

/**
 * Generate a signed JWT token
 */
const signToken = (user, expiresIn = process.env.JWT_EXPIRES_IN || '7d') => {
    return jwt.sign(
        { id: user.id, email: user.email, isAdmin: user.is_admin },
        process.env.JWT_SECRET,
        { expiresIn }
    );
};

/**
 * POST /api/auth/register
 * Register a new user and return a JWT token
 */
const register = asyncHandler(async (req, res) => {
    const { email, password, fullName } = req.body;

    // Validate input
    if (!email || !password || !fullName) {
        throw createError('Email, password, and full name are required', 400);
    }
    if (password.length < 6) {
        throw createError('Password must be at least 6 characters', 400);
    }

    // Check for duplicate email
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
        throw createError('An account with this email already exists', 409);
    }

    // Hash password (cost factor 12 = good security/performance balance)
    const passwordHash = await bcrypt.hash(password, 12);

    // Assign the Basic plan by default
    const planResult = await query(
        `SELECT id FROM subscription_plans WHERE name = 'Basic' LIMIT 1`
    );
    const planId = planResult.rows[0]?.id || null;

    // Insert user
    const { rows } = await query(
        `INSERT INTO users 
            (id, email, password_hash, full_name, subscription_plan_id, subscription_start, subscription_end, email_verified)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '1 month', TRUE)
         RETURNING id, email, full_name, is_admin, subscription_plan_id, created_at`,
        [uuidv4(), email.toLowerCase(), passwordHash, fullName, planId]
    );
    const user = rows[0];

    // Create a default profile
    await query(
        `INSERT INTO profiles (id, user_id, name, avatar_url) VALUES ($1, $2, $3, $4)`,
        [uuidv4(), user.id, fullName.split(' ')[0], `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`]
    );

    const token = signToken(user);

    res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            isAdmin: user.is_admin,
        }
    });
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw createError('Email and password are required', 400);
    }

    // Find user with subscription info
    const { rows } = await query(
        `SELECT u.*, sp.name AS plan_name 
         FROM users u
         LEFT JOIN subscription_plans sp ON sp.id = u.subscription_plan_id
         WHERE u.email = $1 AND u.is_active = TRUE`,
        [email.toLowerCase()]
    );

    if (rows.length === 0) {
        throw createError('Invalid email or password', 401);
    }

    const user = rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
        throw createError('Invalid email or password', 401);
    }

    // Update last login time
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = signToken(user);

    res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            isAdmin: user.is_admin,
            planName: user.plan_name,
        }
    });
});

/**
 * GET /api/auth/me
 * Return current user profile (requires auth)
 */
const getProfile = asyncHandler(async (req, res) => {
    const { rows } = await query(
        `SELECT u.id, u.email, u.full_name, u.is_admin, u.created_at,
                u.subscription_start, u.subscription_end,
                sp.name AS plan_name, sp.max_screens, sp.max_quality,
                (SELECT json_agg(row_to_json(p)) FROM (
                    SELECT id, name, avatar_url, is_kids FROM profiles WHERE user_id = u.id
                ) p) AS profiles
         FROM users u
         LEFT JOIN subscription_plans sp ON sp.id = u.subscription_plan_id
         WHERE u.id = $1`,
        [req.user.id]
    );

    if (rows.length === 0) {
        throw createError('User not found', 404);
    }

    res.json({ success: true, user: rows[0] });
});

/**
 * GET /api/auth/profiles
 * Get all profiles for the current user
 */
const getProfiles = asyncHandler(async (req, res) => {
    const { rows } = await query(
        `SELECT id, name, avatar_url, is_kids, language FROM profiles WHERE user_id = $1`,
        [req.user.id]
    );
    res.json({ success: true, profiles: rows });
});

module.exports = { register, login, getProfile, getProfiles };
