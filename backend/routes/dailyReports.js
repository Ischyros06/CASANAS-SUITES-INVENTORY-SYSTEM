const express = require('express');
const { userAuth } = require('./authMiddleware');
const dailyReportController = require('../controllers/dailyReportController');

const router = express.Router();

router.get('/', userAuth, dailyReportController.getDailyReport);
router.post('/sendReport', userAuth, dailyReportController.sendReport);

module.exports = router;
