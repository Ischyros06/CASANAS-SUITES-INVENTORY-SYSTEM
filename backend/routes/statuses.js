const express = require('express');
const { adminAuth } = require('./authMiddleware');
const { changeLog } = require('../models/ChangeLogModel');
const { getAllItems, createItem, getItemById, updateItem, upload, backup, importDataToMongoDB, deleteItem } = require('../controllers/statusController');
const { itemCollection } = require('../models/ItemCollectionModel');
const { adminLogInRequests } = require('../models/AdminLoginModel');
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
        if (!req.body.product || !req.body.quantity || !req.body.maxQuantity || !req.body.unit || !req.file) {
            const errorMessage = encodeURIComponent('Send all required fields: product, quantity, max quantity, unit, picture');
            return res.redirect(`/status/createItem/?errorMessage=${errorMessage}`);
        }if(req.body.maxQuantity < req.body.quantity){
            const errorMessage = encodeURIComponent('Input denied: Maximum quantity cannot be lower than the current quantity!');
            return res.redirect(`/status/createItem/?errorMessage=${errorMessage}`);
        }

        const existingItem = await itemCollection.findOne({ product: req.body.product });
        if(existingItem){
            return res.status(404).render('createItem', {
                errorMessage: 'The product name already exist'
            });
        }

        const newItem = await createItem(req.body, req.file);

        // Extract the _id of the newly created item
        const productId = newItem._id;

        // Check if there's an existing log entry within the last 5 seconds with the same userName and product
        const existingLog = await changeLog.findOne({
            userName: req.body.userName,
            productId: productId,
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
                productId: productId,
                product: req.body.product,
                amount: req.body.quantity,
                maxLimit: req.body.maxQuantity, // Store maxQuantity in maxLimit
                unit: req.body.unit,
                category: req.body.category,
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
            const errorMessage = encodeURIComponent('Input denied: Maximum quantity (Cannot be zero!)');
            return res.redirect(`/status/edit/${id}?errorMessage=${errorMessage}`);
        } if(req.body.maxQuantity < req.body.quantity){
            const errorMessage = encodeURIComponent('Input denied: Maximum quantity cannot be lower than the current quantity!');
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
                productId: id,
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
                    productId: id,
                    product: req.body.product,
                    maxLimit: req.body.maxQuantity, // Store maxQuantity in maxLimit
                    unit: req.body.unit,
                    category: req.body.category,
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

// Route for deleting an item
router.post('/delete/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        // Fetch the admin details using the decoded token
        const admin = await adminLogInRequests.findById(req.user.id); // Use req.user.id from the decoded token
        const item = await itemCollection.findById(id);

        if (!admin) {
            const errorMessage = encodeURIComponent('Admin not found');
            return res.redirect(`/status/?errorMessage=${errorMessage}`);
        }

        const deletedItem = await deleteItem(id);

        if (!deletedItem) {
            const errorMessage = encodeURIComponent('Item not found or already deleted');
            return res.redirect(`/status/?errorMessage=${errorMessage}`);
        }

        // Log the deletion in the changeLog
        await changeLog.create({
            userName: admin.name, // Log the authenticated user's userName
            role: 'admin',
            action: 'deleted',
            productId: id,
            product: deletedItem.product,
            amount: item.quantity,
            maxLimit: item.maxQuantity,
            unit: item.unit,
            category: item.category,
            createdAt: new Date() // Set the current date
        });

        const successMessage = encodeURIComponent('Item deleted successfully');
        return res.redirect(`/status`);
    } catch (error) {
        console.log(error.message);
        res.status(500).send({ message: error.message });
    }
});


module.exports = router;