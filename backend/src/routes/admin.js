const express = require('express');
const router = express.Router();
const {
    getAnalytics, adminGetContent, createContent, updateContent,
    deleteContent, getUsers, refreshMaterializedViews,
} = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All admin routes require authentication AND admin role
router.use(authenticate, requireAdmin);

router.get('/analytics',          getAnalytics);
router.get('/content',            adminGetContent);
router.post('/content',           createContent);
router.put('/content/:id',        updateContent);
router.delete('/content/:id',     deleteContent);
router.get('/users',              getUsers);
router.post('/refresh-views',     refreshMaterializedViews);

module.exports = router;
