const { submittedReports } = require('../models/SubmittedReportsModel');
const { reportCollection } = require('../models/ReportCollectionModel');
const { itemCollection } = require('../models/ItemCollectionModel');
const { changeLog } = require('../models/ChangeLogModel');

// Generate daily report dynamically based on user actions
const getDailyReport = async (req, res) => {
    const userId = req.user.id;

    try {
        const report = await reportCollection.findOne({ userId: userId });
        const reportData = report ? report.productAccessed : [];

        res.render('dailyReport', { reportData });
    } catch (error) {
        console.error(`Error fetching report data: ${error}`);
        res.status(500).json({ error: 'An error occurred while fetching report data' });
    }
};

//Handle sending the report
const sendReport = async (req, res) => {
    const userId = req.user.id;
    const userName = req.body.userName;
    const reportData = req.body.reportData; 

    try {
        if (!reportData || reportData.length === 0) {
            return res.status(400).send('Report data is empty');
        }

        const currentDate = new Date().toISOString().split('T')[0]; 
        let report = await submittedReports.findOneAndUpdate(
            { userId: userId, createdAt: { $gte: new Date(currentDate), $lt: new Date(new Date(currentDate).setDate(new Date(currentDate).getDate() + 1)) } },
            { $setOnInsert: { userId: userId, userName: userName }, $inc: {} },
            { upsert: true, new: true }
        );

        for (const item of reportData) {
            const existingItem = report.reportData.find(data => data.product === item.product);
            if (existingItem) {
                existingItem.quantitySubtracted += item.quantitySubtracted;
            } else {
                report.reportData.push(item);
            }
        }

        await report.save();

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

        await reportCollection.deleteOne({ userId: userId });

        // Send success response with status code 200 and success message
        res.status(200).json({ success: true, message: 'Report sent successfully' });
    } catch (error) {
        console.error(`Error sending report: ${error}`);
        // Send error response with status code 500 and error message
        res.status(500).json({ success: false, message: 'An error occurred while sending report' });
    }
};

module.exports = { getDailyReport, sendReport };
