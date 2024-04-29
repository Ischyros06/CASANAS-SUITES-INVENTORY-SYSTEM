const express = require('express');
const { adminAuth } = require('./authMiddleware');
const { changeLog } = require('../models/ChangeLogModel');
const { getAllItems, createItem, getItemById, updateItem, upload, backup, importDataToMongoDB } = require('../controllers/statusController');
const { itemCollection } = require('../models/ItemCollectionModel');
const path = require('path');

const router = express.Router();

//Showcase all the data in the Database
router.get('/', adminAuth, async (req, res) => {
    try {
        const items = await getAllItems();
        const itemCount = items.length;
        res.render("status", { itemCollection: items, itemCount });
    } catch (error) {
        console.log(error.message);
        res.status(500).send({ message: error.message });
    }
});

//Router for create item page
router.get('/createItem', adminAuth, async(req, res) => {
    const errorMessage = req.query.errorMessage;
    const successMessage = req.query.successMessage;
    res.render("createItem", { errorMessage, successMessage });
});

//Route for submitting the created item
router.post('/submitItem', upload.single('picture'), adminAuth, async (req, res) => {
    try {
        if (!req.body.product || !req.body.quantity || !req.body.maxQuantity || !req.body.unit) {
            const errorMessage = encodeURIComponent('Send all required fields: product, quantity, max quantity, unit');
            return res.redirect(`/status/createItem/?errorMessage=${errorMessage}`);
        }

        const existingItem = await itemCollection.findOne({ product: req.body.product });
        if(existingItem){
            return res.status(404).render('createItem', {
                errorMessage: 'The product name already exist'
            });
        }

        const newItem = await createItem(req.body, req.file);

        // Check if there's an existing log entry within the last 5 seconds with the same userName and product
        const existingLog = await changeLog.findOne({
            userName: req.body.userName,
            product: req.body.product,
            action: 'created',
            createdAt: { $gte: new Date(new Date() - 5 * 1000) } // Check if createdAt is within the last 5 seconds
        });

        if (existingLog) { 
            // If an existing log entry exists within the last 5 seconds, update the count
            await changeLog.updateOne({ _id: existingLog._id });
        } else {
            // Create a new log entry
            await changeLog.create({
                userName: req.body.userName,
                role: 'admin',
                action: 'created',
                product: req.body.product,
                maxLimit: req.body.maxQuantity, // Store maxQuantity in maxLimit
                createdAt: new Date() // Set the current date
            });
        }

        // If successful, render the success message
        const successMessage = encodeURIComponent('Item created successfully');
        return res.redirect(`/status/createItem/?successMessage=${successMessage}`);
    } catch (error) {
        console.log(error.message)
        res.status(500).send({ message: error.message })
    }
});

//Route for updating the current item
router.get('/edit/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const errorMessage = req.query.errorMessage;
        const successMessage = req.query.successMessage;
        const item = await getItemById(id);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.render("edit", { item, errorMessage, successMessage});
    } catch (error) {
        console.log(error.message);
        res.status(500).send({ message: error.message });
    }
});

//Route for submitting the updated current item
router.post('/submitEdit/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.body.maxQuantity || req.body.maxQuantity == 0) {
            const errorMessage = encodeURIComponent('Send all required fields: Maximum Quantity (Cannot be zero!)');
            return res.redirect(`/status/edit/${id}?errorMessage=${errorMessage}`);
        }
        
        if (req.body._method && req.body._method.toUpperCase() === 'PUT') {
            const result = await updateItem(id, req.body);
            if (!result) {
                return res.status(404).json({ message: "item not found" });
            }
        
            // Check if there's an existing log entry within the last 5 seconds with the same userName and product
            const existingLog = await changeLog.findOne({
                userName: req.body.userName,
                product: req.body.product,
                action: 'edited',
                createdAt: { $gte: new Date(new Date() - 5 * 1000) } // Check if createdAt is within the last 5 seconds
            });

            if (existingLog) {
                // If an existing log entry exists within the last 5 seconds, update the count
                await changeLog.updateOne({ _id: existingLog._id });
            } else {
                // Create a new log entry
                await changeLog.create({
                    userName: req.body.userName,
                    role: 'admin',
                    action: 'edited',
                    product: req.body.product,
                    maxLimit: req.body.maxQuantity, // Store maxQuantity in maxLimit
                    createdAt: new Date() // Set the current date
                });
            }
            // If successful, render the success message
            const successMessage = encodeURIComponent('Item edited successfully');
            return res.redirect(`/status/edit/${id}?successMessage=${successMessage}`);
        } else {
            return res.status(400).json({ message: 'Invalid request method' });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).send({ message: error.message });
    }
});

// Route for triggering backup
router.get('/backupData', adminAuth, async (req, res) => {
    try {
        const desktopFolder = path.join(require('os').homedir(), 'Desktop');
        await backup(desktopFolder);
        res.status(200).json({ message: 'Backup completed successfully' });
    } catch (error) {
        console.error('Backup failed:', error);
        res.status(500).json({ message: 'Backup failed' });
    }
});

router.get('/importData', adminAuth, async (req, res) => {
    try {
        const desktopFolder = path.join(require('os').homedir(), 'Desktop');
        await importDataToMongoDB(desktopFolder);
        res.status(200).json({ message: 'Import completed successfully' });
    } catch (error) {
        console.error('Import failed:', error);
        res.status(500).json({ message: 'Import failed' });
    }
});

module.exports = router;