const User = require('../models/User');
const { sendOwnerReportEmail } = require('./reportDelivery');
const { getNextRunAt, normalizeReportPreferences } = require('../utils/reportSchedule');

const POLL_INTERVAL_MS = Number.parseInt(process.env.REPORT_SCHEDULER_POLL_MS, 10) || 60 * 1000;

let schedulerHandle = null;
let isRunning = false;

const runDueOwnerReports = async (now = new Date()) => {
    const dueOwners = await User.find({
        role: 'owner',
        'reportPreferences.enabled': true,
        'reportPreferences.nextRunAt': { $ne: null, $lte: now }
    });

    let processed = 0;
    let sent = 0;

    for (const owner of dueOwners) {
        processed += 1;

        const preferences = normalizeReportPreferences(owner.reportPreferences || {});

        try {
            await sendOwnerReportEmail({
                owner,
                lookbackDays: preferences.lookbackDays,
                now
            });
            sent += 1;
        } catch (err) {
            console.log(`Scheduled report delivery failed for ${owner.email || owner._id}:`, err.message);
        }

        owner.reportPreferences = {
            ...preferences,
            lastRunAt: now,
            nextRunAt: getNextRunAt(preferences, now)
        };
        owner.markModified('reportPreferences');
        await owner.save();
    }

    return { processed, sent };
};

const startReportScheduler = () => {
    if (schedulerHandle || process.env.NODE_ENV === 'test' || process.env.DISABLE_REPORT_SCHEDULER === 'true') {
        return schedulerHandle;
    }

    schedulerHandle = setInterval(async () => {
        if (isRunning) return;

        isRunning = true;
        try {
            await runDueOwnerReports(new Date());
        } catch (err) {
            console.log('Report scheduler failed:', err.message);
        } finally {
            isRunning = false;
        }
    }, POLL_INTERVAL_MS);

    if (typeof schedulerHandle.unref === 'function') {
        schedulerHandle.unref();
    }

    return schedulerHandle;
};

const stopReportScheduler = () => {
    if (schedulerHandle) {
        clearInterval(schedulerHandle);
        schedulerHandle = null;
    }
};

module.exports = {
    runDueOwnerReports,
    startReportScheduler,
    stopReportScheduler
};
