jest.mock('../services/reportData');
const { getSpaceReportData } = require('../services/reportData');

global.fetch = jest.fn();
process.env.OPENROUTER_KEY = 'test-key';

const { generateAIInsights, generateTopInsights } = require('../services/llmInsights');

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeReport(overrides = {}) {
    return {
        spaceName: 'Test Space',
        totalBookings: 20,
        totalUniqueUsers: 10,
        avgBookingDurationMinutes: 60,
        totalRooms: 3,
        roomUtilization: [
            { roomName: 'Room A', roomType: 'Meeting Room', bookingCount: 15, totalHoursBooked: 30, utilizationPercent: 75 },
            { roomName: 'Room B', roomType: 'Hot Desk',     bookingCount: 5,  totalHoursBooked: 10, utilizationPercent: 25 },
        ],
        peakHours: [
            { hour: 9,  count: 8 },
            { hour: 10, count: 6 },
            { hour: 11, count: 4 },
            { hour: 14, count: 2 },
        ],
        bookingsByWeekday: [
            { day: 'Monday',    count: 5, percentage: 25 },
            { day: 'Tuesday',   count: 4, percentage: 20 },
            { day: 'Wednesday', count: 4, percentage: 20 },
            { day: 'Thursday',  count: 4, percentage: 20 },
            { day: 'Friday',    count: 3, percentage: 15 },
            { day: 'Saturday',  count: 0, percentage: 0  },
            { day: 'Sunday',    count: 0, percentage: 0  },
        ],
        demographicBreakdown: {
            byGender: [
                { gender: 'Male',   count: 12, percentage: 60 },
                { gender: 'Female', count: 8,  percentage: 40 },
            ],
            byOccupation: [
                { occupation: 'Developer', count: 10, percentage: 50 },
                { occupation: 'Designer',  count: 5,  percentage: 25 },
                { occupation: 'Manager',   count: 5,  percentage: 25 },
            ],
            byAgeGroup: [
                { ageGroup: '25-34', count: 12, percentage: 60 },
                { ageGroup: '35-44', count: 5,  percentage: 25 },
                { ageGroup: '45+',   count: 3,  percentage: 15 },
            ],
            byRevenueRange: [
                { range: '<$50k',  count: 8,  percentage: 40 },
                { range: '$50-100k', count: 7, percentage: 35 },
                { range: '>$100k', count: 5,  percentage: 25 },
            ],
        },
        ...overrides,
    };
}

