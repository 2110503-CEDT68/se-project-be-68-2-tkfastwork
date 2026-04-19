const mongoose = require('mongoose');

const BlockedDateSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: [true, 'Please add a date']
    },
    reason: {
        type: String,
        required: [true, 'Please add a reason for blocking']
    },
    coworkingSpace: {
        type: mongoose.Schema.ObjectId,
        ref: 'CoworkingSpace',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for performance and to ensure no duplicate blocks for the same space and date
// Note: Date should be normalized to 00:00:00 UTC before saving
BlockedDateSchema.index({ coworkingSpace: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('BlockedDate', BlockedDateSchema);
