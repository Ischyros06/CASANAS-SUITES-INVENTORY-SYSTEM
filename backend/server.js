// Initialization
const express = require("express");
const app = express();
const mongoose=require("mongoose");
const path = require("path");
const hbs = require("hbs");
const methodOverride = require('method-override');
const cookieParser = require("cookie-parser"); //package for making a cookie
const fs = require('fs'); //required for data backup
const open = require('opn');

// Import environment variables
const env = require('dotenv').config({path: path.resolve(__dirname, './.env')});

// Twilio setup API
const client = require("twilio")(process.env.TWILIO_SID, process.env.TWILIO_AUTH); // Twilio API (SMS notif)

// Define paths
const templatePath = path.join(__dirname, './../frontend/templates');
const picsPath = path.join(__dirname, './../frontend/pics');
const itemPics = path.join(__dirname, './../frontend/uploads');
const public = path.join(__dirname, './../frontend/public');

// Import Middleware
const { systemAdminAuth ,adminAuth, userAuth, checkAcc } = require('./routes/authMiddleware'); // importing authMiddleware.js file
const { Collection } = require("mongoose");
const { Console } = require("console");
const { connectToMongoDB } = require('../backend/controllers/mongoConnect');

// Import the collections from the database
const { itemCollection } = require("../backend/models/ItemCollectionModel"); 
const { reportCollection } = require('../backend/models/ReportCollectionModel');
const { userCollection } = require('../backend/models/UserLoginModel');
const { submittedReports } = require('../backend/models/SubmittedReportsModel');
const { changeLog } = require('../backend/models/ChangeLogModel');

// Setup middleware
app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(express.static(picsPath));
app.use(express.static(public)); //to activate CSS on public folder
app.use(cookieParser());
app.use(methodOverride('_method'));
app.set("view engine", "hbs")
app.set("views", templatePath)
app.use(express.static(itemPics)); // Serve static files from the "uploads" directory

// Define Routes
app.get('*', checkAcc); //apply to all
app.get("/",(req, res)=> { res.redirect("home") }); //default path of the web
app.get("/home",(req, res)=> { res.render("home") });
app.get("/chooseRole",(req, res)=> { res.render("chooseRole") });
app.get("/systemAdminSignup",(req, res)=> { res.render("systemAdminSignup") });
app.get("/adminSignup",(req, res)=> { res.render("adminSignup") });
app.get("/userSignup",(req, res)=> { res.render("userSignup") });
app.get("/login", (req, res) => { res.render("login") });
app.get('/authenticateAcc', (req, res) => { res.render('authenticateAcc')});
app.get('/resetPass', (req, res) => {
    const accountName = req.query.account; // Assuming you're passing account data in the query string
    res.render('resetPass', { accountName });
});
app.get('/goHomeAdmin', adminAuth, async(req, res)=>{ res.redirect('adminHome') });
app.get('/goHomeUser', userAuth, async(req, res)=>{ res.redirect('userHome') });
app.get('/aboutAdmin', adminAuth, async(req, res)=>{ res.render('aboutAdmin') });
app.get('/aboutUser', userAuth, async(req, res)=>{ res.render('aboutUser') });
app.get('/contactAdmin', adminAuth, async(req, res)=>{ res.render('contactAdmin')});
app.get('/contactUser', userAuth, async(req, res)=>{ res.render('contactUser')});

// Import and use routes
const systemAdminHomeRoutes = require('./routes/systemAdminHomes');
const adminHomeRoutes = require('./routes/adminHomes');
const userHomeRoutes = require('./routes/userHomes');
const statusRoutes = require('./routes/statuses');
const reportRoutes = require('./routes/reports');
const reportUserRoutes = require('./routes/reportsUser');
const needToBuyRoutes = require('./routes/needToBuy');
const dailyReportRoutes = require('./routes/dailyReports');
const systemAdminSignupRoutes = require('./routes/systemAdminSignups');
const adminSignupRoutes = require('./routes/adminSignups');
const userSignupRoutes = require('./routes/userSignups');
const loginRoutes = require('./routes/logins');
const changeLogRoutes = require('./routes/changeLogs');
const authAccRoutes = require('./routes/authenticateAcc');
const resetPassRoutes = require('./routes/resetPass');

app.use('/systemAdminHome', systemAdminAuth, systemAdminHomeRoutes);
app.use('/adminHome', adminAuth, adminHomeRoutes);
app.use('/userHome', userAuth, userHomeRoutes);
app.use('/status', adminAuth, statusRoutes);
app.use('/report', adminAuth, reportRoutes);
app.use('/reportView', userAuth, reportUserRoutes);
app.use('/needToBuy', adminAuth, needToBuyRoutes);
app.use('/changeLog', adminAuth, changeLogRoutes);
app.use('/dailyReport', userAuth, dailyReportRoutes);
app.use('/systemAdminSignup', systemAdminSignupRoutes);
app.use('/adminSignup', adminSignupRoutes);
app.use('/userSignup', userSignupRoutes);
app.use('/login', loginRoutes);
app.use('/authenticateAcc', authAccRoutes);
app.use('/resetPass', resetPassRoutes);

