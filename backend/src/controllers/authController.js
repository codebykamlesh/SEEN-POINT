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
const { sendOTP, generateOTP } = require('../services/email');

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


// ─── OTP AUTH ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/send-otp
 * Generate and email a 6-digit OTP
 */
const sendOtp = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) throw createError('Email is required', 400);

    const cleanEmail = email.toLowerCase().trim();

    // Cooldown: prevent spam — 60s between OTPs for same email
    const recent = await query(
        `SELECT created_at FROM otp_codes WHERE email = $1 AND created_at > NOW() - INTERVAL '60 seconds' LIMIT 1`,
        [cleanEmail]
    );
    if (recent.rows.length > 0) {
        const waitSec = Math.ceil(60 - (Date.now() - new Date(recent.rows[0].created_at).getTime()) / 1000);
        throw createError(`Please wait ${waitSec}s before requesting another OTP`, 429);
    }

    // Invalidate previous unused OTPs
    await query(`UPDATE otp_codes SET is_used = TRUE WHERE email = $1 AND is_used = FALSE`, [cleanEmail]);

    // Generate + store
    const otp = generateOTP();
    await query(
        `INSERT INTO otp_codes (email, code, expires_at) VALUES ($1, $2, NOW() + INTERVAL '5 minutes')`,
        [cleanEmail, otp]
    );

    // Send email
    await sendOTP(cleanEmail, otp);

    res.json({ success: true, message: 'OTP sent to your email' });
});

/**
 * POST /api/auth/verify-otp
 * Verify the OTP, auto-create user if first login, return JWT
 */
const verifyOtp = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) throw createError('Email and OTP are required', 400);

    const cleanEmail = email.toLowerCase().trim();

    // Find the valid, unused OTP
    const { rows: otpRows } = await query(
        `SELECT id FROM otp_codes
         WHERE email = $1 AND code = $2 AND is_used = FALSE AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [cleanEmail, otp]
    );

    if (otpRows.length === 0) {
        throw createError('Invalid or expired OTP', 401);
    }

    // Mark OTP as used
    await query(`UPDATE otp_codes SET is_used = TRUE WHERE id = $1`, [otpRows[0].id]);

    // Find or create user
    let { rows: userRows } = await query(
        `SELECT u.*, sp.name AS plan_name FROM users u
         LEFT JOIN subscription_plans sp ON sp.id = u.subscription_plan_id
         WHERE u.email = $1`, [cleanEmail]
    );

    let user;
    if (userRows.length === 0) {
        // Auto-create user on first OTP login
        const planResult = await query(`SELECT id FROM subscription_plans WHERE name = 'Basic' LIMIT 1`);
        const planId = planResult.rows[0]?.id || null;
        const newName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        const { rows: created } = await query(
            `INSERT INTO users (id, email, full_name, subscription_plan_id, subscription_start, subscription_end, email_verified)
             VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '1 month', TRUE)
             RETURNING id, email, full_name, is_admin, subscription_plan_id, created_at`,
            [uuidv4(), cleanEmail, newName, planId]
        );
        user = created[0];
        user.plan_name = 'Basic';

        // Create default profile
        await query(
            `INSERT INTO profiles (id, user_id, name, avatar_url) VALUES ($1, $2, $3, $4)`,
            [uuidv4(), user.id, newName.split(' ')[0], `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`]
        );
    } else {
        user = userRows[0];
        await query('UPDATE users SET last_login = NOW(), email_verified = TRUE WHERE id = $1', [user.id]);
    }

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

module.exports = { register, login, getProfile, getProfiles, sendOtp, verifyOtp };
