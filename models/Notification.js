const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['RESERVATION_CREATED', 'RESERVATION_UPDATED', 'RESERVATION_CANCELLED', 'MEMBERSHIP_ACTIVATED', 'MEMBERSHIP_EXPIRED'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    metadata: {
        type: Object
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for performance
NotificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
