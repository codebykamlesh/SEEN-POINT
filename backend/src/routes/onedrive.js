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
 * Proxies the OneDrive stream through the backend so HTML5 video playback
 * receives stable auth, range support, and explicit media headers.
 */
router.get('/stream/:fileId', authenticate, asyncHandler(async (req, res) => {
    const { fileId } = req.params;
    try {
        const stream = await onedriveService.getStreamMetadata(fileId);
        const rangeHeader = req.headers.range;
        const upstreamResponse = await fetch(stream.downloadUrl, {
            headers: rangeHeader ? { Range: rangeHeader } : {},
        });

        if (!upstreamResponse.ok || !upstreamResponse.body) {
            throw new Error(`Upstream stream request failed with status ${upstreamResponse.status}`);
        }

        res.status(upstreamResponse.status);
        res.setHeader('Content-Type', stream.mimeType || upstreamResponse.headers.get('content-type') || 'video/mp4');
        res.setHeader('Accept-Ranges', upstreamResponse.headers.get('accept-ranges') || 'bytes');
        res.setHeader('Cache-Control', 'private, max-age=300');

        const contentLength = upstreamResponse.headers.get('content-length');
        const contentRange = upstreamResponse.headers.get('content-range');
        if (contentLength) res.setHeader('Content-Length', contentLength);
        if (contentRange) res.setHeader('Content-Range', contentRange);
        if (stream.name) {
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(stream.name)}"`);
        }

        const nodeStream = require('stream');
        nodeStream.Readable.fromWeb(upstreamResponse.body).pipe(res);
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
