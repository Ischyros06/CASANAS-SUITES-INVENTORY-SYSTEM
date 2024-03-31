// Initialization
const express = require("express");
const app = express();
const mongoose=require("mongoose");
const path = require("path");
const hbs = require("hbs");
const methodOverride = require('method-override');
const cookieParser = require("cookie-parser"); //package for making a cookie
//const mongodb = require('../models/mongodb.js');

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
const { adminAuth, userAuth, checkAcc } = require('./routes/authMiddleware'); // importing authMiddleware.js file
const { Collection } = require("mongoose");
const { Console } = require("console");

// Import the collections from the database
const { itemCollection } = require("./models/ItemCollectionModel"); 
const { reportCollection } = require('./models/ReportCollectionModel');

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
app.get("/adminSignup",(req, res)=> { res.render("adminSignup") });
app.get("/userSignup",(req, res)=> { res.render("userSignup") });
app.get("/login", (req, res) => { res.render("login") });
app.get('/goHomeAdmin', adminAuth, async(req, res)=>{ res.redirect('adminHome') });
app.get('/goHomeUser', userAuth, async(req, res)=>{ res.redirect('userHome') });

// Import and use routes
const adminHomeRoutes = require('./routes/adminHomes');
const userHomeRoutes = require('./routes/userHomes');
const statusRoutes = require('./routes/statuses');
const reportRoutes = require('./routes/reports');
const needToBuyRoutes = require('./routes/needToBuy');
const dailyReportRoutes = require('./routes/dailyReports');
const adminSignupRoutes = require('./routes/adminSignups');
const userSignupRoutes = require('./routes/userSignups');
const loginRoutes = require('./routes/logins');

app.use('/adminHome', adminAuth, adminHomeRoutes);
app.use('/userHome', userAuth, userHomeRoutes);
app.use('/status', adminAuth, statusRoutes);
app.use('/report', adminAuth, reportRoutes);
app.use('/needToBuy', adminAuth, needToBuyRoutes);
app.use('/dailyReport', userAuth, dailyReportRoutes);
app.use('/adminSignup', adminSignupRoutes);
app.use('/userSignup', userSignupRoutes);
app.use('/login', loginRoutes);

// Route to get near-depletion items inside the frontend
app.get('/getNearDepletionItems', async (req, res) => {
    try {
        // Fetch items from the database where the quantity is less than 10
        const nearDepletionItems = await itemCollection.find({ quantity: { $lt: 10 } });

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

/*
function using twilio.api for sms notification
*/
function sendTextMessage(nearDepletionItems){
    // Extract the product names from near-depletion items
    const productNotif = nearDepletionItems.map(item => `${item.product}: ${item.quantity}/${item.maxQuantity}`).join(',\n');

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
    
}

async function connectToMongoDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('MongoDB connected');
        // Call any initialization functions after the connection is established
        await deleteOldData();
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
    }
}

// Establish MongoDB connection
connectToMongoDB();


// Function to delete old data from report collection - ORIGINAL CODE
const deleteOldData = async () => {
    try {
        // Get the current date
        const today = new Date();
        
        // Find and delete documents created before today
        await reportCollection.deleteMany({ createdAt: { $lt: today.setHours(0, 0, 0, 0) } });
        
        console.log('Old data deleted successfully');
    } catch (error) {
        console.error('Error deleting old data:', error);
    }
};

// Start server
app.listen(process.env.PORT, function() {
    console.log('Server listening on port', process.env.PORT);
});