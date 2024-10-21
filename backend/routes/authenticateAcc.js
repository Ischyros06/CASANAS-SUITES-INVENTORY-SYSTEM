const express = require('express');
const router = express.Router();
const { fetchQuestions, resetPassAuth } = require('../controllers/authenticateAccController');

//Login page route
router.post('/', resetPassAuth);
router.post('/fetchQuestions', fetchQuestions);
//router.post('/authenticateAcc', resetPassAuth);

module.exports = router;
