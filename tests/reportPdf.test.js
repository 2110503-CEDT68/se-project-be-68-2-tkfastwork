const { buildOwnerReportPdf } = require('../utils/reportPdf');

const baseReport = (overrides = {}) => ({
    owner: { name: 'Owner Test' },
    generatedAt: new Date('2026-04-23T00:00:00.000Z'),
    window: {
        from: new Date('2026-04-01T00:00:00.000Z'),
        to: new Date('2026-04-23T00:00:00.000Z')
    },
    totals: {
        totalSpaces: 1,
        totalBookings: 4,
        totalUniqueUsers: 3
    },
    spaces: [{
        spaceName: 'Focus Hub',
        address: '123 Main Street',
        openTime: '08:00',
        closeTime: '18:00',
        totalBookings: 4,
        totalUniqueUsers: 3,
        avgBookingDurationMinutes: 60,
        peakHours: [{ hour: 9, count: 2 }],
        roomUtilization: [{
            roomName: 'Atlas',
            roomType: 'meeting',
            bookingCount: 4,
            totalHoursBooked: 4,
            utilizationPercent: 10
        }],
        insights: [{ message: 'The busiest room was "Atlas" with 4 bookings.' }]
    }],
    ...overrides
});

/**
 * Helper: decompress FlateDecode streams from PDF buffer, decode hex text,
 * then extract readable text from TJ/Tj operators by concatenating fragments.
 */
const zlib = require('zlib');
function extractPdfText(buffer) {
    const raw = buffer.toString('binary');
    const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
    let lines = [];
    let match;
    while ((match = streamRegex.exec(raw)) !== null) {
        let content;
        try {
            const compressed = Buffer.from(match[1], 'binary');
            content = zlib.inflateSync(compressed).toString('utf-8');
        } catch {
            content = match[1];
        }
        // Extract TJ arrays and decode hex fragments into text
        const tjRegex = /\[(.*?)\]\s*TJ/g;
        let tjMatch;
        while ((tjMatch = tjRegex.exec(content)) !== null) {
            const inner = tjMatch[1];
            const hexRegex = /<([0-9a-fA-F]+)>/g;
            let hexMatch;
            let line = '';
            while ((hexMatch = hexRegex.exec(inner)) !== null) {
                line += Buffer.from(hexMatch[1], 'hex').toString('utf-8');
            }
            if (line) lines.push(line);
        }
    }
    return lines.join('\n');
}

