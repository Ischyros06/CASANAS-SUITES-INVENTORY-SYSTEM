const jwt = require('jsonwebtoken');
const { userCollection} = require("../models/UserLoginModel"); 
const { adminLogInRequests } =  require('../models/AdminLoginModel');
const { systemAdminAccounts } = require('../models/SystemAdminLoginModel');

const systemAdminAuthMiddleware = (req, res, next) => {
    const token = req.cookies.jwtSystemAdmin;

    if(token){
        jwt.verify(token, process.env.SYSTEM_ADMIN_JWT, (err, decodedToken) =>{
            if(err){
                console.log(err.message);
                res.redirect('/login');
            }else{
                next();
            }
        })
    } else {
        res.redirect('/login');
    }
};

const adminAuthMiddleware = (req, res, next) => {
    const token = req.cookies.jwt;

    if(token){
        jwt.verify(token, process.env.ADMIN_JWT, (err, decodedToken) =>{
            if(err){
                console.log(err.message);
                res.redirect('/login');
            }else{
                next();
            }
        })
    } else {
        res.redirect('/login');
    }
};

const userAuthMiddleware =(req, res, next) => {
    const token = req.cookies.jwtUser;

    if(token){
        jwt.verify(token, process.env.USER_JWT, (err, decodedToken) =>{
            if(err){
                console.log(err.message);
                res.redirect('/login');
            }else{
                req.user = decodedToken;
                next();
            }
        })
    } else {
        res.redirect('/login');
    }
};

const checkAccountMiddleware = (req, res, next) => {
    const systemAdminToken = req.cookies.jwtSystemAdmin;
    const adminToken = req.cookies.jwt;
    const userToken = req.cookies.jwtUser;

    if(systemAdminToken){
        jwt.verify(systemAdminToken, process.env.SYSTEM_ADMIN_JWT, async (err, decodedToken) => {
            if (err) {
                console.log(err.message);
                res.locals.systemAdmin = null;
                next();
            } else {
                let systemAdmin = await systemAdminAccounts.findById(decodedToken.id);
                res.locals.systemAdmin = systemAdmin;
                next();
            }
        });
    } else if (adminToken) {
        jwt.verify(adminToken, process.env.ADMIN_JWT, async (err, decodedToken) => {
            if (err) {
                console.log(err.message);
                res.locals.admin = null;
                next();
            } else {
                let admin = await adminLogInRequests.findById(decodedToken.id);
                res.locals.admin = admin;
                next();
            }
        });
    } else if (userToken) {
        jwt.verify(userToken, process.env.USER_JWT, async (err, decodedToken) => {
            if (err) {
                console.log(err.message);
                res.locals.user = null;
                next();
            } else {
                let user = await userCollection.findById(decodedToken.id);
                res.locals.user = user;
                next();
            }
        });
    } else {
        res.locals.admin = null;
        res.locals.user = null;
        next();
    }
};

module.exports = { systemAdminAuthMiddleware, adminAuthMiddleware, userAuthMiddleware, checkAccountMiddleware };
