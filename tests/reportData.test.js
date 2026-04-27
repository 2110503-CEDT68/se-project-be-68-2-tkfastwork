jest.mock('../models/CoworkingSpace');
jest.mock('../models/Reservation');
jest.mock('../models/Room');
jest.mock('../models/User');
jest.mock('../utils/reportSchedule', () => ({ DEFAULT_LOOKBACK_DAYS: 30 }));

const CoworkingSpace = require('../models/CoworkingSpace');
const Reservation = require('../models/Reservation');
const Room = require('../models/Room');
const User = require('../models/User');

const { getOwnerReportData, getSpaceReportData, parseDateRange } = require('../services/reportData');

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// parseDateRange
// ---------------------------------------------------------------------------

describe('parseDateRange', () => {
    const now = new Date('2026-04-27T12:00:00.000Z');

    test('returns from and to when both valid ISO strings are provided', () => {
        const result = parseDateRange({ from: '2026-04-01', to: '2026-04-27', now });
        expect(result.from).toEqual(new Date('2026-04-01'));
        expect(result.to).toEqual(new Date('2026-04-27'));
    });

    test('calculates start from lookbackDays when only to is provided', () => {
        const result = parseDateRange({ to: '2026-04-27', now, lookbackDays: 7 });
        const expectedStart = new Date(new Date('2026-04-27').getTime() - 7 * 24 * 60 * 60 * 1000);
        expect(result.from).toEqual(expectedStart);
        expect(result.to).toEqual(new Date('2026-04-27'));
    });

    test('uses now and lookbackDays when neither from nor to is provided', () => {
        const result = parseDateRange({ now, lookbackDays: 30 });
        const expectedStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        expect(result.from).toEqual(expectedStart);
        expect(result.to).toEqual(now);
    });

    test('throws when to is an invalid date string', () => {
        expect(() => parseDateRange({ to: 'not-a-date', now })).toThrow('Invalid end date');
    });

    test('throws when from is an invalid date string', () => {
        expect(() => parseDateRange({ from: 'bad', to: '2026-04-27', now })).toThrow('Invalid start date');
    });

    test('throws when start is after end', () => {
        expect(() => parseDateRange({ from: '2026-05-01', to: '2026-04-01', now })).toThrow(
            'Start date must be before end date'
        );
    });
});

// ---------------------------------------------------------------------------
// getSpaceReportData — helpers exercised indirectly
// ---------------------------------------------------------------------------

const makeSpace = (overrides = {}) => ({
    _id: 'space-1',
    name: 'Test Space',
    address: '1 Main St',
    opentime: '09:00',
    closetime: '17:00',
    ...overrides
});

const makeRoom = (id, name, roomType = 'private') => ({
    _id: id,
    name,
    roomType,
    toString: () => id
});

const makeUser = (id, opts = {}) => ({
    _id: { toString: () => id },
    dateOfBirth: opts.dateOfBirth || '1990-01-15',
    occupation: opts.occupation || 'Engineer',
    gender: opts.gender || 'male',
    revenue: opts.revenue !== undefined ? opts.revenue : 35000
});

const makeReservation = (opts = {}) => ({
    apptDate: opts.apptDate || new Date('2026-04-10T10:00:00.000Z'),
    apptEnd: opts.apptEnd || new Date('2026-04-10T12:00:00.000Z'),
    room: { toString: () => opts.roomId || 'room-1' },
    user: opts.user !== undefined ? opts.user : makeUser('user-1')
});

// ---------------------------------------------------------------------------
// getAge / getAgeGroupLabel / getRevenueRangeLabel — via getSpaceReportData
// ---------------------------------------------------------------------------

