const { systemAdminAccounts } = require('../models/SystemAdminLoginModel');

// Function to check if username exists
const checkUsernameExists = async (name) => {
    const systemAdminExists = await systemAdminAccounts.findOne({ name });
    return systemAdminExists;
};

// Function to handle system admin account creation
const createSystemAdminAccount = async (req, res) => {
    const { name, password, question1, answer1, question2, answer2, question3, answer3 } = req.body;

    try {
        const accExist = await checkUsernameExists(name);

        if (accExist) {
            res.status(400).json({ error: 'This username is already registered' });
        } else {
            const systemAdmin = await systemAdminAccounts.create({ name, password, question1, answer1, question2, answer2, question3, answer3 });
            res.status(201).json({ systemAdmin: systemAdmin._id });
        }
    } catch (error) {
        console.error(error);
        if (error.code === 11000) { // 11000 = error.code for unique
            res.status(400).json({ error: 'This username is already registered' });
        } else if (error.name === 'ValidationError') {
            // Extract the specific validation error message
            const validationError = Object.values(error.errors)[0].message;
            res.status(400).json({ error: validationError });
        } else {
            res.status(400).send({ error: error.message });
        }
    }
};

module.exports = {
    checkUsernameExists,
    createSystemAdminAccount
};