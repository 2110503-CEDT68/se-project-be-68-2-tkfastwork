const CoworkingSpace = require('../models/CoworkingSpace');
const Reservation = require('../models/Reservation');
const Room = require('../models/Room');
const User = require('../models/User');
const { DEFAULT_LOOKBACK_DAYS } = require('../utils/reportSchedule');

const AGE_GROUPS = [
    { label: '<18', min: 0, max: 17 },
    { label: '18-25', min: 18, max: 25 },
    { label: '26-35', min: 26, max: 35 },
    { label: '36-50', min: 36, max: 50 },
    { label: '50+', min: 51, max: 200 }
];

const REVENUE_RANGES = [
    { label: '0-20000', min: 0, max: 20000 },
    { label: '20001-50000', min: 20001, max: 50000 },
    { label: '50001-100000', min: 50001, max: 100000 },
    { label: '100001+', min: 100001, max: Infinity }
];

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const roundToTwo = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());

const parseDateRange = ({ from, to, now = new Date(), lookbackDays = DEFAULT_LOOKBACK_DAYS } = {}) => {
    const end = to ? new Date(to) : new Date(now);
    if (!isValidDate(end)) {
        throw new Error('Invalid end date');
    }

    const start = from
        ? new Date(from)
        : new Date(end.getTime() - (lookbackDays * 24 * 60 * 60 * 1000));

    if (!isValidDate(start)) {
        throw new Error('Invalid start date');
    }

    if (start > end) {
        throw new Error('Start date must be before end date');
    }

    return { from: start, to: end };
};

const getAge = (dateOfBirth, referenceDate = new Date()) => {
    const dob = new Date(dateOfBirth);
    if (!isValidDate(dob)) return null;

    let age = referenceDate.getFullYear() - dob.getFullYear();
    const monthDiff = referenceDate.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < dob.getDate())) {
        age -= 1;
    }

    return age;
};

const getAgeGroupLabel = (age) => {
    const group = AGE_GROUPS.find((item) => age >= item.min && age <= item.max);
    return group ? group.label : '50+';
};

const getRevenueRangeLabel = (revenue) => {
    const range = REVENUE_RANGES.find((item) => revenue >= item.min && revenue <= item.max);
    return range ? range.label : '100001+';
};

const buildDistribution = (map, total, keyName) => Object.entries(map).map(([key, count]) => ({
    [keyName]: key,
    count,
    percentage: total > 0 ? roundToTwo((count / total) * 100) : 0
}));

const calculateAvailableHoursPerRoom = (space, from, to) => {
    const openHour = Number.parseInt(String(space.opentime || '08:00').split(':')[0], 10);
    const closeHour = Number.parseInt(String(space.closetime || '18:00').split(':')[0], 10);
    const hoursPerDay = Math.max(closeHour - openHour, 0);
    const totalDays = Math.max(Math.ceil((to - from) / (24 * 60 * 60 * 1000)), 1);
    return totalDays * hoursPerDay;
};

const buildInsights = ({ space, reservations, roomUtilization, byOccupation, peakHours, from, to }) => {
    const insights = [];

    if (reservations.length === 0) {
        return [{
            type: 'activity',
            severity: 'info',
            message: `No reservations were recorded for ${space.name} in this reporting window.`
        }];
    }

    const busiestRoom = [...roomUtilization].sort((left, right) => right.bookingCount - left.bookingCount)[0];
    if (busiestRoom) {
        insights.push({
            type: 'room_popularity',
            severity: 'info',
            message: `The busiest room was "${busiestRoom.roomName}" with ${busiestRoom.bookingCount} bookings.`
        });
    }

    const quietRooms = roomUtilization
        .filter((room) => room.utilizationPercent < 10)
        .sort((left, right) => left.utilizationPercent - right.utilizationPercent)
        .slice(0, 2);

    quietRooms.forEach((room) => {
        insights.push({
            type: 'utilization_alert',
            severity: 'warning',
            message: `Room "${room.roomName}" is underused at ${room.utilizationPercent}% utilization during this period.`
        });
    });

    if (peakHours.length > 0) {
        insights.push({
            type: 'time_pattern',
            severity: 'info',
            message: `The busiest booking hour was ${String(peakHours[0].hour).padStart(2, '0')}:00 with ${peakHours[0].count} bookings.`
        });
    }

    const topOccupation = [...byOccupation].sort((left, right) => right.count - left.count)[0];
    if (topOccupation && topOccupation.count > 0) {
        insights.push({
            type: 'demographic_comparison',
            severity: 'info',
            message: `${topOccupation.occupation} was the largest customer segment in this report window.`
        });
    }

    insights.push({
        type: 'report_window',
        severity: 'info',
        message: `This report covers bookings from ${from.toISOString()} to ${to.toISOString()}.`
    });

    return insights.slice(0, 5);
};

