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

describe('buildOwnerReportPdf', () => {
    test('produces a valid PDF buffer that contains the report header', () => {
        const buffer = buildOwnerReportPdf(baseReport());

        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.slice(0, 8).toString()).toBe('%PDF-1.4');
        const text = buffer.toString('binary');
        expect(text).toContain('Owner Report');
        expect(text).toContain('Focus Hub');
        expect(text).toContain('Atlas');
        expect(text).toContain('xref');
        expect(text).toContain('%%EOF');
    });

    test('falls back to a placeholder line when no spaces are assigned', () => {
        const buffer = buildOwnerReportPdf(baseReport({ spaces: [] }));
        const text = buffer.toString('binary');
        expect(text).toContain('No coworking spaces are assigned');
    });

    test('handles empty room utilisation and missing peak hours', () => {
        const buffer = buildOwnerReportPdf(baseReport({
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

        const text = buffer.toString('binary');
        expect(text).toContain('No peak hours available');
        expect(text).toContain('No rooms found for this coworking space.');
    });

    test('escapes backslashes and parentheses inside text content', () => {
        const buffer = buildOwnerReportPdf(baseReport({
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
                    roomName: 'Room é',
                    roomType: 'private',
                    bookingCount: 1,
                    totalHoursBooked: 1,
                    utilizationPercent: 5
                }],
                insights: [{ message: 'Insight (special) text' }]
            }]
        }));

        const text = buffer.toString('binary');
        expect(text).toContain('\\(Case\\)');
        expect(text).toContain('\\\\Lab');
    });

    test('falls back to "Unknown owner" when owner name is missing', () => {
        const buffer = buildOwnerReportPdf(baseReport({ owner: {} }));
        const text = buffer.toString('binary');
        expect(text).toContain('Unknown owner');
    });

    test('paginates content across multiple pages when there are many lines', () => {
        const manyRooms = Array.from({ length: 60 }, (_, index) => ({
            roomName: `Room ${index + 1}`,
            roomType: 'open',
            bookingCount: index,
            totalHoursBooked: index * 2,
            utilizationPercent: index
        }));

        const buffer = buildOwnerReportPdf(baseReport({
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
        const pageMatches = text.match(/\/Type \/Page /g) || [];
        expect(pageMatches.length).toBeGreaterThan(1);
    });

    test('long single lines are wrapped before being written to the page', () => {
        const longInsight = 'A'.repeat(400);
        const buffer = buildOwnerReportPdf(baseReport({
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

        const text = buffer.toString('binary');
        expect(text).toContain('AAAAAAAAAA');
    });

    test('empty input still produces a single-page report with the document header', () => {
        const buffer = buildOwnerReportPdf({
            owner: {},
            generatedAt: new Date('2026-04-23T00:00:00.000Z'),
            window: {
                from: new Date('2026-04-23T00:00:00.000Z'),
                to: new Date('2026-04-23T00:00:00.000Z')
            },
            totals: { totalSpaces: 0, totalBookings: 0, totalUniqueUsers: 0 },
            spaces: []
        });

        expect(buffer.slice(0, 8).toString()).toBe('%PDF-1.4');
        const text = buffer.toString('binary');
        expect(text).toContain('Co-working Space Owner Report');
    });
});
