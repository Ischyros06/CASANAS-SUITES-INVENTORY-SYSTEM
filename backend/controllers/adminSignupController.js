const { adminLogInRequests } = require('../models/AdminLoginModel');

// Function to check if username exists
const checkUsernameExists = async (name) => {
    const adminExists = await adminLogInRequests.findOne({ name });
    return adminExists;
};

// Function to handle admin account creation
const createAdminAccount = async (req, res) => {
    const { name, password, question1, answer1, question2, answer2, question3, answer3 } = req.body;

    try {
        const accExist = await checkUsernameExists(name);

        if (accExist) {
            res.status(400).json({ error: 'This username is already registered' });
        } else {
            const admin = await adminLogInRequests.create({ name, password, question1, answer1, question2, answer2, question3, answer3 });
            res.status(201).json({ admin: admin._id });
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
    createAdminAccount
};