const { adminLogInRequests } = require('../models/AdminLoginModel');
const { userCollection } = require('../models/UserLoginModel');
const { systemAdminAccounts } = require('../models/SystemAdminLoginModel');

// Function to fetch items and render admin home page
const renderSystemAdminHome = async (req, res) => {
    try {
        const system_AdminAccounts = await systemAdminAccounts.find({}, { name: 1, _id: 1, role: 1, isApproved: 1, question1: 1, answer1: 1, question2: 1, answer2: 1, question3: 1, answer3: 1 }).sort({ name: 1 });
        const adminAccounts = await adminLogInRequests.find({}, { name: 1, _id: 1, role: 1, isApproved: 1, question1: 1, answer1: 1, question2: 1, answer2: 1, question3: 1, answer3: 1 }).sort({ name: 1 });
        const userAccounts = await userCollection.find({}, { name: 1, _id: 1, role: 1, isApproved: 1, question1: 1, answer1: 1, question2: 1, answer2: 1, question3: 1, answer3: 1 }).sort({ name: 1 });
        const accountCount = adminAccounts.length + system_AdminAccounts.length + userAccounts.length;
        res.render("systemAdminHome", { systemAdminAccounts: system_AdminAccounts ,adminLogInRequests: adminAccounts, userCollection: userAccounts, accountCount });
    } catch (error) {
        console.error("Error fetching items:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Function to update approval status
const updateApprovalStatus = async (req, res) => {
    const { id, isApproved } = req.body;

    try {
        await systemAdminAccounts.updateOne({ _id: id }, { isApproved });
        await adminLogInRequests.updateOne({ _id: id }, { isApproved });
        await userCollection.updateOne({ _id: id }, { isApproved });
        res.status(200).send({ success: true });
    } catch (error) {
        console.error('Error updating approval status:', error);
        res.status(500).send({ success: false });
    }
};

// Function to delete an account
const deleteAccount = async (req, res) => {
    const { id } = req.body;

    try {
        // Try deleting the account from each collection
        const deletedSystemAdmin = await systemAdminAccounts.findByIdAndDelete(id);
        const deletedAdmin = await adminLogInRequests.findByIdAndDelete(id);
        const deletedUser = await userCollection.findByIdAndDelete(id);

        if (deletedSystemAdmin || deletedAdmin || deletedUser) {
            res.status(200).send({ success: true });
        } else {
            res.status(404).send({ success: false, message: "Account not found" });
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).send({ success: false });
    }
};

module.exports = {
    renderSystemAdminHome,
    updateApprovalStatus,
    deleteAccount,
};