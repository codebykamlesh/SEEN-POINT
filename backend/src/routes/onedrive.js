const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const onedriveService = require('../services/onedrive');
const { asyncHandler, createError } = require('../middleware/errorHandler');

/**
 * GET /api/onedrive/auth
 * Redirects to the Microsoft OAuth Flow
 */
router.get('/auth', [authenticate, requireAdmin], asyncHandler(async (req, res) => {
    const authUrl = await onedriveService.getAuthUrl();
    res.json({ success: true, authUrl });
}));

/**
 * GET /api/onedrive/callback
 * Microsoft OAuth Callback
 */
router.get('/callback', asyncHandler(async (req, res) => {
    const { code, state, error, error_description } = req.query;
    if (error) {
        console.error('OneDrive auth error:', error_description);
        return res.status(400).send(`Authentication failed: ${error_description}`);
    }
    
    if (!code) {
        return res.status(400).send('No authorization code provided');
    }

    try {
        await onedriveService.handleCallback(code);
        res.send('OneDrive successfully connected! You can close this window and return to the SEEN POINT admin panel.');
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to complete OneDrive connection: ' + err.message);
    }
}));

/**
 * GET /api/onedrive/files
 * List files in root or specific folder
 */
router.get('/files', [authenticate, requireAdmin], asyncHandler(async (req, res) => {
    const { folderId } = req.query;
    try {
        const files = await onedriveService.listFiles(folderId || 'root');
        res.json({ success: true, data: files });
    } catch (err) {
        throw createError(err.message, 500);
    }
}));

/**
 * GET /api/onedrive/stream/:fileId
 * Redirects to the actual OneDrive download URL suitable for HTML5 video player
 */
router.get('/stream/:fileId', asyncHandler(async (req, res) => {
    const { fileId } = req.params;
    try {
        const streamUrl = await onedriveService.getStreamUrl(fileId);
        // We 302 redirect directly to the stream URL so the browser plays it natively
        res.redirect(302, streamUrl);
    } catch (err) {
        throw createError(err.message, 404);
    }
}));

/**
 * GET /api/onedrive/status
 * Check if OneDrive is connected
 */
router.get('/status', [authenticate, requireAdmin], asyncHandler(async (req, res) => {
    try {
        const status = onedriveService.getConnectionStatus();
        res.json(status);
    } catch {
        res.json({ connected: false });
    }
}));

module.exports = router;
