const mongoose = require('mongoose');
const CoworkingSpace = require('../models/CoworkingSpace');
const Reservation = require('../models/Reservation');
const Room = require('../models/Room');
const User = require('../models/User');

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

const getDateRange = (req) => {
    const now = new Date('2026-04-22T23:59:59Z'); // mock today
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 30);

    const from = req.query.from ? new Date(req.query.from) : defaultFrom;
    const to = req.query.to ? new Date(req.query.to) : now;

    return { from, to };
};

const getAge = (dateOfBirth, referenceDate) => {
    const dob = new Date(dateOfBirth);
    const ref = referenceDate || new Date('2026-04-22');
    let age = ref.getFullYear() - dob.getFullYear();
    const m = ref.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) {
        age--;
    }
    return age;
};

const getAgeGroupLabel = (age) => {
    for (const group of AGE_GROUPS) {
        if (age >= group.min && age <= group.max) return group.label;
    }
    return '50+';
};

const getRevenueRangeLabel = (revenue) => {
    for (const range of REVENUE_RANGES) {
        if (revenue >= range.min && revenue <= range.max) return range.label;
    }
    return '100001+';
};

const verifyOwnership = async (req, res) => {
    const space = await CoworkingSpace.findById(req.params.id);
    if (!space) {
        res.status(404).json({ success: false, message: 'Coworking space not found' });
        return null;
    }
    if (!space.owner || space.owner.toString() !== req.user.id) {
        res.status(403).json({ success: false, message: 'Not authorized — owner only' });
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

        const { from, to } = getDateRange(req);

        const rooms = await Room.find({ coworkingSpace: space._id });
        const roomIds = rooms.map(r => r._id);

        const reservations = await Reservation.find({
            coworkingSpace: space._id,
            apptDate: { $gte: from, $lte: to }
        }).populate({ path: 'user', select: 'dateOfBirth occupation gender revenue' });

        const totalBookings = reservations.length;

        const uniqueUserIds = new Set(reservations.map(r => r.user?._id?.toString()).filter(Boolean));
        const totalUniqueUsers = uniqueUserIds.size;

        // Room utilization
        const roomUtilization = rooms.map(room => {
            const roomReservations = reservations.filter(
                r => r.room && r.room.toString() === room._id.toString()
            );
            const totalHoursBooked = roomReservations.reduce((sum, r) => {
                const duration = (new Date(r.apptEnd) - new Date(r.apptDate)) / (1000 * 60 * 60);
                return sum + duration;
            }, 0);
            return {
                roomId: room._id,
                roomName: room.name,
                roomType: room.roomType,
                totalHoursBooked: Math.round(totalHoursBooked * 100) / 100,
                bookingCount: roomReservations.length
            };
        });

        // Peak hours
        const hourCounts = {};
        reservations.forEach(r => {
            const hour = new Date(r.apptDate).getUTCHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        const peakHours = Object.entries(hourCounts)
            .map(([hour, count]) => ({ hour: parseInt(hour), count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Average booking duration
        const totalDurationMinutes = reservations.reduce((sum, r) => {
            return sum + (new Date(r.apptEnd) - new Date(r.apptDate)) / (1000 * 60);
        }, 0);
        const avgBookingDurationMinutes = totalBookings > 0
            ? Math.round((totalDurationMinutes / totalBookings) * 100) / 100
            : 0;

        // Demographic breakdown
        const validUsers = reservations
            .map(r => r.user)
            .filter(u => u && u._id);

        // Deduplicate users for demographic counts
        const seenUsers = new Map();
        validUsers.forEach(u => {
            if (!seenUsers.has(u._id.toString())) {
                seenUsers.set(u._id.toString(), u);
            }
        });
        const uniqueUsers = Array.from(seenUsers.values());
        const totalForDemographics = uniqueUsers.length;

        // By gender
        const genderMap = {};
        uniqueUsers.forEach(u => {
            const g = u.gender || 'unknown';
            genderMap[g] = (genderMap[g] || 0) + 1;
        });
        const byGender = Object.entries(genderMap).map(([gender, count]) => ({
            gender,
            count,
            percentage: totalForDemographics > 0 ? Math.round((count / totalForDemographics) * 10000) / 100 : 0
        }));

        // By occupation
        const occMap = {};
        uniqueUsers.forEach(u => {
            const o = u.occupation || 'unknown';
            occMap[o] = (occMap[o] || 0) + 1;
        });
        const byOccupation = Object.entries(occMap).map(([occupation, count]) => ({
            occupation,
            count,
            percentage: totalForDemographics > 0 ? Math.round((count / totalForDemographics) * 10000) / 100 : 0
        }));

        // By age group
        const ageMap = {};
        AGE_GROUPS.forEach(g => { ageMap[g.label] = 0; });
        uniqueUsers.forEach(u => {
            if (u.dateOfBirth) {
                const age = getAge(u.dateOfBirth);
                const label = getAgeGroupLabel(age);
                ageMap[label] = (ageMap[label] || 0) + 1;
            }
        });
        const byAgeGroup = Object.entries(ageMap).map(([ageGroup, count]) => ({
            ageGroup,
            count,
            percentage: totalForDemographics > 0 ? Math.round((count / totalForDemographics) * 10000) / 100 : 0
        }));

        // By revenue range
        const revMap = {};
        REVENUE_RANGES.forEach(r => { revMap[r.label] = 0; });
        uniqueUsers.forEach(u => {
            const label = getRevenueRangeLabel(u.revenue || 0);
            revMap[label] = (revMap[label] || 0) + 1;
        });
        const byRevenueRange = Object.entries(revMap).map(([range, count]) => ({
            range,
            count,
            percentage: totalForDemographics > 0 ? Math.round((count / totalForDemographics) * 10000) / 100 : 0
        }));

        res.status(200).json({
            success: true,
            data: {
                totalBookings,
                totalUniqueUsers,
                roomUtilization,
                peakHours,
                avgBookingDurationMinutes,
                demographicBreakdown: {
                    byGender,
                    byOccupation,
                    byAgeGroup,
                    byRevenueRange
                }
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

        const { from, to } = getDateRange(req);

        const rooms = await Room.find({ coworkingSpace: space._id });

        const reservations = await Reservation.find({
            coworkingSpace: space._id,
            apptDate: { $gte: from, $lte: to }
        }).populate({ path: 'user', select: 'dateOfBirth occupation gender revenue' });

        // Insufficient data guard
        if (reservations.length < 5) {
            return res.status(200).json({ success: true, data: { insights: [] } });
        }

        const insights = [];

        // --- Demographic Comparison Insights ---

        // By occupation (booking count, not unique users)
        const occBookings = {};
        reservations.forEach(r => {
            if (r.user && r.user.occupation) {
                const occ = r.user.occupation;
                occBookings[occ] = (occBookings[occ] || 0) + 1;
            }
        });
        const occEntries = Object.entries(occBookings).sort((a, b) => b[1] - a[1]);
        if (occEntries.length >= 2) {
            const [topOcc, topCount] = occEntries[0];
            const [secOcc, secCount] = occEntries[1];
            const ratio = Math.round((topCount / secCount) * 100) / 100;
            insights.push({
                type: 'demographic_comparison',
                message: `${topOcc}s book ${ratio}x more than ${secOcc}s (${topCount} vs ${secCount} bookings)`,
                metric: { topGroup: topOcc, topCount, secondGroup: secOcc, secondCount: secCount, ratio },
                severity: ratio >= 3 ? 'highlight' : 'info'
            });
        }

        // By gender
        const genderBookings = {};
        reservations.forEach(r => {
            if (r.user && r.user.gender) {
                genderBookings[r.user.gender] = (genderBookings[r.user.gender] || 0) + 1;
            }
        });
        const genderEntries = Object.entries(genderBookings).sort((a, b) => b[1] - a[1]);
        if (genderEntries.length >= 2) {
            const [topGender, topGCount] = genderEntries[0];
            const [secGender, secGCount] = genderEntries[1];
            const gRatio = Math.round((topGCount / secGCount) * 100) / 100;
            if (gRatio >= 1.5) {
                insights.push({
                    type: 'demographic_comparison',
                    message: `${topGender} users book ${gRatio}x more than ${secGender} users`,
                    metric: { topGroup: topGender, topCount: topGCount, secondGroup: secGender, secondCount: secGCount, ratio: gRatio },
                    severity: 'info'
                });
            }
        }

        // By age group
        const ageBookings = {};
        reservations.forEach(r => {
            if (r.user && r.user.dateOfBirth) {
                const age = getAge(r.user.dateOfBirth);
                const label = getAgeGroupLabel(age);
                ageBookings[label] = (ageBookings[label] || 0) + 1;
            }
        });
        const ageEntries = Object.entries(ageBookings).sort((a, b) => b[1] - a[1]);
        if (ageEntries.length >= 2) {
            const [topAge, topACount] = ageEntries[0];
            const [secAge, secACount] = ageEntries[1];
            const aRatio = Math.round((topACount / secACount) * 100) / 100;
            insights.push({
                type: 'demographic_comparison',
                message: `Age group ${topAge} books ${aRatio}x more than age group ${secAge} (${topACount} vs ${secACount})`,
                metric: { topGroup: topAge, topCount: topACount, secondGroup: secAge, secondCount: secACount, ratio: aRatio },
                severity: aRatio >= 2.5 ? 'highlight' : 'info'
            });
        }

        // --- Room Popularity Insights ---
        const roomBookings = {};
        reservations.forEach(r => {
            if (r.room) {
                const rid = r.room.toString();
                roomBookings[rid] = (roomBookings[rid] || 0) + 1;
            }
        });

        const roomEntries = rooms
            .map(room => ({
                room,
                count: roomBookings[room._id.toString()] || 0
            }))
            .sort((a, b) => b.count - a.count);

        if (roomEntries.length >= 2) {
            const most = roomEntries[0];
            const least = roomEntries[roomEntries.length - 1];
            insights.push({
                type: 'room_popularity',
                message: `Most popular room: "${most.room.name}" (${most.room.roomType}) with ${most.count} bookings. Least popular: "${least.room.name}" (${least.room.roomType}) with ${least.count} bookings.`,
                metric: {
                    mostPopular: { name: most.room.name, type: most.room.roomType, bookings: most.count },
                    leastPopular: { name: least.room.name, type: least.room.roomType, bookings: least.count }
                },
                severity: 'info'
            });
        }

        // Room type comparison
        const roomTypeBookings = {};
        rooms.forEach(room => {
            const count = roomBookings[room._id.toString()] || 0;
            roomTypeBookings[room.roomType] = (roomTypeBookings[room.roomType] || 0) + count;
        });
        const rtEntries = Object.entries(roomTypeBookings).sort((a, b) => b[1] - a[1]);
        if (rtEntries.length >= 2) {
            const [topType, topRTCount] = rtEntries[0];
            const [botType, botRTCount] = rtEntries[rtEntries.length - 1];
            const rtRatio = botRTCount > 0 ? Math.round((topRTCount / botRTCount) * 100) / 100 : topRTCount;
            insights.push({
                type: 'room_popularity',
                message: `${topType} rooms are ${rtRatio}x more popular than ${botType} rooms (${topRTCount} vs ${botRTCount} bookings)`,
                metric: { topType, topCount: topRTCount, bottomType: botType, bottomCount: botRTCount, ratio: rtRatio },
                severity: rtRatio >= 3 ? 'highlight' : 'info'
            });
        }

        // --- Time Pattern Insights ---

        // Peak hours
        const hourCounts = {};
        reservations.forEach(r => {
            const hour = new Date(r.apptDate).getUTCHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        const sortedHours = Object.entries(hourCounts)
            .map(([h, c]) => ({ hour: parseInt(h), count: c }))
            .sort((a, b) => b.count - a.count);

        if (sortedHours.length >= 1) {
            const peakHour = sortedHours[0];
            const peakRange = `${peakHour.hour}:00-${peakHour.hour + 1}:00`;
            insights.push({
                type: 'time_pattern',
                message: `Peak booking hour: ${peakRange} with ${peakHour.count} bookings`,
                metric: { peakHour: peakHour.hour, count: peakHour.count },
                severity: 'info'
            });
        }

        // Busiest day of week
        const dayCounts = {};
        reservations.forEach(r => {
            const day = DAYS_OF_WEEK[new Date(r.apptDate).getUTCDay()];
            dayCounts[day] = (dayCounts[day] || 0) + 1;
        });
        const sortedDays = Object.entries(dayCounts)
            .map(([day, count]) => ({ day, count }))
            .sort((a, b) => b.count - a.count);

        if (sortedDays.length >= 1) {
            insights.push({
                type: 'time_pattern',
                message: `Busiest day of the week: ${sortedDays[0].day} with ${sortedDays[0].count} bookings`,
                metric: { busiestDay: sortedDays[0].day, count: sortedDays[0].count, distribution: sortedDays },
                severity: 'info'
            });
        }

        // --- Utilization Alerts ---
        const totalAvailableHoursPerRoom = (() => {
            const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24));
            const openMinutes = space.opentime ? parseInt(space.opentime.split(':')[0]) : 8;
            const closeMinutes = space.closetime ? parseInt(space.closetime.split(':')[0]) : 18;
            const hoursPerDay = closeMinutes - openMinutes;
            return days * hoursPerDay;
        })();

        roomEntries.forEach(({ room, count }) => {
            const totalHours = reservations
                .filter(r => r.room && r.room.toString() === room._id.toString())
                .reduce((sum, r) => sum + (new Date(r.apptEnd) - new Date(r.apptDate)) / (1000 * 60 * 60), 0);
            const utilization = totalAvailableHoursPerRoom > 0
                ? Math.round((totalHours / totalAvailableHoursPerRoom) * 10000) / 100
                : 0;
            if (utilization < 10) {
                insights.push({
                    type: 'utilization_alert',
                    message: `Room "${room.name}" (${room.roomType}) has very low utilization: ${utilization}% — consider promoting or repurposing`,
                    metric: { roomName: room.name, roomType: room.roomType, utilizationPercent: utilization, totalHoursBooked: Math.round(totalHours * 100) / 100, totalAvailableHours: totalAvailableHoursPerRoom },
                    severity: 'warning'
                });
            }
        });

        res.status(200).json({ success: true, data: { insights } });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: 'Cannot generate insights' });
    }
};
