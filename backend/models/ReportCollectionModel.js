const mongoose=require("mongoose");

const reportsModel = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    userName: Object,
    productAccessed: [{
        _id: false,
        productId: String,
        product: String,
        quantitySubtracted: Number,
        unit: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
})

const reportCollection = new mongoose.model("ReportCollection", reportsModel);

module.exports = { reportCollection };