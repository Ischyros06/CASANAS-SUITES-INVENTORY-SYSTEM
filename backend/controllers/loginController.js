const { adminLogInRequests } = require('../models/AdminLoginModel');
const { userCollection } = require('../models/UserLoginModel');
const { systemAdminAccounts } = require('../models/SystemAdminLoginModel');
const jwt = require("jsonwebtoken");

const maxAge = 3 * 24 * 60 * 60; //jwt timer for expiration -- 3 days

const createToken = (id, secret) => {
    return jwt.sign({ id }, secret, {
        expiresIn: maxAge
    });
};

const loginSystemAdmin = async (name, password) => {
    const systemAdmin = await systemAdminAccounts.findOne({ name });
    if (!systemAdmin.isApproved) {
        throw new Error("Your account is not approved yet. Please contact the master admin.");
    }
    const loginSuccess = await systemAdminAccounts.login(name, password);
    if (!loginSuccess) {
        throw new Error("Incorrect password.");
    }
    const token = createToken(systemAdmin._id, process.env.SYSTEM_ADMIN_JWT);
    return { systemAdminId: systemAdmin._id, role: systemAdmin.role, token };
};

const loginAdmin = async (name, password) => {
    const admin = await adminLogInRequests.findOne({ name });
    if (!admin.isApproved) {
        throw new Error("Your account is not approved yet. Please contact the master admin.");
    }
    const loginSuccess = await adminLogInRequests.login(name, password);
    if (!loginSuccess) {
        throw new Error("Incorrect password.");
    }
    const token = createToken(admin._id, process.env.ADMIN_JWT);
    return { adminId: admin._id, role: admin.role, token };
};

const loginUser = async (name, password) => {
    const user = await userCollection.findOne({ name });
    if (!user.isApproved){
        throw new Error("Your account is not approved yet. Please contact the master admin.");
    }
    const loginSuccess = await userCollection.login(name, password);
    if (!loginSuccess) {
        throw new Error("Incorrect password.");
    }
    const token = createToken(user._id, process.env.USER_JWT);
    return { userId: user._id, role: user.role, token };
};

module.exports = { loginSystemAdmin, loginAdmin, loginUser };
