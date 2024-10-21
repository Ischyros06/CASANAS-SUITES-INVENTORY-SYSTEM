const mongoose=require("mongoose");

const ItemsModel = new mongoose.Schema({
    product: {
        type: String,
        required: [true, 'Please enter an item'],
    },
    quantity: {
        type: Number,
        required: [true, 'Please enter the quantity'],
    },
    maxQuantity: {
        type: Number,
        required: [true, 'Please enter a the maximum quantity']
    },
    unit: {
        type: String,
        //enum: ['grams', 'milliliters', 'pieces' ],
        required: [true, 'Please enter the unit of measurement the item']
    },
    category: {
        type: String,
        enum: ['breakfast', 'condiments', 'drinks', 'fruits', 'kitchen aid', 'resto', 'vegetables'],
        required: [true, 'Please enter the type (breakfast, condiments, drinks, fruits, kitchen aid, resto, vegetables)']
    },
    picture: {
        type: String, // Store the URL of the image
        required: [true, 'Please upload an image'], // Require the picture URL
    },
    lastUpdatedBy: {
        type: Object,
        default: {} // Default to an empty object for last account updated
    },
},
{
    timestamps: true, // date created
});

// Define a pre-save hook to convert product and category to lowercase
ItemsModel.pre('save', function(next) {
    this.product = this.product.toLowerCase();
    this.unit = this.unit.toLowerCase();
    this.category = this.category.toLowerCase();
    next();
});


const itemCollection = new mongoose.model("itemCollection", ItemsModel);

module.exports = { itemCollection };