const getSpaceReportData = async ({ space, spaceId, from, to, referenceDate = new Date() }) => {
    const targetSpace = space || await CoworkingSpace.findById(spaceId);
    if (!targetSpace) {
        throw new Error('Coworking space not found');
    }

    const rooms = await Room.find({ coworkingSpace: targetSpace._id });
    const reservations = await Reservation.find({
        coworkingSpace: targetSpace._id,
        apptDate: { $gte: from, $lte: to }
    }).populate({ path: 'user', select: 'dateOfBirth occupation gender revenue' });

    const totalBookings = reservations.length;
    const uniqueUsers = new Map();

    reservations.forEach((reservation) => {
        if (reservation.user && reservation.user._id) {
            uniqueUsers.set(reservation.user._id.toString(), reservation.user);
        }
    });

    const totalUniqueUsers = uniqueUsers.size;
    const availableHoursPerRoom = calculateAvailableHoursPerRoom(targetSpace, from, to);

    const roomUtilization = rooms.map((room) => {
        const roomReservations = reservations.filter((reservation) =>
            reservation.room && reservation.room.toString() === room._id.toString()
        );

        const totalHoursBooked = roomReservations.reduce((sum, reservation) => {
            const duration = (new Date(reservation.apptEnd) - new Date(reservation.apptDate)) / (1000 * 60 * 60);
            return sum + Math.max(duration, 0);
        }, 0);

        const utilizationPercent = availableHoursPerRoom > 0
            ? roundToTwo((totalHoursBooked / availableHoursPerRoom) * 100)
            : 0;

        return {
            roomId: room._id,
            roomName: room.name,
            roomType: room.roomType,
            bookingCount: roomReservations.length,
            totalHoursBooked: roundToTwo(totalHoursBooked),
            utilizationPercent
        };
    });

    const totalDurationMinutes = reservations.reduce((sum, reservation) => (
        sum + Math.max((new Date(reservation.apptEnd) - new Date(reservation.apptDate)) / (1000 * 60), 0)
    ), 0);

    const avgBookingDurationMinutes = totalBookings > 0
        ? roundToTwo(totalDurationMinutes / totalBookings)
        : 0;

    const hourCounts = {};
    const weekdayCounts = {};
    reservations.forEach((reservation) => {
        const startDate = new Date(reservation.apptDate);
        const hour = startDate.getUTCHours();
        const weekday = DAYS_OF_WEEK[startDate.getUTCDay()];

        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        weekdayCounts[weekday] = (weekdayCounts[weekday] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour: Number.parseInt(hour, 10), count }))
        .sort((left, right) => right.count - left.count)
        .slice(0, 5);

    const uniqueUserList = Array.from(uniqueUsers.values());
    const genderMap = {};
    const occupationMap = {};
    const ageMap = AGE_GROUPS.reduce((acc, group) => ({ ...acc, [group.label]: 0 }), {});
    const revenueMap = REVENUE_RANGES.reduce((acc, group) => ({ ...acc, [group.label]: 0 }), {});

    uniqueUserList.forEach((user) => {
        const gender = user.gender || 'unknown';
        const occupation = user.occupation || 'unknown';
        const revenueRange = getRevenueRangeLabel(user.revenue || 0);

        genderMap[gender] = (genderMap[gender] || 0) + 1;
        occupationMap[occupation] = (occupationMap[occupation] || 0) + 1;
        revenueMap[revenueRange] = (revenueMap[revenueRange] || 0) + 1;

        const age = getAge(user.dateOfBirth, referenceDate);
        if (age !== null) {
            const ageGroup = getAgeGroupLabel(age);
            ageMap[ageGroup] = (ageMap[ageGroup] || 0) + 1;
        }
    });

    const byGender = buildDistribution(genderMap, totalUniqueUsers, 'gender');
    const byOccupation = buildDistribution(occupationMap, totalUniqueUsers, 'occupation');
    const byAgeGroup = buildDistribution(ageMap, totalUniqueUsers, 'ageGroup');
    const byRevenueRange = buildDistribution(revenueMap, totalUniqueUsers, 'range');
    const bookingsByWeekday = buildDistribution(weekdayCounts, totalBookings, 'day');

    const report = {
        spaceId: targetSpace._id,
        spaceName: targetSpace.name,
        address: targetSpace.address,
        openTime: targetSpace.opentime,
        closeTime: targetSpace.closetime,
        totalBookings,
        totalUniqueUsers,
        totalRooms: rooms.length,
        avgBookingDurationMinutes,
        peakHours,
        roomUtilization,
        bookingsByWeekday,
        demographicBreakdown: {
            byGender,
            byOccupation,
            byAgeGroup,
            byRevenueRange
        }
    };

    report.insights = buildInsights({
        space: targetSpace,
        reservations,
        roomUtilization,
        byOccupation,
        peakHours,
        from,
        to
    });

    return report;
};

const getOwnerReportData = async ({ ownerId, from, to, lookbackDays = DEFAULT_LOOKBACK_DAYS, referenceDate = new Date() }) => {
    const owner = await User.findById(ownerId).select('name email');
    if (!owner) {
        throw new Error('Owner not found');
    }

    const dateRange = parseDateRange({
        from,
        to,
        now: referenceDate,
        lookbackDays
    });

    const spaces = await CoworkingSpace.find({ owner: ownerId }).sort('name');
    const spaceReports = [];

    for (const space of spaces) {
        const report = await getSpaceReportData({
            space,
            from: dateRange.from,
            to: dateRange.to,
            referenceDate
        });
        spaceReports.push(report);
    }

    const totals = spaceReports.reduce((acc, report) => ({
        totalSpaces: acc.totalSpaces + 1,
        totalBookings: acc.totalBookings + report.totalBookings,
        totalUniqueUsers: acc.totalUniqueUsers + report.totalUniqueUsers
    }), {
        totalSpaces: 0,
        totalBookings: 0,
        totalUniqueUsers: 0
    });

    return {
        owner: {
            id: owner._id,
            name: owner.name,
            email: owner.email
        },
        generatedAt: referenceDate,
        window: dateRange,
        totals,
        spaces: spaceReports
    };
};

module.exports = {
    getOwnerReportData,
    getSpaceReportData,
    parseDateRange
};