describe('getSpaceReportData — age and demographic helpers', () => {
    const from = new Date('2026-04-01T00:00:00.000Z');
    const to = new Date('2026-04-30T00:00:00.000Z');
    // Use a fixed referenceDate so age calculations are deterministic
    const referenceDate = new Date('2026-04-27T00:00:00.000Z');

    const setupMocks = (users, roomId = 'room-1') => {
        Room.find = jest.fn().mockResolvedValue([makeRoom(roomId, 'Room A')]);
        const reservations = users.map((u, i) =>
            makeReservation({ roomId, user: u, apptDate: new Date(`2026-04-${10 + i}T10:00:00.000Z`), apptEnd: new Date(`2026-04-${10 + i}T12:00:00.000Z`) })
        );
        Reservation.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(reservations)
        });
    };

    test('age group <18 when user is under 18', async () => {
        const user = makeUser('u1', { dateOfBirth: '2015-06-01', occupation: 'Student', gender: 'female', revenue: 0 });
        setupMocks([user]);
        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        const ageEntry = report.demographicBreakdown.byAgeGroup.find((e) => e.ageGroup === '<18');
        expect(ageEntry).toBeDefined();
        expect(ageEntry.count).toBe(1);
    });

    test('age group 18-25', async () => {
        const user = makeUser('u2', { dateOfBirth: '2003-06-01', occupation: 'Student', gender: 'male', revenue: 5000 });
        setupMocks([user]);
        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        const ageEntry = report.demographicBreakdown.byAgeGroup.find((e) => e.ageGroup === '18-25');
        expect(ageEntry.count).toBe(1);
    });

    test('age group 26-35', async () => {
        const user = makeUser('u3', { dateOfBirth: '1995-06-01', occupation: 'Designer', gender: 'male', revenue: 30000 });
        setupMocks([user]);
        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        const ageEntry = report.demographicBreakdown.byAgeGroup.find((e) => e.ageGroup === '26-35');
        expect(ageEntry.count).toBe(1);
    });

    test('age group 36-50', async () => {
        const user = makeUser('u4', { dateOfBirth: '1982-06-01', occupation: 'Manager', gender: 'female', revenue: 60000 });
        setupMocks([user]);
        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        const ageEntry = report.demographicBreakdown.byAgeGroup.find((e) => e.ageGroup === '36-50');
        expect(ageEntry.count).toBe(1);
    });

    test('age group 50+', async () => {
        const user = makeUser('u5', { dateOfBirth: '1965-06-01', occupation: 'Consultant', gender: 'male', revenue: 120000 });
        setupMocks([user]);
        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        const ageEntry = report.demographicBreakdown.byAgeGroup.find((e) => e.ageGroup === '50+');
        expect(ageEntry.count).toBe(1);
    });

    test('birthday not yet passed in reference year reduces age by 1', async () => {
        // referenceDate is 2026-04-27, birthday is June → not passed yet
        const user = makeUser('u6', { dateOfBirth: '2008-06-15', occupation: 'Student', gender: 'female', revenue: 0 });
        setupMocks([user]);
        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        // 2026 - 2008 = 18, but June not passed in April → age = 17 → '<18'
        const ageEntry = report.demographicBreakdown.byAgeGroup.find((e) => e.ageGroup === '<18');
        expect(ageEntry.count).toBe(1);
    });

    test('invalid dateOfBirth skips age grouping', async () => {
        const user = makeUser('u7', { dateOfBirth: 'not-a-date', occupation: 'Engineer', gender: 'male', revenue: 25000 });
        setupMocks([user]);
        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        // All age group counts should be 0 since age returned null
        const total = report.demographicBreakdown.byAgeGroup.reduce((s, e) => s + e.count, 0);
        expect(total).toBe(0);
    });

    test('revenue range 0-20000', async () => {
        const user = makeUser('u8', { revenue: 10000 });
        setupMocks([user]);
        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        const entry = report.demographicBreakdown.byRevenueRange.find((e) => e.range === '0-20000');
        expect(entry.count).toBe(1);
    });

    test('revenue range 20001-50000', async () => {
        const user = makeUser('u9', { revenue: 35000 });
        setupMocks([user]);
        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        const entry = report.demographicBreakdown.byRevenueRange.find((e) => e.range === '20001-50000');
        expect(entry.count).toBe(1);
    });

    test('revenue range 50001-100000', async () => {
        const user = makeUser('u10', { revenue: 75000 });
        setupMocks([user]);
        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        const entry = report.demographicBreakdown.byRevenueRange.find((e) => e.range === '50001-100000');
        expect(entry.count).toBe(1);
    });

    test('revenue range 100001+', async () => {
        const user = makeUser('u11', { revenue: 200000 });
        setupMocks([user]);
        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        const entry = report.demographicBreakdown.byRevenueRange.find((e) => e.range === '100001+');
        expect(entry.count).toBe(1);
    });

    test('user with no gender falls back to unknown', async () => {
        const user = makeUser('u12', { gender: undefined });
        user.gender = undefined;
        setupMocks([user]);
        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        const entry = report.demographicBreakdown.byGender.find((e) => e.gender === 'unknown');
        expect(entry).toBeDefined();
    });

    test('user with no occupation falls back to unknown', async () => {
        const user = makeUser('u13', {});
        user.occupation = undefined;
        setupMocks([user]);
        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        const entry = report.demographicBreakdown.byOccupation.find((e) => e.occupation === 'unknown');
        expect(entry).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// buildDistribution — total = 0 branch
// ---------------------------------------------------------------------------

describe('getSpaceReportData — buildDistribution with zero total', () => {
    test('percentage is 0 when there are no unique users', async () => {
        Room.find = jest.fn().mockResolvedValue([makeRoom('room-1', 'Room A')]);
        // Reservation with no user → uniqueUsers stays empty
        const res = makeReservation({ user: null });
        Reservation.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue([res])
        });

        const report = await getSpaceReportData({
            space: makeSpace(),
            from: new Date('2026-04-01'),
            to: new Date('2026-04-30'),
            referenceDate: new Date('2026-04-27')
        });

        // totalUniqueUsers = 0 so every demographic percentage should be 0
        report.demographicBreakdown.byGender.forEach((e) => expect(e.percentage).toBe(0));
    });
});

