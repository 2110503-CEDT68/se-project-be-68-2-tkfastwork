const mongoose = require('mongoose');

const MembershipPlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a membership name'],
        unique: true,
        trim: true
    },
    price: {
        type: Number,
        required: [true, 'Please add a price']
    },
    benefits: {
        type: [String],
        required: [true, 'Please add at least one benefit']
    },
    durationMonths: {
        type: Number,
        required: [true, 'Please add duration in months'],
        default: 1
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('MembershipPlan', MembershipPlanSchema);
