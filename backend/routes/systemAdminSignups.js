const express = require('express');
const systemAdminSignupController = require('../controllers/systemAdminSignupController');

const router = express.Router();

// System Admin Account Creation route
router.post('/', systemAdminSignupController.createSystemAdminAccount);

module.exports = router;