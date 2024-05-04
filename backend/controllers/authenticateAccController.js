const { adminLogInRequests } = require('../models/AdminLoginModel');
const { userCollection } = require('../models/UserLoginModel');

const compareAnswers = (storedAnswers, providedAnswers) => {
    let correctAnswerCount = 0;

    for (let i = 1; i <= 3; i++) {
        if (storedAnswers[`question${i}`] === providedAnswers[`question${i}`]) {
            correctAnswerCount++;
        }
    }

    return correctAnswerCount;
};

const resetPassAuth = async (req, res) => {
    const { name, question1, question2, question3 } = req.body;

    try {
        let account = await adminLogInRequests.findOne({ name });
        if (!account) {
            account = await userCollection.findOne({ name });
            if (!account) {
                // Respond with a 401 status code and an error message
                return res.status(400).json({ error: "This username does not exist." });
            }
        }

        const correctAnswerCount = compareAnswers(account, req.body);

        if (correctAnswerCount >= 2) {
            res.status(200).json({ account });
        } else {
            res.status(401).json({ error: "Authentication failed. Please provide correct answers to at least 2 out of 3 security questions." });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = { resetPassAuth };