describe('buildOwnerReportPdf', () => {
    test('produces a valid PDF buffer that contains the report header', async () => {
        const buffer = await buildOwnerReportPdf(baseReport());

        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.slice(0, 5).toString()).toBe('%PDF-');
        const text = extractPdfText(buffer);
        expect(text).toContain('EXECUTIVE PERFORMANCE REPORT');
        expect(text).toContain('FOCUS HUB');
        expect(text).toContain('Atlas');
        const rawPdf = buffer.toString('binary');
        expect(rawPdf).toContain('%%EOF');
    });

    test('falls back to a placeholder line when no spaces are assigned', async () => {
        const buffer = await buildOwnerReportPdf(baseReport({ spaces: [] }));
        const text = extractPdfText(buffer);
        expect(text).toContain('No coworking spaces are assigned');
    });

    test('handles empty room utilisation and missing peak hours', async () => {
        const buffer = await buildOwnerReportPdf(baseReport({
            spaces: [{
                spaceName: 'Quiet Hub',
                address: '1 Empty Way',
                openTime: '09:00',
                closeTime: '17:00',
                totalBookings: 0,
                totalUniqueUsers: 0,
                avgBookingDurationMinutes: 0,
                peakHours: [],
                roomUtilization: [],
                insights: []
            }]
        }));

        const text = extractPdfText(buffer);
        // New PDF skips chart/table sections when data is empty
        expect(text).toContain('QUIET HUB');
        expect(text).not.toContain('Booking Activity');
        expect(text).not.toContain('Room Utilization');
    });

    test('renders special characters inside text content', async () => {
        const buffer = await buildOwnerReportPdf(baseReport({
            spaces: [{
                spaceName: 'Edge (Case) \\Lab',
                address: 'Tab\there',
                openTime: '08:00',
                closeTime: '18:00',
                totalBookings: 1,
                totalUniqueUsers: 1,
                avgBookingDurationMinutes: 30,
                peakHours: [{ hour: 0, count: 1 }],
                roomUtilization: [{
                    roomName: 'Room A',
                    roomType: 'private',
                    bookingCount: 1,
                    totalHoursBooked: 1,
                    utilizationPercent: 5
                }],
                insights: [{ message: 'Insight (special) text' }]
            }]
        }));

        expect(Buffer.isBuffer(buffer)).toBe(true);
        const text = extractPdfText(buffer);
        expect(text).toContain('EDGE');
        expect(text).toContain('Insight');
    });

    test('falls back to "Unknown" when owner name is missing', async () => {
        const buffer = await buildOwnerReportPdf(baseReport({ owner: {} }));
        const text = extractPdfText(buffer);
        expect(text).toContain('Unknown');
    });

    test('paginates content across multiple pages when there are many lines', async () => {
        const manyRooms = Array.from({ length: 60 }, (_, index) => ({
            roomName: `Room ${index + 1}`,
            roomType: 'open',
            bookingCount: index,
            totalHoursBooked: index * 2,
            utilizationPercent: index
        }));

        const buffer = await buildOwnerReportPdf(baseReport({
            spaces: [{
                spaceName: 'Mega Space',
                address: 'Mega Avenue',
                openTime: '08:00',
                closeTime: '20:00',
                totalBookings: 100,
                totalUniqueUsers: 50,
                avgBookingDurationMinutes: 75,
                peakHours: [{ hour: 9, count: 10 }, { hour: 15, count: 8 }],
                roomUtilization: manyRooms,
                insights: [{ message: 'Lots of room activity' }]
            }]
        }));

        const text = buffer.toString('binary');
        const pageMatches = text.match(/\/Type \/Page\b/g) || [];
        expect(pageMatches.length).toBeGreaterThan(1);
    });

    test('long single lines are rendered in the PDF output', async () => {
        const longInsight = 'A'.repeat(400);
        const buffer = await buildOwnerReportPdf(baseReport({
            spaces: [{
                spaceName: 'Wrap Hub',
                address: 'Wrap Street',
                openTime: '08:00',
                closeTime: '18:00',
                totalBookings: 1,
                totalUniqueUsers: 1,
                avgBookingDurationMinutes: 60,
                peakHours: [{ hour: 9, count: 1 }],
                roomUtilization: [{
                    roomName: 'R1',
                    roomType: 'meeting',
                    bookingCount: 1,
                    totalHoursBooked: 1,
                    utilizationPercent: 1
                }],
                insights: [{ message: longInsight }]
            }]
        }));

        expect(Buffer.isBuffer(buffer)).toBe(true);
        const text = extractPdfText(buffer);
        expect(text).toContain('AAAAAAAAAA');
    });

    test('rejects with error when space data causes a runtime exception', async () => {
        const badReport = baseReport({
            spaces: [{
                spaceName: null,  // causes .toUpperCase() to throw at line 74
                address: '123 Main Street',
                openTime: '08:00',
                closeTime: '18:00',
                totalBookings: 1,
                totalUniqueUsers: 1,
                avgBookingDurationMinutes: 60,
                peakHours: [],
                roomUtilization: [],
                insights: []
            }]
        });

        await expect(buildOwnerReportPdf(badReport)).rejects.toThrow();
    });

    test('handles null date fields with N/A fallback', async () => {
        const buffer = await buildOwnerReportPdf({
            owner: { name: 'Test' },
            generatedAt: null,
            window: { from: null, to: null },
            totals: { totalSpaces: 0, totalBookings: 0, totalUniqueUsers: 0 },
            spaces: []
        });

        expect(Buffer.isBuffer(buffer)).toBe(true);
        const text = extractPdfText(buffer);
        expect(text).toContain('N/A');
    });

    test('adds page break when content exceeds page height', async () => {
        const manySpaces = Array.from({ length: 8 }, (_, i) => ({
            spaceName: `Space ${i + 1}`,
            address: `Address ${i + 1}`,
            openTime: '08:00',
            closeTime: '18:00',
            totalBookings: 10,
            totalUniqueUsers: 5,
            avgBookingDurationMinutes: 60,
            peakHours: [{ hour: 9, count: 5 }],
            roomUtilization: [
                { roomName: `Room A${i}`, roomType: 'meeting', bookingCount: 5, totalHoursBooked: 5, utilizationPercent: 50 },
                { roomName: `Room B${i}`, roomType: 'private', bookingCount: 3, totalHoursBooked: 3, utilizationPercent: 30 },
                { roomName: `Room C${i}`, roomType: 'open', bookingCount: 2, totalHoursBooked: 2, utilizationPercent: 20 },
            ],
            insights: [
                { message: 'Insight one' },
                { message: 'Insight two' },
                { message: 'Insight three' },
            ]
        }));

        const buffer = await buildOwnerReportPdf(baseReport({ spaces: manySpaces }));
        expect(Buffer.isBuffer(buffer)).toBe(true);
        const text = buffer.toString('binary');
        const pageMatches = text.match(/\/Type \/Page\b/g) || [];
        expect(pageMatches.length).toBeGreaterThan(1);
    });

    test('renders N/A fallbacks when space address, openTime and closeTime are null (lines 81, 83)', async () => {
        const buffer = await buildOwnerReportPdf(baseReport({
            spaces: [{
                spaceName: 'Null Fields Hub',
                address: null,
                openTime: null,
                closeTime: null,
                totalBookings: 1,
                totalUniqueUsers: 1,
                avgBookingDurationMinutes: 30,
                peakHours: [{ hour: 10, count: 1 }],
                roomUtilization: [{
                    roomName: 'Room A',
                    roomType: 'private',
                    bookingCount: 1,
                    totalHoursBooked: 1,
                    utilizationPercent: 5
                }],
                insights: []
            }]
        }));

        expect(Buffer.isBuffer(buffer)).toBe(true);
        const text = extractPdfText(buffer);
        // address || "N/A", openTime || "N/A", closeTime || "N/A" all resolve to N/A
        expect(text).toContain('N/A');
    });

    test('empty input still produces a single-page report with the document header', async () => {
        const buffer = await buildOwnerReportPdf({
            owner: {},
            generatedAt: new Date('2026-04-23T00:00:00.000Z'),
            window: {
                from: new Date('2026-04-23T00:00:00.000Z'),
                to: new Date('2026-04-23T00:00:00.000Z')
            },
            totals: { totalSpaces: 0, totalBookings: 0, totalUniqueUsers: 0 },
            spaces: []
        });

        expect(buffer.slice(0, 5).toString()).toBe('%PDF-');
        const text = extractPdfText(buffer);
        expect(text).toContain('EXECUTIVE PERFORMANCE REPORT');
    });
});
