const express = require('express');
const systemAdminHomeController = require('../controllers/systemAdminHomeController');
const { systemAdminAuth } = require('./authMiddleware');

const router = express.Router();

// Routes for system admin home page
router.get('/', systemAdminAuth, systemAdminHomeController.renderSystemAdminHome);
router.post('/updateApprovalStatus', systemAdminAuth, systemAdminHomeController.updateApprovalStatus);

module.exports = router;