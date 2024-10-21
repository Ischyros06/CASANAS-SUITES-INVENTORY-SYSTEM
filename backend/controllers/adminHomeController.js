const { itemCollection } = require('../models/ItemCollectionModel');
const { changeLog } = require('../models/ChangeLogModel');

// Function to fetch items and render admin home page
const renderAdminHome = async (req, res) => {
    try {
        const items = await itemCollection.find({}, { product: 1, _id: 1, quantity: 1, maxQuantity: 1, unit: 1, picture: 1}).sort({ product: 1 });
        // Pass the updated items to the view for rendering
        res.render("adminHome", { itemCollection: items });
    } catch (error) {
        console.error("Error fetching items:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Function to get quantity of selected product
const getQuantity = async (req, res) => {
    const selectedProduct = req.query.product;
    try {
        const item = await itemCollection.findOne({ product: selectedProduct });
        res.json({ quantity: item ? item.quantity : 0 });
    } catch (error) {
        console.error(`Error fetching quantity: ${error}`);
        res.status(500).json({ error: 'An error occurred while fetching quantity' });
    }
};

// Function to add quantity of selected product
const addQuantity = async (req, res) => {
    const selectedProductId = req.query.id;
    const quantityToAdd = parseInt(req.query.quantity) || 0; // Get the quantity to add from the query parameter, default to 0 if not provided
    const adminName = res.locals.admin.name;
    try {
        const item = await itemCollection.findById(selectedProductId);

        if (!item) {
            return res.json({ success: false, message: 'Product not found' });
        }

        const { _id, quantity, maxQuantity } = item;

        if (quantity + quantityToAdd <= maxQuantity) { // Check if adding the quantity exceeds the maximum quantity
            // Check if there's an existing log entry within the last 5 seconds with the same userName and product
            const existingLog = await changeLog.findOne({
                userName: adminName,
                productId: selectedProductId,
                product: item.product,
                action: 'added',
                createdAt: { $gte: new Date(new Date() - 5 * 1000) } // Check if createdAt is within the last 5 seconds
            });

            if (existingLog) {
                // If an existing log entry exists within the last 5 seconds, update the count
                await changeLog.updateOne({ _id: existingLog._id }, { $inc: { amount: quantityToAdd } });
            } else {
                // Create a new log entry
                await changeLog.create({
                    userName: adminName,
                    role: 'admin',
                    action: 'added',
                    productId: selectedProductId,
                    product: item.product,
                    amount: quantityToAdd, // Increment count by the input quantity
                    createdAt: new Date() // Set the current date
                });
            }

            await itemCollection.updateOne({ _id: selectedProductId }, { $inc: { quantity: quantityToAdd } });
            await itemCollection.updateOne({ _id: selectedProductId }, { $set: { lastUpdatedBy: { admin: adminName } } });
            
            res.json({ success: true, productId: _id, quantity: quantity + quantityToAdd, maxQuantity });
        } else {
            res.json({ success: false, message: 'Adding the provided quantity exceeds the maximum quantity', maxQuantity });
        }
    } catch (error) {
        console.error(`Error adding quantity: ${error}`);
        res.status(500).json({ error: 'An error occurred while adding quantity' });
    }
};

// Function to subtract quantity of the selected item
const subtractQuantity = async (req, res) => {
    const selectedProductId = req.query.id;
    const quantityToDeduct = parseInt(req.query.quantity) || 0; // Get the quantity to reduce from the query parameter, default to 0 if not provided
    const adminName = res.locals.admin.name;

    try {
        const item = await itemCollection.findOne({ _id: selectedProductId });

        if (!item) {
            return res.json({ success: false, message: 'Product not found' });
        }

        const { quantity, maxQuantity } = item;

        if (quantity - quantityToDeduct >= 0) { // Check if the quantity to be subtracted is valid
            // Check if there's an existing log entry within the last 5 seconds with the same userName and product
            const existingLog = await changeLog.findOne({
                userName: adminName,
                productId: selectedProductId,
                product: item.product,
                action: 'reduced',
                createdAt: { $gte: new Date(new Date() - 5 * 1000) } // Check if createdAt is within the last 5 seconds
            });

            if (existingLog) {
                // If an existing log entry exists within the last 5 seconds, update the count
                await changeLog.updateOne({ _id: existingLog._id }, { $inc: { amount: quantityToDeduct } });
            } else {
                // Create a new log entry
                await changeLog.create({
                    userName: adminName,
                    role: 'admin',
                    action: 'reduced',
                    productId: selectedProductId,
                    product: item.product,
                    amount: quantityToDeduct,
                    createdAt: new Date() // Set the current date
                });
            }

            await itemCollection.updateOne({ _id: selectedProductId }, { $inc: { quantity: -quantityToDeduct } });
            await itemCollection.updateOne({ _id: selectedProductId }, { $set: { lastUpdatedBy: { admin: adminName } } });

            res.json({ success: true, productId: item._id, quantity: quantity - quantityToDeduct, maxQuantity });
        } else {
            res.json({ success: false, message: 'Zero quantity value reached. Cannot subtract items', maxQuantity });
        }
    } catch (error) {
        console.error(`Error subtracting quantity: ${error}`);
        res.status(500).json({ error: 'An error occurred while subtracting quantity' });
    }
};

// Function to fetch items by category
const getItemsByCategory = async (req, res) => {
    const category = req.params.category;
    try {
        // Query the database for items with the specified category
        const items = await itemCollection.find({ category: category }, { product: 1, _id: 1, quantity: 1, unit: 1, maxQuantity: 1, picture: 1 }).sort({ product: 1 });

        // Send JSON response containing the updated items
        res.json(items);
    } catch (error) {
        console.error(`Error fetching items by category: ${error}`);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = {
    renderAdminHome,
    getQuantity,
    addQuantity,
    subtractQuantity,
    getItemsByCategory
};
