const { reportCollection } = require("../models/ReportCollectionModel");
const { changeLog } = require("../models/ChangeLogModel");
const { submittedReports } = require("../models/SubmittedReportsModel");
const mongoose = require('mongoose');
const path = require('path');
const axios = require('axios'); //For IP add
const fs = require('fs');

const connectToMongoDB = async () => {
    try {
        // First, attempt to connect to MongoDB Atlas
        await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
        console.log('MongoDB Atlas connected');
        deleteChangeLogsOldData();
        scheduleSendOldDataEvery12Hours();
    } catch (atlasErr) {
        console.error('Failed to connect to MongoDB Atlas:', atlasErr);
        // If Atlas connection fails, attempt to connect to the local MongoDB instance
        try {
            await mongoose.connect(process.env.MONGO_LOCAL, { useNewUrlParser: true, useUnifiedTopology: true })
            console.log('Local MongoDB connected');
            deleteChangeLogsOldData();
            scheduleSendOldDataEvery12Hours();
        } catch (localErr) {
            console.error('Failed to connect to local MongoDB:', localErr);
        }
    }
};

// Function to move old data from reportCollection to submittedReports
const sendOldData = async () => {
    try {
        const now = new Date();

        // Fetch old data from reportCollection before the current time
        const oldReports = await reportCollection.find({ createdAt: { $lt: now } });

        if (!oldReports.length) {
            console.log('No old reports to move.');
            return;
        }

        // Iterate through the old reports and insert them into submittedReports
        for (const report of oldReports) {
            const { userId, userName, productAccessed: reportData, createdAt } = report;

            console.log(`Processing report for user: ${userName}, createdAt: ${createdAt}`);

            // Find existing report for the same user and the same day
            let submittedReport = await submittedReports.findOne({
                userId: userId,
                createdAt: {
                    $gte: new Date(createdAt).setHours(0, 0, 0, 0), 
                    $lt: new Date(createdAt).setHours(23, 59, 59, 999)
                }
            });

            if (!submittedReport) {
                console.log('No submittedReport found, creating a new one.');

                // Create a new report if it doesn't exist
                submittedReport = new submittedReports({
                    userId: userId,
                    userName: userName,
                    reportData: [],
                    createdAt: createdAt
                });
            }

            // Update or add products in submittedReports
            for (const item of reportData) {
                console.log(`Processing product: ${item.product}, quantity: ${item.quantitySubtracted}`);

                const existingItem = submittedReport.reportData.find(data => data.product === item.product);
                if (existingItem) {
                    console.log(`Product ${item.product} exists. Incrementing quantity.`);
                    existingItem.quantitySubtracted += item.quantitySubtracted;
                } else {
                    console.log(`Product ${item.product} does not exist. Adding to reportData.`);
                    submittedReport.reportData.push(item);
                }
            }

            // Save the updated or new submittedReport
            await submittedReport.save();
            console.log(`SubmittedReport saved for user: ${userName}`);
        }

        // Delete old data from reportCollection
        await reportCollection.deleteMany({ createdAt: { $lt: now } });
        console.log("Old data from reportCollection moved to submittedReports and deleted successfully.");

    } catch (error) {
        console.error('Error moving and deleting old data:', error);
    }
};

// Function to schedule the sending of reports every 1 hour
const scheduleSendOldDataEvery12Hours = () => {
    // Call sendOldData immediately and then set it to repeat every 5 minutes
    sendOldData(); // Initial call for immediate testing
    setInterval(sendOldData, 12 * 60 * 60 * 1000); // Call sendOldData every 43,200,000 ms (12 hours)
};

// Call the function to schedule sendOldData every 5 minutes
scheduleSendOldDataEvery12Hours();

// Function to delete old data from changeLogs collection
const deleteChangeLogsOldData = async () => {
    try {
        // Get the current date
        const today = new Date();
        
        // Calculate the date one year ago
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(today.getFullYear() - 1);

        // Find and delete documents created before one year ago
        await changeLog.deleteMany({ createdAt: { $lt: oneYearAgo } });
        
        console.log('Old data from changeLogs collection deleted successfully');
    } catch (error) {
        console.error('Error deleting old data from changeLogs collection:', error);
    }
};

module.exports = { connectToMongoDB };