// ---------------------------------------------------------------------------
// calculateAvailableHoursPerRoom — missing opentime/closetime defaults
// ---------------------------------------------------------------------------

describe('getSpaceReportData — calculateAvailableHoursPerRoom defaults', () => {
    test('uses 08:00–18:00 defaults when opentime/closetime are missing', async () => {
        const space = makeSpace({ opentime: undefined, closetime: undefined });
        Room.find = jest.fn().mockResolvedValue([makeRoom('room-1', 'Room A')]);
        Reservation.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue([])
        });

        const report = await getSpaceReportData({
            space,
            from: new Date('2026-04-27T00:00:00.000Z'),
            to: new Date('2026-04-28T00:00:00.000Z'),
            referenceDate: new Date('2026-04-27')
        });

        // Default 08–18 = 10 hrs/day × 1 day = 10; utilization 0/10 = 0
        expect(report.roomUtilization[0].utilizationPercent).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// getSpaceReportData — main flows
// ---------------------------------------------------------------------------

describe('getSpaceReportData', () => {
    const from = new Date('2026-04-01T00:00:00.000Z');
    const to = new Date('2026-04-30T00:00:00.000Z');
    const referenceDate = new Date('2026-04-27T00:00:00.000Z');

    test('throws when spaceId lookup returns null', async () => {
        CoworkingSpace.findById = jest.fn().mockResolvedValue(null);
        Room.find = jest.fn().mockResolvedValue([]);
        Reservation.find = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });

        await expect(
            getSpaceReportData({ spaceId: 'missing-id', from, to, referenceDate })
        ).rejects.toThrow('Coworking space not found');
    });

    test('looks up space by spaceId when no space object given', async () => {
        const space = makeSpace();
        CoworkingSpace.findById = jest.fn().mockResolvedValue(space);
        Room.find = jest.fn().mockResolvedValue([makeRoom('room-1', 'Room A')]);
        Reservation.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue([])
        });

        const report = await getSpaceReportData({ spaceId: 'space-1', from, to, referenceDate });
        expect(CoworkingSpace.findById).toHaveBeenCalledWith('space-1');
        expect(report.spaceId).toBe('space-1');
    });

    test('full flow with rooms and reservations', async () => {
        const space = makeSpace();
        const room = makeRoom('room-1', 'Room A', 'meeting');
        const user1 = makeUser('user-1', { dateOfBirth: '1990-03-10', occupation: 'Engineer', gender: 'male', revenue: 45000 });
        const user2 = makeUser('user-2', { dateOfBirth: '1985-11-20', occupation: 'Designer', gender: 'female', revenue: 55000 });
        const res1 = makeReservation({
            roomId: 'room-1',
            user: user1,
            apptDate: new Date('2026-04-10T09:00:00.000Z'),
            apptEnd: new Date('2026-04-10T11:00:00.000Z')
        });
        const res2 = makeReservation({
            roomId: 'room-1',
            user: user2,
            apptDate: new Date('2026-04-11T14:00:00.000Z'),
            apptEnd: new Date('2026-04-11T16:00:00.000Z')
        });

        Room.find = jest.fn().mockResolvedValue([room]);
        Reservation.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue([res1, res2])
        });

        const report = await getSpaceReportData({ space, from, to, referenceDate });

        expect(report.spaceName).toBe('Test Space');
        expect(report.totalBookings).toBe(2);
        expect(report.totalUniqueUsers).toBe(2);
        expect(report.totalRooms).toBe(1);
        expect(report.roomUtilization).toHaveLength(1);
        expect(report.roomUtilization[0].bookingCount).toBe(2);
        expect(report.roomUtilization[0].totalHoursBooked).toBe(4);
        expect(report.peakHours.length).toBeGreaterThan(0);
        expect(report.bookingsByWeekday.length).toBeGreaterThan(0);
        expect(report.demographicBreakdown.byGender).toBeDefined();
        expect(report.demographicBreakdown.byOccupation).toBeDefined();
        expect(report.insights).toBeDefined();
        expect(Array.isArray(report.insights)).toBe(true);
    });

    test('reservation with no room field does not crash', async () => {
        const space = makeSpace();
        Room.find = jest.fn().mockResolvedValue([makeRoom('room-1', 'Room A')]);
        const res = { apptDate: new Date('2026-04-10T10:00:00.000Z'), apptEnd: new Date('2026-04-10T12:00:00.000Z'), room: null, user: makeUser('u1') };
        Reservation.find = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([res]) });

        const report = await getSpaceReportData({ space, from, to, referenceDate });
        expect(report.roomUtilization[0].bookingCount).toBe(0);
    });

    test('reservation with user lacking _id is not counted as unique user', async () => {
        const space = makeSpace();
        Room.find = jest.fn().mockResolvedValue([makeRoom('room-1', 'Room A')]);
        const userNoId = { dateOfBirth: '1990-01-01', occupation: 'X', gender: 'male', revenue: 0 }; // no _id
        const res = makeReservation({ user: userNoId });
        Reservation.find = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([res]) });

        const report = await getSpaceReportData({ space, from, to, referenceDate });
        expect(report.totalUniqueUsers).toBe(0);
    });

    test('avgBookingDurationMinutes is 0 when there are no bookings', async () => {
        Room.find = jest.fn().mockResolvedValue([makeRoom('room-1', 'Room A')]);
        Reservation.find = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });

        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        expect(report.avgBookingDurationMinutes).toBe(0);
    });

    test('utilizationPercent is 0 when availableHoursPerRoom is 0', async () => {
        // opentime === closetime → hoursPerDay = 0
        const space = makeSpace({ opentime: '10:00', closetime: '10:00' });
        Room.find = jest.fn().mockResolvedValue([makeRoom('room-1', 'Room A')]);
        const res = makeReservation({ roomId: 'room-1' });
        Reservation.find = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([res]) });

        const report = await getSpaceReportData({ space, from, to, referenceDate });
        expect(report.roomUtilization[0].utilizationPercent).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// buildInsights — exercised via getSpaceReportData
