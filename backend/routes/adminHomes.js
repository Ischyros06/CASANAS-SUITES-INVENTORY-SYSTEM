const express = require('express');
const adminHomeController = require('../controllers/adminHomeController');
const { adminAuth } = require('./authMiddleware');

const router = express.Router();

// Routes for admin home page
router.get('/', adminAuth, adminHomeController.renderAdminHome);
router.get('/getQuantity', adminAuth, adminHomeController.getQuantity);
router.get('/addQuantity', adminAuth, adminHomeController.addQuantity);

module.exports = router;