// Route to get near-depletion items inside the frontend
app.get('/getNearDepletionItems', async (req, res) => {
    try {
        // Fetch items from the database based on unit and quantity criteria
        const nearDepletionItems = await itemCollection.find({
            $or: [
                // Items with unit 'pieces' and quantity less than 3
                { unit: 'pieces', quantity: { $lt: 3 } },
                // Items with unit 'milliliters' and quantity less than 250
                { unit: 'milliliters', quantity: { $lt: 250 } },
                // Items with unit 'grams' and quantity less than 250
                { unit: 'grams', quantity: { $lt: 250 } }
            ]
        });

         // Send SMS notification if there are items near depletion
        if (nearDepletionItems.length > 0) {
            sendTextMessage(nearDepletionItems); // Call the function to send SMS notification
        }

        res.json(nearDepletionItems);
    } catch (error) {
        console.error(`Error fetching near-depletion items: ${error}`);
        res.status(500).json({ error: 'An error occurred while fetching near-depletion items' });
    }
});

app.get('/logout', async(req, res) => {
    res.cookie('jwt', '', { maxAge: 1 }); //deleting the jwt token
    res.cookie('jwtUser', '', { maxAge: 1 }); //deleting the jwt token

     // Set cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.redirect('/'); //going back to home
});

app.get('/userLogout', userAuth, async (req, res) => {
    try {
        // Retrieve the user ID from the req.user object populated by userAuthMiddleware
        const userId = req.user.id;

        // Fetch the user from the database based on the userId
        const user = await userCollection.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        const userName = user.name;  // Get user's name from the database

        // Extract the report data from the collection
        const reportData = await reportCollection.find({ userId: userId });

        // If report data exists, extract only the productAccessed array
        if (reportData && reportData.length > 0) {
            const productAccessedData = reportData.map(report => report.productAccessed).flat();

            // Get current date to ensure report is upserted for today's date
            const currentDate = new Date().setHours(0, 0, 0, 0);

            // Check if a report already exists for the current date
            let report = await submittedReports.findOneAndUpdate(
                {
                    userId: userId,
                    createdAt: { $gte: new Date(currentDate), $lt: new Date(new Date(currentDate).setDate(new Date(currentDate).getDate() + 1)) }
                },
                { $setOnInsert: { userId: userId, userName: userName } },
                { upsert: true, new: true }
            );

            if (!report) {
                report = { reportData: [] };
            }

            // Loop through the productAccessedData and update reportData accordingly
            for (const item of productAccessedData) {
                // Check if productId already exists in the report
                const existingItem = report.reportData.find(data => data.productId === item.productId);
                if (existingItem) {
                    // If it exists, increment the quantitySubtracted
                    existingItem.quantitySubtracted += item.quantitySubtracted;
                } else {
                    // If it doesn't exist, push the new item into reportData
                    report.reportData.push(item);
                }
            }

            // Save the updated report back to the database
            await submittedReports.updateOne(
                { userId: userId, createdAt: { $gte: new Date(currentDate), $lt: new Date(new Date(currentDate).setDate(new Date(currentDate).getDate() + 1)) } },
                { $set: { reportData: report.reportData } }
            );

            // Log the report submission
            const existingLog = await changeLog.findOne({
                userName,
                action: 'sent',
                createdAt: { $gte: new Date(new Date() - 5 * 1000) } // Check if createdAt is within the last 5 seconds
            });

            if (existingLog) {
                // If an existing log entry exists within the last 5 seconds, update the count
                await changeLog.updateOne({ _id: existingLog._id }, { $inc: { count: 1 } });
            } else {
                // Create a new log entry
                await changeLog.create({
                    userName,
                    role: 'user', // Set role to 'user'
                    action: 'sent',
                    createdAt: new Date() // Set the current date
                });
            }

            // Clear the report data from the temporary reportCollection after submission
            await reportCollection.deleteOne({ userId: userId });

            console.log('Report sent successfully for user:', userName);
        }

        // Clear cookies after sending the report
        res.cookie('jwt', '', { maxAge: 1 }); // Deleting the JWT token
        res.cookie('jwtUser', '', { maxAge: 1 }); // Deleting the user token
        res.cookie('jwtSystemAdmin', '', { maxAge: 1 });

        // Set cache control headers to prevent caching
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Redirect to the home page after logout
        res.redirect('/');
    } catch (error) {
        console.error('Error during logout and report submission:', error);
        res.status(500).send('Error during logout and report submission');
    }
});

// async function to start the server and perform other setup tasks
async function startServer() {
    // Start the MongoDB connection
    await connectToMongoDB();

    // Start the server
    app.listen(process.env.PORT, '0.0.0.0', function() {
        console.log('Server listening on port', process.env.PORT);
    });
}

// Call the startServer function to begin the setup process
startServer();

/*
function using twilio.api for sms notification
*/
function sendTextMessage(nearDepletionItems){
    // Extract the product names from near-depletion items
    const productNotif = nearDepletionItems.map(item => `${item.product}: ${item.quantity}/${item.maxQuantity} ${item.unit}`).join(',\n');

    const messageBody = `Items near depletion: \n ${productNotif}`;

    client.messages
    .create({
        body: messageBody,
        to: process.env.TWILIO_RECEIVER,
        from: process.env.TWILIO_SENDER,
    })
    .then((message) => console.log(message))
    .catch((error) => {
        // You can implement your fallback code here
        console.log(error);
    });
    
};