// ---------------------------------------------------------------------------

describe('buildInsights via getSpaceReportData', () => {
    const from = new Date('2026-04-01T00:00:00.000Z');
    const to = new Date('2026-04-30T00:00:00.000Z');
    const referenceDate = new Date('2026-04-27T00:00:00.000Z');

    test('returns single info message when there are no reservations', async () => {
        Room.find = jest.fn().mockResolvedValue([makeRoom('room-1', 'Room A')]);
        Reservation.find = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });

        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        expect(report.insights).toHaveLength(1);
        expect(report.insights[0].type).toBe('activity');
        expect(report.insights[0].severity).toBe('info');
        expect(report.insights[0].message).toContain('No reservations');
    });

    test('includes busiest room insight when reservations exist', async () => {
        Room.find = jest.fn().mockResolvedValue([makeRoom('room-1', 'Room A')]);
        const user = makeUser('u1');
        const reservations = Array.from({ length: 3 }, (_, i) =>
            makeReservation({ roomId: 'room-1', user, apptDate: new Date(`2026-04-${10 + i}T10:00:00.000Z`), apptEnd: new Date(`2026-04-${10 + i}T12:00:00.000Z`) })
        );
        Reservation.find = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(reservations) });

        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        const roomInsight = report.insights.find((i) => i.type === 'room_popularity');
        expect(roomInsight).toBeDefined();
        expect(roomInsight.message).toContain('Room A');
    });

    test('includes underused room warning when utilization < 10%', async () => {
        // Use a large date range so available hours >> booked hours → utilization < 10%
        const wideFrom = new Date('2026-01-01T00:00:00.000Z');
        const wideTo = new Date('2026-12-31T00:00:00.000Z');
        Room.find = jest.fn().mockResolvedValue([makeRoom('room-1', 'Low Usage Room')]);
        const user = makeUser('u1');
        // Only 1 reservation across the whole year
        const res = makeReservation({ roomId: 'room-1', user, apptDate: new Date('2026-06-01T10:00:00.000Z'), apptEnd: new Date('2026-06-01T11:00:00.000Z') });
        Reservation.find = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([res]) });

        const report = await getSpaceReportData({ space: makeSpace(), from: wideFrom, to: wideTo, referenceDate });
        const warning = report.insights.find((i) => i.type === 'utilization_alert');
        expect(warning).toBeDefined();
        expect(warning.severity).toBe('warning');
    });

    test('includes peak hours insight', async () => {
        Room.find = jest.fn().mockResolvedValue([makeRoom('room-1', 'Room A')]);
        const user = makeUser('u1');
        const res = makeReservation({ roomId: 'room-1', user });
        Reservation.find = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([res]) });

        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        const timeInsight = report.insights.find((i) => i.type === 'time_pattern');
        expect(timeInsight).toBeDefined();
    });

    test('includes demographic_comparison insight when occupation exists', async () => {
        Room.find = jest.fn().mockResolvedValue([makeRoom('room-1', 'Room A')]);
        const user = makeUser('u1', { occupation: 'Engineer' });
        const res = makeReservation({ roomId: 'room-1', user });
        Reservation.find = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([res]) });

        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        const demoInsight = report.insights.find((i) => i.type === 'demographic_comparison');
        expect(demoInsight).toBeDefined();
        expect(demoInsight.message).toContain('Engineer');
    });

    test('includes report_window insight', async () => {
        Room.find = jest.fn().mockResolvedValue([makeRoom('room-1', 'Room A')]);
        const user = makeUser('u1');
        const res = makeReservation({ roomId: 'room-1', user });
        Reservation.find = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([res]) });

        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        const windowInsight = report.insights.find((i) => i.type === 'report_window');
        expect(windowInsight).toBeDefined();
        expect(windowInsight.message).toContain(from.toISOString());
        expect(windowInsight.message).toContain(to.toISOString());
    });

    test('insights are capped at 5 entries', async () => {
        // Provide 2 rooms where both are underused (< 10%) to generate extra warnings
        const wideFrom = new Date('2026-01-01T00:00:00.000Z');
        const wideTo = new Date('2026-12-31T00:00:00.000Z');
        const room1 = makeRoom('room-1', 'Room A');
        const room2 = makeRoom('room-2', 'Room B');
        Room.find = jest.fn().mockResolvedValue([room1, room2]);
        const user = makeUser('u1', { occupation: 'Doctor' });
        const res1 = makeReservation({ roomId: 'room-1', user, apptDate: new Date('2026-06-01T10:00:00.000Z'), apptEnd: new Date('2026-06-01T11:00:00.000Z') });
        const res2 = makeReservation({ roomId: 'room-2', user: makeUser('u2'), apptDate: new Date('2026-06-02T14:00:00.000Z'), apptEnd: new Date('2026-06-02T15:00:00.000Z') });
        Reservation.find = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([res1, res2]) });

        const report = await getSpaceReportData({ space: makeSpace(), from: wideFrom, to: wideTo, referenceDate });
        expect(report.insights.length).toBeLessThanOrEqual(5);
    });
});

