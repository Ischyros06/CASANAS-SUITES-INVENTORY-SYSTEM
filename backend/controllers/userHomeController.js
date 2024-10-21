const { reportCollection } = require('../models/ReportCollectionModel');
const { itemCollection } = require('../models/ItemCollectionModel');
const { changeLog } = require('../models/ChangeLogModel');

// Function to fetch items and render the user home page
const fetchItemsAndRenderHome = async (req, res) => {
    try {
        const items = await itemCollection.find({}, { product: 1, _id: 1, quantity: 1, maxQuantity: 1, unit: 1, picture: 1 }).sort({ product: 1 });
        // Pass the updated items to the view for rendering
        res.render("userHome", { itemCollection: items });
    } catch (error) {
        console.error("Error fetching items:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Function to get the quantity of the selected item
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

// Function to subtract quantity of the selected item
const subtractQuantity = async (req, res) => {
    const selectedProductId = req.query.id;
    const selectedProduct = req.query.product;
    const quantityToDeduct = parseInt(req.query.quantity) || 0; // Get the quantity to add from the query parameter, default to 1 if not provided
    const userName = res.locals.user.name;
    const userId = req.user.id;
    const unitInfo = req.query.unit;

    try {
        const item = await itemCollection.findOne({ _id: selectedProductId });

        if (!item) {
            return res.json({ success: false, message: 'Product not found' });
        }

        const { quantity, maxQuantity } = item;
        
        if (quantity - quantityToDeduct >= 0) { // Check if the quantity to be subtracted is valid
            // Check if there's an existing log entry within the last 5 seconds with the same userName and product
            const existingLog = await changeLog.findOne({
                userName: userName,
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
                    userName: userName,
                    role: 'user',
                    action: 'reduced',
                    productId: selectedProductId,
                    product: item.product,
                    amount: quantityToDeduct,
                    createdAt: new Date() // Set the current date
                });
            }

            // Update report collection
            const existingUser = await reportCollection.findOne({ userId: userId });
            if (!existingUser) {
                // Create new report collection entry if the user does not exist
                await reportCollection.create({
                    userId: userId,
                    userName: userName,
                    productAccessed: [{ product: selectedProduct, productId: selectedProductId, quantitySubtracted: quantityToDeduct, unit: unitInfo }]
                });
            } else {
                // Check if the product with the same productId exists in the user's report
                const existingProduct = existingUser.productAccessed.find(prod => prod.productId === selectedProductId);
                
                if (existingProduct) {
                    // If productId exists, increment the quantitySubtracted for that product
                    await reportCollection.updateOne(
                        { userId: userId, "productAccessed.productId": selectedProductId },
                        { $inc: { "productAccessed.$.quantitySubtracted": quantityToDeduct } }
                    );
                } else {
                    // If productId does not exist, push the new product to the productAccessed array
                    await reportCollection.updateOne(
                        { userId: userId },
                        { $push: { productAccessed: { product: selectedProduct, productId: selectedProductId, quantitySubtracted: quantityToDeduct, unit: unitInfo } } }
                    );
                }
            }

            await itemCollection.updateOne({ _id: selectedProductId }, { $inc: { quantity: -quantityToDeduct } });
            await itemCollection.updateOne({ _id: selectedProductId }, { $set: { lastUpdatedBy: { user: userName } } });

            res.json({ success: true, productId: item._id, quantity: quantity - quantityToDeduct, maxQuantity });
        } else {
            res.json({ success: false, message: 'Zero quantity value reached. Cannot subtract items', maxQuantity });
        }
    } catch (error) {
        console.error(`Error subtract quantity: ${error}`);
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
    fetchItemsAndRenderHome,
    getQuantity,
    subtractQuantity,
    getItemsByCategory
};
