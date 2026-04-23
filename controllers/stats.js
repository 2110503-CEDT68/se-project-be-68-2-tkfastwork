const CoworkingSpace = require('../models/CoworkingSpace');
const { getSpaceReportData, parseDateRange } = require('../services/reportData');

const verifyOwnership = async (req, res) => {
    const space = await CoworkingSpace.findById(req.params.id);
    if (!space) {
        res.status(404).json({ success: false, message: 'Coworking space not found' });
        return null;
    }
    if (!space.owner || space.owner.toString() !== req.user.id) {
        res.status(403).json({ success: false, message: 'Not authorized - owner only' });
        return null;
    }
    return space;
};

//@desc     Get dashboard stats for a coworking space
//@route    GET /api/v1/coworkingSpaces/:id/stats
//@access   Private (owner of space only)
exports.getStats = async (req, res) => {
    try {
        const space = await verifyOwnership(req, res);
        if (!space) return;

        const { from, to } = parseDateRange({
            from: req.query.from,
            to: req.query.to
        });

        const report = await getSpaceReportData({ space, from, to });

        res.status(200).json({
            success: true,
            data: {
                totalBookings: report.totalBookings,
                totalUniqueUsers: report.totalUniqueUsers,
                roomUtilization: report.roomUtilization,
                peakHours: report.peakHours,
                avgBookingDurationMinutes: report.avgBookingDurationMinutes,
                demographicBreakdown: report.demographicBreakdown
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: 'Cannot fetch stats' });
    }
};

//@desc     Get rule-based insights for a coworking space
//@route    GET /api/v1/coworkingSpaces/:id/insights
//@access   Private (owner of space only)
exports.getInsights = async (req, res) => {
    try {
        const space = await verifyOwnership(req, res);
        if (!space) return;

        const { from, to } = parseDateRange({
            from: req.query.from,
            to: req.query.to
        });

        const report = await getSpaceReportData({ space, from, to });

        res.status(200).json({
            success: true,
            data: {
                insights: report.insights
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: 'Cannot generate insights' });
    }
};