// ---------------------------------------------------------------------------
// getOwnerReportData
// ---------------------------------------------------------------------------

describe('getOwnerReportData', () => {
    const referenceDate = new Date('2026-04-27T00:00:00.000Z');
    const from = '2026-04-01';
    const to = '2026-04-27';

    const setupSpaceMocks = (spaces) => {
        CoworkingSpace.find = jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(spaces)
        });
        Room.find = jest.fn().mockResolvedValue([makeRoom('room-1', 'Room A')]);
        Reservation.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue([])
        });
    };

    test('throws when owner is not found', async () => {
        User.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(null)
        });

        await expect(
            getOwnerReportData({ ownerId: 'missing', from, to, referenceDate })
        ).rejects.toThrow('Owner not found');
    });

    test('returns owner report with empty spaces array', async () => {
        const owner = { _id: 'owner-1', name: 'Alice', email: 'alice@test.com' };
        User.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(owner)
        });
        setupSpaceMocks([]);

        const result = await getOwnerReportData({ ownerId: 'owner-1', from, to, referenceDate });

        expect(result.owner.id).toBe('owner-1');
        expect(result.owner.name).toBe('Alice');
        expect(result.owner.email).toBe('alice@test.com');
        expect(result.totals.totalSpaces).toBe(0);
        expect(result.totals.totalBookings).toBe(0);
        expect(result.totals.totalUniqueUsers).toBe(0);
        expect(result.spaces).toHaveLength(0);
        expect(result.generatedAt).toEqual(referenceDate);
        expect(result.window.from).toBeDefined();
        expect(result.window.to).toBeDefined();
    });

    test('aggregates totals across multiple spaces', async () => {
        const owner = { _id: 'owner-1', name: 'Bob', email: 'bob@test.com' };
        User.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(owner)
        });

        const space1 = makeSpace({ _id: 'space-1', name: 'Space One' });
        const space2 = makeSpace({ _id: 'space-2', name: 'Space Two' });
        CoworkingSpace.find = jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([space1, space2])
        });

        const user1 = makeUser('user-1');
        const user2 = makeUser('user-2');
        const res1 = makeReservation({ roomId: 'room-1', user: user1 });
        const res2 = makeReservation({ roomId: 'room-1', user: user2 });

        Room.find = jest.fn().mockResolvedValue([makeRoom('room-1', 'Room A')]);
        Reservation.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue([res1, res2])
        });

        const result = await getOwnerReportData({ ownerId: 'owner-1', from, to, referenceDate });

        expect(result.spaces).toHaveLength(2);
        expect(result.totals.totalSpaces).toBe(2);
        // Each space has 2 bookings and 2 unique users
        expect(result.totals.totalBookings).toBe(4);
        expect(result.totals.totalUniqueUsers).toBe(4);
    });

    test('uses DEFAULT_LOOKBACK_DAYS when lookbackDays not provided', async () => {
        const owner = { _id: 'owner-1', name: 'Carol', email: 'carol@test.com' };
        User.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(owner)
        });
        setupSpaceMocks([]);

        // Not passing lookbackDays — should default to 30 from mock
        const result = await getOwnerReportData({ ownerId: 'owner-1', referenceDate });
        const windowMs = result.window.to - result.window.from;
        const windowDays = windowMs / (24 * 60 * 60 * 1000);
        expect(windowDays).toBeCloseTo(30, 0);
    });
});

