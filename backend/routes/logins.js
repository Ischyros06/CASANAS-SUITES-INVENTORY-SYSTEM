const express = require('express');
const path = require("path");
const env = require('dotenv').config({path: path.resolve(__dirname, '../.env')}); // Import environment variables
const router = express.Router();
const { loginSystemAdmin ,loginAdmin, loginUser } = require('../controllers/loginController');
const { adminLogInRequests } = require('../models/AdminLoginModel');
const { userCollection } = require('../models/UserLoginModel');
const { systemAdminAccounts } = require('../models/SystemAdminLoginModel');

const maxAge = 3 * 24 * 60 * 60; //jwt timer for expiration -- 3 days

//Login page route
router.post('/', async(req, res) => {
    const {name, password} = req.body;
    const admin = await adminLogInRequests.findOne({ name });
    const user = await userCollection.findOne({ name });
    const system_admin =  await systemAdminAccounts.findOne({ name });

    try {
        if(system_admin){
            const { systemAdminId, role, token } = await loginSystemAdmin(name, password, res);
            res.cookie('jwtSystemAdmin', token, { httpOnly: true, maxAge: maxAge * 1000 });
            res.status(200).json({ systemAdmin: systemAdminId, role: role });
        } else if (admin){
            const { adminId, role, token } = await loginAdmin(name, password, res);
            res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
            res.status(200).json({ admin: adminId, role: role });
        } else if (user) {
            const { userId, role, token } = await loginUser(name, password);
            res.cookie('jwtUser', token, { httpOnly: true, maxAge: maxAge * 1000 });
            res.status(200).json({ user: userId , role: role});
        } else {
            throw new Error("This username does not exist.");
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