function mockFetchOk(body) {
    global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(body),
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// generateAIInsights
// ─────────────────────────────────────────────────────────────────────────────

describe('generateAIInsights', () => {
    test('returns early when totalBookings < 5', async () => {
        getSpaceReportData.mockResolvedValue(makeReport({ totalBookings: 3 }));

        const result = await generateAIInsights({ space: 's1', from: 'a', to: 'b' });

        expect(result).toEqual({
            insights: [],
            source: 'ai',
            message: 'Not enough data for AI analysis (minimum 5 bookings required)',
        });
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('calls OpenRouter, validates, sorts, and returns normalised insights', async () => {
        getSpaceReportData.mockResolvedValue(makeReport());

        const rawInsights = [
            { priority: 2, category: 'revenue_opportunity', title: 'Title B', message: 'Msg B', impact: 'low',  action: 'Act B' },
            { priority: 1, category: 'risk_alert',          title: 'Title A', message: 'Msg A', impact: 'high', action: 'Act A' },
            { priority: 3, category: 'growth_opportunity',  message: 'Msg C' }, // no title / no action
        ];
        mockFetchOk({ choices: [{ message: { content: JSON.stringify(rawInsights) } }] });

        const result = await generateAIInsights({ space: 's1', from: 'a', to: 'b' });

        expect(result.source).toBe('ai');
        expect(result.model).toBe('google/gemini-2.5-flash');
        expect(result.dataSnapshot).toEqual({ totalBookings: 20, totalUniqueUsers: 10, totalRooms: 3 });

        const insights = result.insights;
        expect(insights).toHaveLength(3);
        // sorted by original priority → re-numbered 1,2,3
        expect(insights[0].priority).toBe(1);
        expect(insights[0].category).toBe('risk_alert');
        expect(insights[1].priority).toBe(2);
        expect(insights[2].priority).toBe(3);
        // defaults filled in
        expect(insights[2].title).toBe('');
        expect(insights[2].action).toBe('');
        expect(insights[2].impact).toBe('medium');
        // source injected
        insights.forEach(i => expect(i.source).toBe('ai'));
    });

    test('filters out insights missing required fields (priority/message/category)', async () => {
        getSpaceReportData.mockResolvedValue(makeReport());

        const rawInsights = [
            { priority: 1, category: 'risk_alert' },              // no message
            { priority: 2, message: 'Msg' },                       // no category
            { category: 'risk_alert', message: 'Msg' },            // no priority
            { priority: 3, category: 'risk_alert', message: 'Valid' },
        ];
        mockFetchOk({ choices: [{ message: { content: JSON.stringify(rawInsights) } }] });

        const result = await generateAIInsights({ space: 's1', from: 'a', to: 'b' });
        expect(result.insights).toHaveLength(1);
        expect(result.insights[0].message).toBe('Valid');
    });

    test('handles non-array AI response gracefully (returns empty insights)', async () => {
        getSpaceReportData.mockResolvedValue(makeReport());

        mockFetchOk({ choices: [{ message: { content: JSON.stringify({ not: 'an array' }) } }] });

        const result = await generateAIInsights({ space: 's1', from: 'a', to: 'b' });
        expect(result.insights).toEqual([]);
    });

    test('strips markdown code fences from AI response', async () => {
        getSpaceReportData.mockResolvedValue(makeReport());

        const json = JSON.stringify([{ priority: 1, category: 'risk_alert', message: 'Msg', title: 'T', impact: 'high', action: 'A' }]);
        const wrapped = `\`\`\`json\n${json}\n\`\`\``;
        global.fetch.mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ choices: [{ message: { content: wrapped } }] }),
        });

        const result = await generateAIInsights({ space: 's1', from: 'a', to: 'b' });
        expect(result.insights).toHaveLength(1);
    });

    test('throws when OPENROUTER_KEY is missing', async () => {
        getSpaceReportData.mockResolvedValue(makeReport());
        const saved = process.env.OPENROUTER_KEY;
        delete process.env.OPENROUTER_KEY;

        await expect(generateAIInsights({ space: 's1', from: 'a', to: 'b' })).rejects.toThrow('OPENROUTER_KEY not configured');

        process.env.OPENROUTER_KEY = saved;
    });

    test('throws on non-ok HTTP response from OpenRouter', async () => {
        getSpaceReportData.mockResolvedValue(makeReport());
        global.fetch.mockResolvedValue({
            ok: false,
            status: 429,
            text: jest.fn().mockResolvedValue('rate limited'),
        });

        await expect(generateAIInsights({ space: 's1', from: 'a', to: 'b' })).rejects.toThrow('OpenRouter API error 429: rate limited');
    });

    test('throws when LLM returns empty content', async () => {
        getSpaceReportData.mockResolvedValue(makeReport());
        mockFetchOk({ choices: [{ message: { content: '' } }] });

        await expect(generateAIInsights({ space: 's1', from: 'a', to: 'b' })).rejects.toThrow('Empty response from LLM');
    });

    test('throws when LLM content is missing entirely', async () => {
        getSpaceReportData.mockResolvedValue(makeReport());
        mockFetchOk({ choices: [] });

        await expect(generateAIInsights({ space: 's1', from: 'a', to: 'b' })).rejects.toThrow('Empty response from LLM');
    });

    test('buildPrompt uses bookingsByWeekday fallback for undefined', async () => {
        const report = makeReport({ bookingsByWeekday: undefined });
        getSpaceReportData.mockResolvedValue(report);

        mockFetchOk({ choices: [{ message: { content: '[]' } }] });

        // Just confirm it does not throw and fetch was called
        await generateAIInsights({ space: 's1', from: 'a', to: 'b' });
        expect(global.fetch).toHaveBeenCalledTimes(1);

        const body = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(body.messages[0].content).toContain('Bookings by Day of Week');
    });

    test('prompt body contains space name, booking stats, room utilization lines', async () => {
        getSpaceReportData.mockResolvedValue(makeReport());
        mockFetchOk({ choices: [{ message: { content: '[]' } }] });

        await generateAIInsights({ space: 's1', from: 'a', to: 'b' });

        const body = JSON.parse(global.fetch.mock.calls[0][1].body);
        const prompt = body.messages[0].content;

        expect(prompt).toContain('"Test Space"');
        expect(prompt).toContain('Total Bookings: 20');
        expect(prompt).toContain('Unique Users: 10');
        expect(prompt).toContain('Avg Booking Duration: 60 minutes');
        expect(prompt).toContain('Room A');
        expect(prompt).toContain('09:00');
        expect(prompt).toContain('Male');
        expect(prompt).toContain('Developer');
        expect(prompt).toContain('25-34');
        expect(prompt).toContain('<$50k');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// generateTopInsights
// ─────────────────────────────────────────────────────────────────────────────

describe('generateTopInsights', () => {
    test('returns early when totalBookings < 5', async () => {
        getSpaceReportData.mockResolvedValue(makeReport({ totalBookings: 2 }));

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        expect(result).toEqual({ insights: [], message: 'Not enough data (minimum 5 bookings)' });
    });

    test('includes dataSnapshot in normal response', async () => {
        getSpaceReportData.mockResolvedValue(makeReport());

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        expect(result.source).toBe('rule-based-ranked');
        expect(result.dataSnapshot).toEqual({ totalBookings: 20, totalUniqueUsers: 10, totalRooms: 3 });
    });

    test('all insights have rank, source=rule-based, category, impact, title, message', async () => {
        getSpaceReportData.mockResolvedValue(makeReport());

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        result.insights.forEach((ins, idx) => {
            expect(ins.rank).toBe(idx + 1);
            expect(ins.source).toBe('rule-based');
            expect(ins.category).toBeDefined();
            expect(ins.impact).toBeDefined();
            expect(ins.title).toBeDefined();
            expect(ins.message).toBeDefined();
        });
    });

    test('utilization < 5% triggers risk_alert (score 95)', async () => {
        const report = makeReport({
            totalBookings: 10,
            roomUtilization: [
                { roomName: 'Ghost Room', roomType: 'Meeting Room', bookingCount: 1, totalHoursBooked: 2, utilizationPercent: 2 },
            ],
        });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const alert = result.insights.find(i => i.category === 'risk_alert');
        expect(alert).toBeDefined();
        expect(alert.title).toContain('Ghost Room');
        expect(alert.message).toContain('2%');
        expect(alert.impact).toBe('high');
    });

    test('utilization between 5% and 10% triggers space_optimization with medium impact (score 75)', async () => {
        const report = makeReport({
            totalBookings: 10,
            roomUtilization: [
                { roomName: 'Sleepy Room', roomType: 'Hot Desk', bookingCount: 2, totalHoursBooked: 4, utilizationPercent: 7 },
            ],
        });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const opt = result.insights.find(i => i.title && i.title.includes('Sleepy Room'));
        expect(opt).toBeDefined();
        expect(opt.category).toBe('space_optimization');
        expect(opt.impact).toBe('medium');
        expect(opt.message).toContain('7%');
    });

    test('room type dominance triggers when top/bottom ratio >= 3', async () => {
        const report = makeReport({
            totalBookings: 20,
            roomUtilization: [
                { roomName: 'A1', roomType: 'Meeting Room', bookingCount: 15, totalHoursBooked: 30, utilizationPercent: 50 },
                { roomName: 'A2', roomType: 'Meeting Room', bookingCount: 15, totalHoursBooked: 30, utilizationPercent: 50 },
                { roomName: 'B1', roomType: 'Hot Desk',     bookingCount: 5,  totalHoursBooked: 10, utilizationPercent: 20 },
            ],
        });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const dom = result.insights.find(i => i.title && i.title.includes('Meeting Room') && i.title.includes('dominate'));
        expect(dom).toBeDefined();
        expect(dom.category).toBe('space_optimization');
        expect(dom.impact).toBe('high');
        // ratio = 30/5 = 6
        expect(dom.message).toContain('6x');
    });

    test('room type dominance NOT triggered when ratio < 3', async () => {
        const report = makeReport({
            totalBookings: 10,
            roomUtilization: [
                { roomName: 'A1', roomType: 'Meeting Room', bookingCount: 6, totalHoursBooked: 12, utilizationPercent: 60 },
                { roomName: 'B1', roomType: 'Hot Desk',     bookingCount: 4, totalHoursBooked: 8,  utilizationPercent: 40 },
            ],
        });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const dom = result.insights.find(i => i.category === 'space_optimization' && i.title && i.title.includes('rooms dominate demand'));
        expect(dom).toBeUndefined();
    });

    test('room type dominance: botCount = 0 uses topCount as ratio', async () => {
        const report = makeReport({
            totalBookings: 15,
            roomUtilization: [
                { roomName: 'A1', roomType: 'Meeting Room', bookingCount: 15, totalHoursBooked: 30, utilizationPercent: 75 },
                { roomName: 'B1', roomType: 'Hot Desk',     bookingCount: 0,  totalHoursBooked: 0,  utilizationPercent: 0  },
            ],
        });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        // ratio = topCount = 15 >= 3
        const dom = result.insights.find(i => i.title && i.title.includes('dominate'));
        expect(dom).toBeDefined();
    });

    test('peak hour concentration > 50% triggers revenue_opportunity (score 70)', async () => {
        const report = makeReport({
            totalBookings: 10,
            peakHours: [
                { hour: 9,  count: 4 },
                { hour: 10, count: 2 },
                { hour: 11, count: 2 },
                { hour: 14, count: 1 },
                { hour: 15, count: 1 },
            ],
        });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const peakIns = result.insights.find(i => i.title === 'High peak-hour concentration');
        expect(peakIns).toBeDefined();
        expect(peakIns.category).toBe('revenue_opportunity');
        expect(peakIns.impact).toBe('high');
        expect(peakIns.message).toContain('80%');
        expect(peakIns.message).toContain('9:00');
        expect(peakIns.message).toContain('10:00');
        expect(peakIns.message).toContain('11:00');
    });

    test('peak hour concentration NOT triggered when <= 50%', async () => {
        const report = makeReport({
            totalBookings: 20,
            peakHours: [
                { hour: 9,  count: 3 },
                { hour: 10, count: 3 },
                { hour: 11, count: 4 },
                { hour: 14, count: 5 },
                { hour: 15, count: 5 },
            ],
        });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const peakIns = result.insights.find(i => i.title === 'High peak-hour concentration');
        expect(peakIns).toBeUndefined();
    });

    test('peak hour check skipped when fewer than 2 peak hours', async () => {
        const report = makeReport({
            totalBookings: 10,
            peakHours: [{ hour: 9, count: 10 }],
        });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const peakIns = result.insights.find(i => i.title === 'High peak-hour concentration');
        expect(peakIns).toBeUndefined();
    });

    test('demographic occupation > 40% triggers growth_opportunity (score 65)', async () => {
        const report = makeReport({
            demographicBreakdown: {
                ...makeReport().demographicBreakdown,
                byOccupation: [
                    { occupation: 'Developer', count: 9, percentage: 45 },
                    { occupation: 'Designer',  count: 11, percentage: 55 },
                ],
            },
        });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const occ = result.insights.find(i => i.category === 'growth_opportunity');
        expect(occ).toBeDefined();
        expect(occ.message).toContain('55%');
        expect(occ.impact).toBe('medium');
    });

    test('demographic occupation NOT triggered when top <= 40%', async () => {
        const report = makeReport({
            demographicBreakdown: {
                ...makeReport().demographicBreakdown,
                byOccupation: [
                    { occupation: 'Developer', count: 8,  percentage: 40 },
                    { occupation: 'Designer',  count: 12, percentage: 60 },
                ],
            },
        });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        // The top after sorting will be Designer at 60% > 40, so insight WILL fire.
        // Build a case where none exceed 40:
        const report2 = makeReport({
            demographicBreakdown: {
                ...makeReport().demographicBreakdown,
                byOccupation: [
                    { occupation: 'Developer', count: 8, percentage: 38 },
                    { occupation: 'Designer',  count: 7, percentage: 33 },
                    { occupation: 'Manager',   count: 5, percentage: 29 },
                ],
            },
        });
        getSpaceReportData.mockResolvedValue(report2);

        const result2 = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const occ = result2.insights.find(i => i.category === 'growth_opportunity');
        expect(occ).toBeUndefined();
    });

    test('occupation insight not triggered when fewer than 2 occupation entries', async () => {
        const report = makeReport({
            demographicBreakdown: {
                ...makeReport().demographicBreakdown,
                byOccupation: [
                    { occupation: 'Developer', count: 20, percentage: 100 },
                ],
            },
        });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const occ = result.insights.find(i => i.category === 'growth_opportunity');
        expect(occ).toBeUndefined();
    });

    test('weekday/weekend ratio >= 3 triggers revenue_opportunity weekend insight (score 60)', async () => {
        const report = makeReport({
            totalBookings: 31,
            bookingsByWeekday: [
                { day: 'Monday',    count: 6, percentage: 19 },
                { day: 'Tuesday',   count: 6, percentage: 19 },
                { day: 'Wednesday', count: 6, percentage: 19 },
                { day: 'Thursday',  count: 6, percentage: 19 },
                { day: 'Friday',    count: 6, percentage: 19 },
                { day: 'Saturday',  count: 1, percentage: 3  },
                { day: 'Sunday',    count: 0, percentage: 0  },
            ],
        });
        getSpaceReportData.mockResolvedValue(report);

        // avgWeekday = 30/5 = 6, avgWeekend = 1/2 = 0.5, ratio = 12 >= 3
        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const wknd = result.insights.find(i => i.title === 'Weekends are underutilized');
        expect(wknd).toBeDefined();
        expect(wknd.category).toBe('revenue_opportunity');
        expect(wknd.impact).toBe('medium');
    });

    test('weekday/weekend insight NOT triggered when ratio < 3', async () => {
        const report = makeReport({
            totalBookings: 14,
            bookingsByWeekday: [
                { day: 'Monday',    count: 2, percentage: 14 },
                { day: 'Tuesday',   count: 2, percentage: 14 },
                { day: 'Wednesday', count: 2, percentage: 14 },
                { day: 'Thursday',  count: 2, percentage: 14 },
                { day: 'Friday',    count: 2, percentage: 14 },
                { day: 'Saturday',  count: 2, percentage: 14 },
                { day: 'Sunday',    count: 2, percentage: 14 },
            ],
        });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const wknd = result.insights.find(i => i.title === 'Weekends are underutilized');
        expect(wknd).toBeUndefined();
    });

    test('weekday/weekend insight NOT triggered when avgWeekend is 0', async () => {
        const report = makeReport({
            totalBookings: 10,
            bookingsByWeekday: [
                { day: 'Monday',    count: 2, percentage: 20 },
                { day: 'Tuesday',   count: 2, percentage: 20 },
                { day: 'Wednesday', count: 2, percentage: 20 },
                { day: 'Thursday',  count: 2, percentage: 20 },
                { day: 'Friday',    count: 2, percentage: 20 },
                { day: 'Saturday',  count: 0, percentage: 0  },
                { day: 'Sunday',    count: 0, percentage: 0  },
            ],
        });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const wknd = result.insights.find(i => i.title === 'Weekends are underutilized');
        expect(wknd).toBeUndefined();
    });

    test('weekday/weekend insight NOT triggered when avgWeekday is 0', async () => {
        const report = makeReport({
            totalBookings: 4,
            bookingsByWeekday: [
                { day: 'Monday',    count: 0, percentage: 0  },
                { day: 'Tuesday',   count: 0, percentage: 0  },
                { day: 'Wednesday', count: 0, percentage: 0  },
                { day: 'Thursday',  count: 0, percentage: 0  },
                { day: 'Friday',    count: 0, percentage: 0  },
                { day: 'Saturday',  count: 2, percentage: 50 },
                { day: 'Sunday',    count: 2, percentage: 50 },
            ],
        });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const wknd = result.insights.find(i => i.title === 'Weekends are underutilized');
        expect(wknd).toBeUndefined();
    });

    test('empty bookingsByWeekday array results in avgWeekday/avgWeekend = 0 (no weekend insight)', async () => {
        const report = makeReport({ bookingsByWeekday: [] });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const wknd = result.insights.find(i => i.title === 'Weekends are underutilized');
        expect(wknd).toBeUndefined();
    });

    test('undefined bookingsByWeekday is treated as empty array (no weekend insight)', async () => {
        const report = makeReport({ bookingsByWeekday: undefined });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const wknd = result.insights.find(i => i.title === 'Weekends are underutilized');
        expect(wknd).toBeUndefined();
    });

    test('age group > 35% triggers customer_retention insight (score 50)', async () => {
        const report = makeReport({
            demographicBreakdown: {
                ...makeReport().demographicBreakdown,
                byAgeGroup: [
                    { ageGroup: '25-34', count: 14, percentage: 70 },
                    { ageGroup: '35-44', count: 4,  percentage: 20 },
                    { ageGroup: '45+',   count: 2,  percentage: 10 },
                ],
            },
        });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const ageIns = result.insights.find(i => i.category === 'customer_retention');
        expect(ageIns).toBeDefined();
        expect(ageIns.title).toContain('25-34');
        expect(ageIns.message).toContain('70%');
        expect(ageIns.impact).toBe('medium');
    });

    test('age group NOT triggered when top <= 35%', async () => {
        const report = makeReport({
            demographicBreakdown: {
                ...makeReport().demographicBreakdown,
                byAgeGroup: [
                    { ageGroup: '25-34', count: 7, percentage: 35 },
                    { ageGroup: '35-44', count: 7, percentage: 35 },
                    { ageGroup: '45+',   count: 6, percentage: 30 },
                ],
            },
        });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const ageIns = result.insights.find(i => i.category === 'customer_retention');
        expect(ageIns).toBeUndefined();
    });

    test('age group insight not triggered when fewer than 2 age groups', async () => {
        const report = makeReport({
            demographicBreakdown: {
                ...makeReport().demographicBreakdown,
                byAgeGroup: [
                    { ageGroup: '25-34', count: 20, percentage: 100 },
                ],
            },
        });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const ageIns = result.insights.find(i => i.category === 'customer_retention');
        expect(ageIns).toBeUndefined();
    });

    test('star room insight always added when roomUtilization is non-empty (score 45)', async () => {
        getSpaceReportData.mockResolvedValue(makeReport());

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const star = result.insights.find(i => i.title && i.title.includes('star room'));
        expect(star).toBeDefined();
        expect(star.category).toBe('operational_efficiency');
        expect(star.impact).toBe('low');
        // Room A has more bookings (15) than Room B (5)
        expect(star.title).toContain('Room A');
        expect(star.message).toContain('15 bookings');
    });

    test('star room insight NOT added when roomUtilization is empty', async () => {
        const report = makeReport({ roomUtilization: [] });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const star = result.insights.find(i => i.title && i.title.includes('star room'));
        expect(star).toBeUndefined();
    });

    test('results are capped at top 5 insights', async () => {
        // Create report that triggers ALL branches: <5% util, 5-10% util, type dominance,
        // peak concentration, occupation dominance, weekend gap, age concentration, star room
        const report = {
            spaceName: 'Busy Space',
            totalBookings: 100,
            totalUniqueUsers: 40,
            avgBookingDurationMinutes: 90,
            totalRooms: 5,
            roomUtilization: [
                { roomName: 'Ghost',  roomType: 'Phone Booth', bookingCount: 1,  totalHoursBooked: 2,  utilizationPercent: 2  }, // <5% → score 95
                { roomName: 'Slow',   roomType: 'Phone Booth', bookingCount: 3,  totalHoursBooked: 6,  utilizationPercent: 7  }, // 5-10% → score 75
                { roomName: 'Main1',  roomType: 'Meeting Room', bookingCount: 48, totalHoursBooked: 96, utilizationPercent: 80 }, // star room
                { roomName: 'Main2',  roomType: 'Meeting Room', bookingCount: 48, totalHoursBooked: 96, utilizationPercent: 80 },
            ],
            peakHours: [
                { hour: 9,  count: 40 },
                { hour: 10, count: 20 },
                { hour: 11, count: 15 },
                { hour: 14, count: 10 },
                { hour: 15, count: 15 },
            ],
            bookingsByWeekday: [
                { day: 'Monday',    count: 18, percentage: 18 },
                { day: 'Tuesday',   count: 18, percentage: 18 },
                { day: 'Wednesday', count: 18, percentage: 18 },
                { day: 'Thursday',  count: 18, percentage: 18 },
                { day: 'Friday',    count: 18, percentage: 18 },
                { day: 'Saturday',  count: 5,  percentage: 5  },
                { day: 'Sunday',    count: 5,  percentage: 5  },
            ],
            demographicBreakdown: {
                byGender: [{ gender: 'Male', count: 40, percentage: 100 }],
                byOccupation: [
                    { occupation: 'Developer', count: 50, percentage: 50 },
                    { occupation: 'Designer',  count: 30, percentage: 30 },
                    { occupation: 'Manager',   count: 20, percentage: 20 },
                ],
                byAgeGroup: [
                    { ageGroup: '25-34', count: 40, percentage: 40 },
                    { ageGroup: '35-44', count: 35, percentage: 35 },
                    { ageGroup: '45+',   count: 25, percentage: 25 },
                ],
                byRevenueRange: [
                    { range: '<$50k', count: 100, percentage: 100 },
                ],
            },
        };
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        expect(result.insights.length).toBeLessThanOrEqual(5);
        // Verify ranks are sequential starting at 1
        result.insights.forEach((ins, idx) => {
            expect(ins.rank).toBe(idx + 1);
        });
        // Top insight should be the risk_alert (score 95) for Ghost room
        expect(result.insights[0].category).toBe('risk_alert');
    });

    test('room type NOT triggered when fewer than 2 types', async () => {
        const report = makeReport({
            roomUtilization: [
                { roomName: 'A1', roomType: 'Meeting Room', bookingCount: 10, totalHoursBooked: 20, utilizationPercent: 50 },
                { roomName: 'A2', roomType: 'Meeting Room', bookingCount: 8,  totalHoursBooked: 16, utilizationPercent: 40 },
            ],
        });
        getSpaceReportData.mockResolvedValue(report);

        const result = await generateTopInsights({ space: 's1', from: 'a', to: 'b' });
        const dom = result.insights.find(i => i.category === 'space_optimization' && i.title && i.title.includes('rooms dominate demand'));
        expect(dom).toBeUndefined();
    });
});