// ---------------------------------------------------------------------------
// Branch coverage: default-arg defaults, edge cases, and no-rooms path
// ---------------------------------------------------------------------------

describe('parseDateRange — default parameter branches', () => {
    test('uses new Date() as now when not provided', () => {
        // Exercises the `now = new Date()` default-arg branch
        const before = Date.now();
        const result = parseDateRange({ lookbackDays: 30 });
        const after = Date.now();
        expect(result.to.getTime()).toBeGreaterThanOrEqual(before);
        expect(result.to.getTime()).toBeLessThanOrEqual(after);
    });

    test('uses DEFAULT_LOOKBACK_DAYS when lookbackDays not provided', () => {
        // Exercises the `lookbackDays = DEFAULT_LOOKBACK_DAYS` default-arg branch
        const now = new Date('2026-04-27T12:00:00.000Z');
        const result = parseDateRange({ now });
        const windowDays = (result.to - result.from) / (24 * 60 * 60 * 1000);
        expect(windowDays).toBeCloseTo(30, 0);
    });
});

describe('getAge — birthday same month, day not yet reached (exact-month branch)', () => {
    test('returns age - 1 when birthday month matches but day not yet reached', async () => {
        const from = new Date('2026-04-01T00:00:00.000Z');
        const to = new Date('2026-04-30T00:00:00.000Z');
        // referenceDate is April 10; birthday is April 20 → same month, day not reached
        const referenceDate = new Date('2026-04-10T00:00:00.000Z');
        const user = makeUser('u-sameMonth', { dateOfBirth: '1990-04-20', occupation: 'Engineer', gender: 'male', revenue: 30000 });

        Room.find = jest.fn().mockResolvedValue([makeRoom('room-1', 'Room A')]);
        Reservation.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue([makeReservation({ user })])
        });

        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        // 2026 - 1990 = 36, but April 20 not yet reached on April 10 → age = 35 → '26-35'
        const entry = report.demographicBreakdown.byAgeGroup.find((e) => e.ageGroup === '26-35');
        expect(entry.count).toBe(1);
    });
});

