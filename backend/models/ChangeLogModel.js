const mongoose = require('mongoose');

const changeLogSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    action: {
        type: String,
        enum: [ 'edited', 'added', 'reduced', 'created', 'sent', 'deleted'],
        required: true
    },
    productId:{
        type: mongoose.Schema.Types.ObjectId,
        required: function() {
            return this.action === 'added' || this.action === 'reduced' || this.action === 'created' || this.action === 'edited'|| this.action === 'deleted';
        }
    },
    product: {
        type: String,
        required: function() {
            return this.action === 'added' || this.action === 'reduced' || this.action === 'created' || this.action === 'edited' || this.action === 'deleted';
        }
    },
    amount: { //this will be used only when the action is manipulated
        type: Number,
        required: function() {
            return this.action === 'added' || this.action === 'reduced' || this.action === 'deleted' || this.action === 'created';
        },
    },
    maxLimit: {
        type: Number,
        required: function() {
            return this.action === 'created' || this.action === 'edited' || this.action === 'deleted';
        }
    },
    unit: {
        type: String,
        required: function() {
            return this.action === 'created' || this.action === 'edited' || this.action === 'deleted';
        }
    },
    category: {
        type: String,
        required: function() {
            return this.action === 'created' || this.action === 'edited' || this.action === 'deleted';
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const changeLog = new mongoose.model("ChangeLog", changeLogSchema);

module.exports = { changeLog };
