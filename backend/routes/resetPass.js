const express = require('express');
const { adminLogInRequests } = require('../models/AdminLoginModel');
const { userCollection } = require('../models/UserLoginModel');
const { systemAdminAccounts } = require('../models/SystemAdminLoginModel');

const router = express.Router();

// Admin Account Creation route
router.post('/', async (req, res) => {
    const { name, password } = req.body;

    try {
        let account;

        // Check if the name exists in admin collection
        account = await adminLogInRequests.findOne({ name });
        if (account) {
            // Update the password
            account.password = password;
            await account.save();
            return res.status(200).json({ success: true });
        }

        // Check if the name exists in user collection
        account = await userCollection.findOne({ name });
        if (account) {
            // Update the password
            account.password = password;
            await account.save();
            return res.status(200).json({ success: true });
        }

        // Check if the name exists in system admin collection
        account = await systemAdminAccounts.findOne({ name });
        if (account) {
            // Update the password
            account.password = password;
            await account.save();
            return res.status(200).json({ success: true });
        }

        // If the name doesn't exist in either collection
        return res.status(404).json({ success: false, error: "Account not found" });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;