describe('getAgeGroupLabel / getRevenueRangeLabel — fallback branch (no matching range)', () => {
    test('getAgeGroupLabel returns 50+ for age > 200 (find returns undefined)', async () => {
        // Age > 200 falls outside all AGE_GROUPS ranges; the ternary's false branch returns '50+'
        // We can trigger this by using a very old birth year
        const from = new Date('2026-04-01T00:00:00.000Z');
        const to = new Date('2026-04-30T00:00:00.000Z');
        const referenceDate = new Date('2026-04-27T00:00:00.000Z');
        const user = makeUser('u-ancient', { dateOfBirth: '1800-01-01', occupation: 'Elder', gender: 'male', revenue: 0 });

        Room.find = jest.fn().mockResolvedValue([makeRoom('room-1', 'Room A')]);
        Reservation.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue([makeReservation({ user })])
        });

        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        // Age ~226, beyond max: getAgeGroupLabel returns '50+' via the ternary false branch
        const entry = report.demographicBreakdown.byAgeGroup.find((e) => e.ageGroup === '50+');
        expect(entry).toBeDefined();
    });

    test('getRevenueRangeLabel returns 100001+ for negative revenue (find returns undefined)', async () => {
        // Negative revenue matches no range; ternary false branch returns '100001+'
        const from = new Date('2026-04-01T00:00:00.000Z');
        const to = new Date('2026-04-30T00:00:00.000Z');
        const referenceDate = new Date('2026-04-27T00:00:00.000Z');
        const user = makeUser('u-negrev', { revenue: -1 });
        user.revenue = -1;

        Room.find = jest.fn().mockResolvedValue([makeRoom('room-1', 'Room A')]);
        Reservation.find = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue([makeReservation({ user })])
        });

        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        const entry = report.demographicBreakdown.byRevenueRange.find((e) => e.range === '100001+');
        expect(entry).toBeDefined();
    });
});

