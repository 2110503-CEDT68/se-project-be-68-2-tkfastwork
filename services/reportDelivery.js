const sendEmail = require('../utils/email');
const { getOwnerReportData } = require('./reportData');
const { buildOwnerReportPdf } = require('../utils/reportPdf');

const buildFilename = (date = new Date()) => {
    const isoDate = new Date(date).toISOString().slice(0, 10);
    return `owner-report-${isoDate}.pdf`;
};

const buildEmailHtml = (reportData) => `
    <div style="font-family:sans-serif;max-width:540px;margin:auto;padding:24px">
        <h2 style="color:#1D4ED8">Your coworking report is ready</h2>
        <p>Hi <strong>${reportData.owner.name}</strong>,</p>
        <p>Attached is your latest owner report covering <strong>${reportData.totals.totalSpaces}</strong> space(s) and <strong>${reportData.totals.totalBookings}</strong> booking(s).</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;color:#64748B">Report window</td><td style="padding:8px">${new Date(reportData.window.from).toISOString()} to ${new Date(reportData.window.to).toISOString()}</td></tr>
            <tr><td style="padding:8px;color:#64748B">Spaces covered</td><td style="padding:8px">${reportData.totals.totalSpaces}</td></tr>
            <tr><td style="padding:8px;color:#64748B">Total bookings</td><td style="padding:8px">${reportData.totals.totalBookings}</td></tr>
            <tr><td style="padding:8px;color:#64748B">Unique users</td><td style="padding:8px">${reportData.totals.totalUniqueUsers}</td></tr>
        </table>
        <p style="color:#64748B;font-size:14px">This message was generated automatically by your scheduled reporting preferences.</p>
    </div>
`;

const buildOwnerReportAssets = async ({ ownerId, from, to, lookbackDays, now = new Date() }) => {
    const reportData = await getOwnerReportData({
        ownerId,
        from,
        to,
        lookbackDays,
        referenceDate: now
    });

    return {
        reportData,
        pdfBuffer: buildOwnerReportPdf(reportData),
        filename: buildFilename(now)
    };
};

const sendOwnerReportEmail = async ({ owner, from, to, lookbackDays, now = new Date() }) => {
    if (!owner || !owner._id) {
        throw new Error('Owner is required to send a report');
    }

    if (!owner.email) {
        throw new Error('Owner email is required to send a report');
    }

    const { reportData, pdfBuffer, filename } = await buildOwnerReportAssets({
        ownerId: owner._id,
        from,
        to,
        lookbackDays,
        now
    });

    await sendEmail({
        to: owner.email,
        subject: 'Your scheduled coworking report',
        html: buildEmailHtml(reportData),
        attachments: [{
            filename,
            content: pdfBuffer,
            contentType: 'application/pdf'
        }]
    });

    return {
        reportData,
        filename
    };
};

module.exports = {
    buildOwnerReportAssets,
    sendOwnerReportEmail
};
