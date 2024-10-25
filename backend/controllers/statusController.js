//define collections
const { reportCollection } = require('../models/ReportCollectionModel');
const { adminLogInRequests } = require('../models/AdminLoginModel');
const { changeLog } = require('../models/ChangeLogModel');
const { submittedReports } = require('../models/SubmittedReportsModel');
const { userCollection } = require('../models/UserLoginModel');
const { itemCollection } = require('../models/ItemCollectionModel');
const { spawn } = require('child_process');
const mongoose = require('mongoose');

const multer = require("multer");
const path = require('path');
const fs = require('fs'); //required for data backup

const itemPics = path.join(__dirname, '../../frontend/uploads');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: itemPics,
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

//Format the date of the database and not include the GMT
const formatDate = (date) => {
    const formattedDate = new Date(date).toString().split('GMT')[0].trim();
    return formattedDate;
};

const getAllItems = async () => {
    const items = await itemCollection.find().sort({ product: 1 });
    return items.map(item => ({
        ...item._doc,
        createdAt: formatDate(item.createdAt),
        updatedAt: formatDate(item.updatedAt),
    }));
};

const createItem = async (reqBody, file) => {
    const fileUrl = `${file.filename}`;
    const newItem = {
        product: reqBody.product,
        quantity: reqBody.quantity,
        maxQuantity: reqBody.maxQuantity,
        unit: reqBody.unit,
        category: reqBody.category,
        picture: fileUrl,
    };
    return await itemCollection.create(newItem);
};

const getItemById = async (itemId) => {
    return await itemCollection.findById(itemId);
};

const updateItem = async (itemId, updateData) => {
    return await itemCollection.findByIdAndUpdate(itemId, updateData);
};

// Backup function
//NEW CODE USING EXPRESS
const backup = async (backupFolder) => {
    try {
        // Array of collections to transfer
        const collections = [
            { name: 'adminloginrequests', model: adminLogInRequests },
            { name: 'changelogs', model: changeLog },
            { name: 'itemcollections', model: itemCollection },
            { name: 'reportcollections', model: reportCollection },
            { name: 'submittedreports', model: submittedReports },
            { name: 'userlogincollections', model: userCollection }
            // Add other collections here
        ];

        // Get the path to the backup folder
        const desktopPath = path.join(backupFolder, 'data_backup');

        // Check if the specified backup folder exists
        if (!fs.existsSync(desktopPath)) {
            console.log("Creating 'data_backup' folder on the desktop.");
            fs.mkdirSync(desktopPath);
        }

        // Iterate over each collection
        for (const { name, model } of collections) {
            const data = await model.find({}).maxTimeMS(10000);
            const filePath = path.join(desktopPath, `${name}.json`);

            // Check if the file exists
            if (fs.existsSync(filePath)) {
                const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                // Check if there are changes in the data
                if (JSON.stringify(data) !== JSON.stringify(existingData)) {
                    // Write updated data to the backup file
                    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                    console.log(`Backup of collection '${name}' completed successfully.`);
                } else {
                    console.log(`No changes detected in collection '${name}', skipping backup.`);
                }
            } else {
                // Create a new file and write data to it
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                console.log(`New backup file created for collection '${name}'.`);
            }
        }

        console.log('Backup completed successfully.');
    } catch (error) {
        console.error('Backup failed:', error);
    }
};

// Import data from JSON files into which the MongoDB is connected (Atlas or local)
const importDataToMongoDB = async (backupFolder) => {
    try {
        const backupDirectory = path.join(backupFolder, 'data_backup');
        const files = fs.readdirSync(backupDirectory);// checked the json files inside the data_backup folder
        
        // Iterate over each JSON file in the backup directory
        for (const file of files) {
            const filePath = path.join(backupDirectory, file); // Path ex Desktop\data_backup\adminloginrequests.json
            const collectionName = path.basename(file, '.json'); // path's basename  ex adminloginrequests.json
            const fileContent = fs.readFileSync(filePath, 'utf8');// the content't of the currently file on the loop ex the contents of adminloginrequests.json
            
            // Parse JSON data
            const data = JSON.parse(fileContent); // converting the string in the file into JSON file

            // Check if the data array is empty
            if (Array.isArray(data) && data.length === 0) {
                console.log(`Skipping import for collection '${collectionName}' as the file contains no data.`);
                continue; // Skip to the next iteration if the data array is empty
            }

            // Iterate over each document in the transformed data
            const transformedData = data.map(doc => {
                // Convert _id and date fields back to correct types
                const transformedDoc = {
                    ...doc,
                    _id: new mongoose.Types.ObjectId(doc._id)
                };

                // Convert createdAt and updatedAt fields to Date objects
                if (doc.createdAt && !isNaN(Date.parse(doc.createdAt))) {
                    transformedDoc.createdAt = new Date(doc.createdAt);
                }

                if (doc.updatedAt && !isNaN(Date.parse(doc.updatedAt))) {
                    transformedDoc.updatedAt = new Date(doc.updatedAt);
                }

                // Convert userId to ObjectId if present
                if (doc.userId) {
                    transformedDoc.userId = new mongoose.Types.ObjectId(doc.userId);
                }

                return transformedDoc;
            });

            // Iterate over each transformed document
            for (const doc of transformedData) {
                // Check if a document with the same _id already exists in the collection
                const existingDoc = await mongoose.connection.db.collection(collectionName).findOne({ _id: doc._id });

                if (existingDoc) {
                    // Document with the same _id exists, check if the data is different
                    if (JSON.stringify(existingDoc) !== JSON.stringify(doc)) {
                        // Data is different, update the existing document
                        await mongoose.connection.db.collection(collectionName).updateOne({ _id: doc._id }, { $set: doc });
                        console.log(`Document with _id '${doc._id}' updated in collection '${collectionName}'.`);
                    } else {
                        // Data is the same, skip insertion
                        console.log(`Document with _id '${doc._id}' already exists in collection '${collectionName}', skipping insertion.`);
                    }
                } else {
                    // Document with _id does not exist, insert it into the collection
                    await mongoose.connection.db.collection(collectionName).insertOne(doc);
                    console.log(`Document with _id '${doc._id}' inserted into collection '${collectionName}'.`);
                }
            }
        }

        console.log('Data import completed successfully.');
    } catch (error) {
        console.error('Data import failed:', error);
    }
};

const deleteItem = async (itemId) => {
    return await itemCollection.findByIdAndDelete(itemId);
};

module.exports = {  
    getAllItems, 
    createItem,
    getItemById, 
    updateItem, 
    upload, 
    backup,
    importDataToMongoDB,
    deleteItem
};
