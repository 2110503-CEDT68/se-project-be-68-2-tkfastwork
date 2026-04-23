const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT_MARGIN = 50;
const TOP_MARGIN = 742;
const LINE_HEIGHT = 14;
const MAX_LINES_PER_PAGE = 48;

const sanitizeText = (value) => String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\s+/g, ' ')
    .trim();

const escapePdfText = (value) => sanitizeText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const wrapLine = (text, maxLength = 90) => {
    const cleanText = sanitizeText(text);
    if (!cleanText) return [''];

    const words = cleanText.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach((word) => {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        if (candidate.length > maxLength && currentLine) {
            lines.push(currentLine);
            currentLine = word;
            return;
        }

        currentLine = candidate;
    });

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
};

const formatDate = (value) => new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC'
}).format(new Date(value));

const buildReportLines = (reportData) => {
    const lines = [];
    const push = (text = '') => {
        wrapLine(text).forEach((line) => lines.push(line));
    };

    push('Co-working Space Owner Report');
    push(`Owner: ${reportData.owner.name || 'Unknown owner'}`);
    push(`Generated: ${formatDate(reportData.generatedAt)}`);
    push(`Window: ${formatDate(reportData.window.from)} to ${formatDate(reportData.window.to)}`);
    push(`Portfolio summary: ${reportData.totals.totalSpaces} spaces, ${reportData.totals.totalBookings} bookings, ${reportData.totals.totalUniqueUsers} unique users.`);
    push('');

    if (reportData.spaces.length === 0) {
        push('No coworking spaces are assigned to this owner yet.');
        return lines;
    }

    reportData.spaces.forEach((space, index) => {
        push(`Space ${index + 1}: ${space.spaceName}`);
        push(`Address: ${space.address}`);
        push(`Open hours: ${space.openTime} to ${space.closeTime}`);
        push(`Bookings: ${space.totalBookings}`);
        push(`Unique users: ${space.totalUniqueUsers}`);
        push(`Average booking duration: ${space.avgBookingDurationMinutes} minutes`);

        const peakHourLine = space.peakHours.length > 0
            ? space.peakHours.map((hour) => `${String(hour.hour).padStart(2, '0')}:00 (${hour.count})`).join(', ')
            : 'No peak hours available';
        push(`Peak hours: ${peakHourLine}`);

        push('Room utilization:');
        if (space.roomUtilization.length === 0) {
            push('No rooms found for this coworking space.');
        } else {
            space.roomUtilization.forEach((room) => {
                push(`- ${room.roomName} | ${room.roomType} | ${room.bookingCount} bookings | ${room.totalHoursBooked} hours | ${room.utilizationPercent}% utilization`);
            });
        }

        push('Insights:');
        space.insights.forEach((insight) => push(`- ${insight.message}`));
        push('');
    });

    return lines;
};

const paginateLines = (lines) => {
    const pages = [];
    let currentPage = [];

    lines.forEach((line) => {
        currentPage.push(line);
        if (currentPage.length >= MAX_LINES_PER_PAGE) {
            pages.push(currentPage);
            currentPage = [];
        }
    });

    if (currentPage.length > 0) {
        pages.push(currentPage);
    }

    return pages.length > 0 ? pages : [['Co-working Space Owner Report']];
};

const buildPageStream = (pageLines) => {
    const commands = [
        'BT',
        '/F1 11 Tf',
        `${LINE_HEIGHT} TL`,
        `${LEFT_MARGIN} ${TOP_MARGIN} Td`
    ];

    pageLines.forEach((line, index) => {
        commands.push(`(${escapePdfText(line)}) Tj`);
        if (index < pageLines.length - 1) {
            commands.push('T*');
        }
    });

    commands.push('ET');
    return commands.join('\n');
};

const buildOwnerReportPdf = (reportData) => {
    const reportLines = buildReportLines(reportData);
    const pageLineGroups = paginateLines(reportLines);
    const objects = [];

    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

    const pageIds = [];
    let objectId = 4;

    pageLineGroups.forEach((pageLines) => {
        const contentId = objectId;
        const pageId = objectId + 1;
        const stream = buildPageStream(pageLines);

        objects[contentId] = `<< /Length ${Buffer.byteLength(stream, 'binary')} >>\nstream\n${stream}\nendstream`;
        objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`;
        pageIds.push(`${pageId} 0 R`);
        objectId += 2;
    });

    objects[2] = `<< /Type /Pages /Kids [${pageIds.join(' ')}] /Count ${pageIds.length} >>`;

    let pdf = '%PDF-1.4\n';
    const offsets = [0];

    for (let index = 1; index < objects.length; index += 1) {
        if (!objects[index]) continue;
        offsets[index] = Buffer.byteLength(pdf, 'binary');
        pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, 'binary');
    pdf += `xref\n0 ${objects.length}\n`;
    pdf += '0000000000 65535 f \n';

    for (let index = 1; index < objects.length; index += 1) {
        if (!objects[index]) continue;
        pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, 'binary');
};

module.exports = {
    buildOwnerReportPdf
};
