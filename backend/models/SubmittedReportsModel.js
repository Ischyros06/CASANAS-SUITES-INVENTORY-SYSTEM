const mongoose = require('mongoose');

const submittedReportsSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    userName:{
        type: String,
        required: true
    },
    reportData: [{
        _id: false,
        productId: {
            type: String,
            required: true
        },
        product: {
            type: String,
            required: true
        },
        quantitySubtracted: {
            type: Number,
            required: true
        }, 
        unit: {
            type: String,
            required: true
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
})

const submittedReports = new mongoose.model("submittedReports", submittedReportsSchema);

module.exports = { submittedReports };