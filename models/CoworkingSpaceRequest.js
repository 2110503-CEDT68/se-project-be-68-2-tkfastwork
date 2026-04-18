const mongoose = require('mongoose');

const CoworkingSpaceRequestSchema = new mongoose.Schema({
    submitter: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Please add a name'],
        trim: true,
        maxlength: [50, 'Name can not be more than 50 characters']
    },
    address: {
        type: String,
        required: [true, 'Please add an address'],
        trim: true
    },
    tel: {
        type: String,
        required: [true, 'Please add a telephone number'],
        match: [/^[0-9]{10}$/, 'Please add a valid 10-digit telephone number']
    },
    opentime: {
        type: String,
        required: [true, 'Please add open time (e.g., 08:00)'],
        match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Please provide time in HH:MM format']
    },
    closetime: {
        type: String,
        required: [true, 'Please add close time (e.g., 18:00)'],
        match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Please provide time in HH:MM format']
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    pics: {
        type: [String],
        default: []
    },
    proofOfOwnership: {
        type: String,
        required: [true, 'Please provide a proof of ownership URL']
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejectionReason: {
        type: String
    },
    reviewedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    reviewedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isVisible: {
        type: Boolean,
        default: true
    }
});

CoworkingSpaceRequestSchema.index({ submitter: 1, status: 1 });
CoworkingSpaceRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('CoworkingSpaceRequest', CoworkingSpaceRequestSchema);
