const express = require('express');
const router = express.Router();
const {
    getContinueWatching, updateWatchHistory, getWatchHistory,
    getWatchlist, addToWatchlist, removeFromWatchlist,
    rateContent, getUserRating,
    addReview,
    getNotifications, markNotificationsRead,
    updateProfile, changePassword,
} = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

// All user routes require authentication
router.use(authenticate);

// Watch history
router.get('/continue-watching',  getContinueWatching);
router.post('/watch-history',     updateWatchHistory);
router.get('/watch-history',      getWatchHistory);

// Watchlist
router.get('/watchlist',                    getWatchlist);
router.post('/watchlist',                   addToWatchlist);
router.delete('/watchlist/:contentId',      removeFromWatchlist);

// Ratings
router.post('/ratings',                     rateContent);
router.get('/ratings/:contentId',           getUserRating);

// Reviews
router.post('/reviews',                     addReview);

// Profile management
router.put('/profile',                      updateProfile);
router.post('/change-password',             changePassword);

// Notifications
router.get('/notifications',                getNotifications);
router.put('/notifications/read',           markNotificationsRead);

module.exports = router;
