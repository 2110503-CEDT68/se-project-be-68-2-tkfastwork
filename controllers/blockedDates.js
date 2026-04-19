const BlockedDate = require('../models/BlockedDate');

//@desc Get all blocked dates for a space
//@route GET /api/v1/coworkingSpaces/:coworkingSpaceId/blockedDates
//@access Public
exports.getBlockedDates = async (req, res, next) => {
    try {
        const blockedDates = await BlockedDate.find({ coworkingSpace: req.params.coworkingSpaceId });
        res.status(200).json({ success: true, count: blockedDates.length, data: blockedDates });
    } catch (err) {
        res.status(400).json({ success: false });
    }
};

//@desc Block a date
//@route POST /api/v1/coworkingSpaces/:coworkingSpaceId/blockedDates
//@access Private (Admin)
exports.blockDate = async (req, res, next) => {
    try {
        req.body.coworkingSpace = req.params.coworkingSpaceId;

        // Normalize date to 00:00:00 UTC
        const date = new Date(req.body.date);
        date.setUTCHours(0, 0, 0, 0);
        req.body.date = date;

        const blockedDate = await BlockedDate.create(req.body);
        res.status(201).json({ success: true, data: blockedDate });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

//@desc Unblock a date
//@route DELETE /api/v1/blockedDates/:id
//@access Private (Admin)
exports.unblockDate = async (req, res, next) => {
    try {
        const blockedDate = await BlockedDate.findById(req.params.id);
        if (!blockedDate) {
            return res.status(404).json({ success: false, message: 'Blocked date not found' });
        }
        await blockedDate.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false });
    }
};
