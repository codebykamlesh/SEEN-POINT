const express = require('express');
const router = express.Router();
const { register, login, getProfile, getProfiles } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', register);
router.post('/login',    login);
router.get('/me',        authenticate, getProfile);
router.get('/profiles',  authenticate, getProfiles);

module.exports = router;