describe('buildInsights — no busiestRoom and no peakHours branches', () => {
    const from = new Date('2026-04-01T00:00:00.000Z');
    const to = new Date('2026-04-30T00:00:00.000Z');
    const referenceDate = new Date('2026-04-27T00:00:00.000Z');

    test('skips busiest-room insight when there are no rooms', async () => {
        // roomUtilization is empty → busiestRoom is undefined → if(busiestRoom) false branch
        Room.find = jest.fn().mockResolvedValue([]);
        const user = makeUser('u1');
        // reservation without a matching room (room-1 not in rooms list)
        const res = makeReservation({ roomId: 'room-1', user });
        Reservation.find = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([res]) });

        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        const roomInsight = report.insights.find((i) => i.type === 'room_popularity');
        expect(roomInsight).toBeUndefined();
    });

    test('includes peak-hours insight when reservations exist (peakHours.length > 0 is always true with reservations)', async () => {
        // When reservations exist, hourCounts always has at least one entry, so peakHours.length > 0 is true.
        // This test confirms the time_pattern insight is produced in the normal path.
        Room.find = jest.fn().mockResolvedValue([makeRoom('room-1', 'Room A')]);
        const user = makeUser('u1');
        const res = makeReservation({ roomId: 'room-1', user });
        Reservation.find = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([res]) });

        const report = await getSpaceReportData({ space: makeSpace(), from, to, referenceDate });
        const timeInsight = report.insights.find((i) => i.type === 'time_pattern');
        expect(timeInsight).toBeDefined();
        expect(timeInsight.type).toBe('time_pattern');
    });
});

describe('getSpaceReportData — default referenceDate branch', () => {
    test('uses new Date() as referenceDate when not supplied', async () => {
        // Exercises the `referenceDate = new Date()` default-arg branch on line 145
        Room.find = jest.fn().mockResolvedValue([makeRoom('room-1', 'Room A')]);
        Reservation.find = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });

        const report = await getSpaceReportData({
            space: makeSpace(),
            from: new Date('2026-04-01'),
            to: new Date('2026-04-30')
            // no referenceDate
        });
        expect(report.spaceId).toBe('space-1');
    });
});

describe('getOwnerReportData — default referenceDate branch', () => {
    test('uses new Date() as referenceDate when not supplied', async () => {
        // Exercises the `referenceDate = new Date()` default-arg branch on line 279
        const owner = { _id: 'owner-1', name: 'Dave', email: 'dave@test.com' };
        User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(owner) });
        CoworkingSpace.find = jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });

        const result = await getOwnerReportData({ ownerId: 'owner-1', from: '2026-04-01', to: '2026-04-27' });
        expect(result.owner.name).toBe('Dave');
        expect(result.generatedAt).toBeInstanceOf(Date);
    });
});
