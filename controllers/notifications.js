const Notification = require('../models/Notification');

//@desc Get notifications for current user
//@route GET /api/v1/notifications
//@access Private
exports.getNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find({ user: req.user.id }).sort('-createdAt');
        res.status(200).json({ success: true, count: notifications.length, data: notifications });
    } catch (err) {
        res.status(400).json({ success: false });
    }
};

//@desc Mark notification as read
//@route PUT /api/v1/notifications/:id/read
//@access Private
exports.markAsRead = async (req, res, next) => {
    try {
        const notification = await Notification.findById(req.params.id);
        
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        // Ensure notification belongs to user
        if (notification.user.toString() !== req.user.id) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        notification.isRead = true;
        await notification.save();

        res.status(200).json({ success: true, data: notification });
    } catch (err) {
        res.status(400).json({ success: false });
    }
};

//@desc Mark all notifications as read
//@route PUT /api/v1/notifications/readAll
//@access Private
exports.markAllRead = async (req, res, next) => {
    try {
        await Notification.updateMany({ user: req.user.id, isRead: false }, { isRead: true });
        res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (err) {
        res.status(400).json({ success: false });
    }
};
