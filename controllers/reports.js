const User = require('../models/User');
const { buildOwnerReportAssets, sendOwnerReportEmail } = require('../services/reportDelivery');
const { getNextRunAt, normalizeReportPreferences } = require('../utils/reportSchedule');

const getCurrentOwner = async (userId) => User.findById(userId);

//@desc     Get current owner's report preferences
//@route    GET /api/v1/reports/preferences
//@access   Private (owner only)
exports.getMyReportPreferences = async (req, res) => {
    try {
        const owner = await getCurrentOwner(req.user.id);
        if (!owner) {
            return res.status(404).json({ success: false, message: 'Owner not found' });
        }

        const preferences = normalizeReportPreferences(owner.reportPreferences || {});
        preferences.enabled = Boolean(owner.reportPreferences?.enabled);
        preferences.lastRunAt = owner.reportPreferences?.lastRunAt || null;
        preferences.nextRunAt = owner.reportPreferences?.nextRunAt || null;

        return res.status(200).json({
            success: true,
            data: preferences
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Cannot fetch report preferences' });
    }
};

//@desc     Update current owner's report preferences
//@route    PUT /api/v1/reports/preferences
//@access   Private (owner only)
exports.updateMyReportPreferences = async (req, res) => {
    try {
        const owner = await getCurrentOwner(req.user.id);
        if (!owner) {
            return res.status(404).json({ success: false, message: 'Owner not found' });
        }

        const preferences = normalizeReportPreferences(owner.reportPreferences || {}, req.body);
        preferences.nextRunAt = preferences.enabled ? getNextRunAt(preferences, new Date()) : null;

        owner.reportPreferences = preferences;
        owner.markModified('reportPreferences');
        await owner.save();

        return res.status(200).json({
            success: true,
            data: owner.reportPreferences
        });
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

//@desc     Download current owner's PDF report
//@route    GET /api/v1/reports/pdf
//@access   Private (owner only)
exports.downloadMyReportPdf = async (req, res) => {
    try {
        const owner = await getCurrentOwner(req.user.id);
        if (!owner) {
            return res.status(404).json({ success: false, message: 'Owner not found' });
        }

        const lookbackDays = req.query.lookbackDays
            ? Number.parseInt(req.query.lookbackDays, 10)
            : owner.reportPreferences?.lookbackDays;

        const { pdfBuffer, filename } = await buildOwnerReportAssets({
            ownerId: owner._id,
            from: req.query.from,
            to: req.query.to,
            lookbackDays
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(pdfBuffer);
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

//@desc     Send current owner's report immediately
//@route    POST /api/v1/reports/send-now
//@access   Private (owner only)
exports.sendMyReportNow = async (req, res) => {
    try {
        const owner = await getCurrentOwner(req.user.id);
        if (!owner) {
            return res.status(404).json({ success: false, message: 'Owner not found' });
        }

        const now = new Date();
        const preferences = normalizeReportPreferences(owner.reportPreferences || {});
        const lookbackDays = req.body.lookbackDays
            ? Number.parseInt(req.body.lookbackDays, 10)
            : preferences.lookbackDays;

        const result = await sendOwnerReportEmail({
            owner,
            from: req.body.from,
            to: req.body.to,
            lookbackDays,
            now
        });

        if (preferences.enabled) {
            owner.reportPreferences = {
                ...preferences,
                lastRunAt: now,
                nextRunAt: getNextRunAt(preferences, now)
            };
            owner.markModified('reportPreferences');
            await owner.save();
        }

        return res.status(200).json({
            success: true,
            data: {
                filename: result.filename,
                sentTo: owner.email
            }
        });
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
};
