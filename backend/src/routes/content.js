const express = require('express');
const router = express.Router();
const {
    getContent, searchContent, getTrending, getFeatured,
    getContentById, getEpisodes, getAllGenres
} = require('../controllers/contentController');
const { optionalAuthenticate } = require('../middleware/auth');

// Public routes (all with optional auth to detect logged-in users)
router.get('/',           optionalAuthenticate, getContent);
router.get('/search',     optionalAuthenticate, searchContent);
router.get('/trending',   optionalAuthenticate, getTrending);
router.get('/featured',   optionalAuthenticate, getFeatured);
router.get('/genres/all', getAllGenres);
router.get('/:id',        optionalAuthenticate, getContentById);
router.get('/:id/episodes', getEpisodes);

module.exports = router;
