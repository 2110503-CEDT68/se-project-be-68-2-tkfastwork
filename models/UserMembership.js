const mongoose = require('mongoose');

const UserMembershipSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    plan: {
        type: mongoose.Schema.ObjectId,
        ref: 'MembershipPlan',
        required: true
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'cancelled'],
        default: 'active'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'completed'
    },
    paymentMethod: {
        type: String,
        default: 'Simulated Payment'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for performance
UserMembershipSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('UserMembership', UserMembershipSchema);
