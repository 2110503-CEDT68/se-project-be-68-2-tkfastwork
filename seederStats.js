const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config/config.env' });

const User = require('./models/User');
const CoworkingSpace = require('./models/CoworkingSpace');
const Room = require('./models/Room');
const Reservation = require('./models/Reservation');

// --- Helper ---
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const TODAY = new Date('2026-04-22T00:00:00Z');

// --- User templates with realistic biases ---
const userTemplates = [
    // Students (many, young, low revenue)
    { name: 'Somchai P.', email: 'somchai@student.cu.ac.th', tel: '0811111001', occupation: 'student', gender: 'male', revenue: 0, dobYear: 2006 },
    { name: 'Nattaya K.', email: 'nattaya@student.cu.ac.th', tel: '0811111002', occupation: 'student', gender: 'female', revenue: 0, dobYear: 2005 },
    { name: 'Peem T.', email: 'peem@student.cu.ac.th', tel: '0811111003', occupation: 'student', gender: 'male', revenue: 3000, dobYear: 2007 },
    { name: 'Fah S.', email: 'fah@student.cu.ac.th', tel: '0811111004', occupation: 'student', gender: 'female', revenue: 0, dobYear: 2004 },
    { name: 'Beam W.', email: 'beam@student.cu.ac.th', tel: '0811111005', occupation: 'student', gender: 'non-binary', revenue: 5000, dobYear: 2006 },
    { name: 'Pim R.', email: 'pim@student.cu.ac.th', tel: '0811111006', occupation: 'student', gender: 'female', revenue: 0, dobYear: 2003 },
    { name: 'Top J.', email: 'top@student.cu.ac.th', tel: '0811111007', occupation: 'student', gender: 'male', revenue: 2000, dobYear: 2008 },
    { name: 'Mint L.', email: 'mint@student.cu.ac.th', tel: '0811111008', occupation: 'student', gender: 'female', revenue: 0, dobYear: 2005 },

    // Engineers/tech workers (moderate count, mid-age, high revenue)
    { name: 'Krit A.', email: 'krit@techcorp.co.th', tel: '0822222001', occupation: 'engineer', gender: 'male', revenue: 75000, dobYear: 1995 },
    { name: 'Ploy M.', email: 'ploy@techcorp.co.th', tel: '0822222002', occupation: 'engineer', gender: 'female', revenue: 82000, dobYear: 1993 },
    { name: 'Golf D.', email: 'golf@devhouse.io', tel: '0822222003', occupation: 'engineer', gender: 'male', revenue: 95000, dobYear: 1990 },
    { name: 'Nong C.', email: 'nong@startup.co', tel: '0822222004', occupation: 'engineer', gender: 'female', revenue: 65000, dobYear: 1997 },

    // Freelancers (moderate count, varied age, mid revenue)
    { name: 'Jaa F.', email: 'jaa@freelance.me', tel: '0833333001', occupation: 'freelancer', gender: 'female', revenue: 45000, dobYear: 1992 },
    { name: 'Bank H.', email: 'bank@freelance.me', tel: '0833333002', occupation: 'freelancer', gender: 'male', revenue: 38000, dobYear: 1988 },
    { name: 'Aom V.', email: 'aom@creative.co', tel: '0833333003', occupation: 'freelancer', gender: 'female', revenue: 52000, dobYear: 1985 },

    // Business owners (few, older, high revenue)
    { name: 'Khun Suthee', email: 'suthee@bizcorp.co.th', tel: '0844444001', occupation: 'business owner', gender: 'male', revenue: 150000, dobYear: 1978 },
    { name: 'Khun Ratana', email: 'ratana@ventures.co.th', tel: '0844444002', occupation: 'business owner', gender: 'female', revenue: 200000, dobYear: 1975 },

    // Others
    { name: 'Dr. Anon', email: 'anon@hospital.go.th', tel: '0855555001', occupation: 'doctor', gender: 'male', revenue: 120000, dobYear: 1982 },
    { name: 'Ajarn Siri', email: 'siri@uni.ac.th', tel: '0855555002', occupation: 'teacher', gender: 'prefer not to say', revenue: 35000, dobYear: 1980 },
];

// --- Coworking space owned by an owner user ---
const ownerUser = {
    name: 'Owner Thanapat',
    email: 'owner@tkfastwork.com',
    tel: '0800000001',
    occupation: 'business owner',
    gender: 'male',
    revenue: 180000,
    dobYear: 1985,
    password: 'owner1234',
    role: 'owner'
};

const adminUser = {
    name: 'Admin',
    email: 'admin@cowork.com',
    tel: '0812345678',
    password: 'admin1234',
    role: 'admin',
    occupation: 'administrator',
    gender: 'male',
    revenue: 80000,
    dobYear: 1990,
};

const spaceData = {
    name: 'TKFastWork Hub',
    address: '123 Phaya Thai Road, Ratchathewi, Bangkok 10400',
    tel: '0221239999',
    opentime: '08:00',
    closetime: '20:00',
    description: 'Modern coworking space in the heart of Bangkok with meeting rooms, private offices, and phone booths.',
    isVisible: true
};

const roomsData = [
    { name: 'Boardroom Alpha', roomType: 'meeting', capacity: 12, facilities: ['projector', 'whiteboard', 'video conferencing'] },
    { name: 'Meeting Room Beta', roomType: 'meeting', capacity: 6, facilities: ['whiteboard', 'TV screen'] },
    { name: 'Meeting Room Gamma', roomType: 'meeting', capacity: 4, facilities: ['whiteboard'] },
    { name: 'Private Office A', roomType: 'private office', capacity: 2, facilities: ['standing desk', 'monitor'] },
    { name: 'Private Office B', roomType: 'private office', capacity: 1, facilities: ['standing desk'] },
    { name: 'Phone Booth 1', roomType: 'phone booth', capacity: 1, facilities: ['soundproofing'] },
    { name: 'Phone Booth 2', roomType: 'phone booth', capacity: 1, facilities: ['soundproofing'] },
];

// --- Reservation generation with biases ---
const generateReservations = (users, rooms, spaceId) => {
    const reservations = [];
    const studentUsers = users.filter(u => u.occupation === 'student');
    const nonStudentUsers = users.filter(u => u.occupation !== 'student');
    const meetingRooms = rooms.filter(r => r.roomType === 'meeting');
    const officeRooms = rooms.filter(r => r.roomType === 'private office');
    const phoneBooths = rooms.filter(r => r.roomType === 'phone booth');

    // Generate reservations over 3 months: Jan 15, 2026 to Apr 21, 2026
    const startDate = new Date('2026-01-15T00:00:00Z');
    const endDate = new Date('2026-04-21T23:59:59Z');

    const usedSlots = new Map(); // key: `roomId-date-hour` -> true

    const tryAddReservation = (user, room, date, hour, duration) => {
        const slotKeys = [];
        for (let h = hour; h < hour + duration; h++) {
            const key = `${room._id}-${date.toISOString().split('T')[0]}-${h}`;
            if (usedSlots.has(key)) return false;
            slotKeys.push(key);
        }
        slotKeys.forEach(k => usedSlots.set(k, true));

        const apptDate = new Date(date);
        apptDate.setUTCHours(hour, 0, 0, 0);
        const apptEnd = new Date(date);
        apptEnd.setUTCHours(hour + duration, 0, 0, 0);

        reservations.push({
            user: user._id,
            coworkingSpace: spaceId,
            room: room._id,
            apptDate,
            apptEnd
        });
        return true;
    };

    // Iterate day by day
    const currentDate = new Date(startDate);
    while (currentDate < endDate) {
        const dayOfWeek = currentDate.getUTCDay(); // 0=Sun, 6=Sat
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
        const isWeekend = !isWeekday;

        // BIAS: Students book heavily on weekdays (3-5 bookings/day), less on weekends (0-1)
        const studentBookingsToday = isWeekday ? randInt(3, 5) : randInt(0, 1);
        for (let i = 0; i < studentBookingsToday; i++) {
            const student = pick(studentUsers);
            // BIAS: peak hours 10-14 (70% chance), otherwise 8-9 or 15-19
            let hour;
            if (Math.random() < 0.7) {
                hour = randInt(10, 13); // peak: 10, 11, 12, 13
            } else {
                hour = pick([8, 9, 15, 16, 17, 18]);
            }
            const duration = pick([1, 1, 1, 2]); // mostly 1h, sometimes 2h
            // BIAS: students prefer meeting rooms (60%), then offices (30%), phone booths (10%)
            let room;
            const roomRoll = Math.random();
            if (roomRoll < 0.6) room = pick(meetingRooms);
            else if (roomRoll < 0.9) room = pick(officeRooms);
            else room = pick(phoneBooths);

            tryAddReservation(student, room, new Date(currentDate), hour, duration);
        }

        // Non-students: engineers book 1-3/day weekdays, freelancers 1-2/day any day, biz owners 0-1/day
        if (isWeekday) {
            const engineers = nonStudentUsers.filter(u => u.occupation === 'engineer');
            const engBookings = randInt(1, 3);
            for (let i = 0; i < engBookings; i++) {
                const eng = pick(engineers);
                if (!eng) continue;
                // Engineers prefer meeting rooms for collaboration
                const hour = Math.random() < 0.6 ? randInt(10, 14) : randInt(8, 18);
                const room = Math.random() < 0.7 ? pick(meetingRooms) : pick(officeRooms);
                tryAddReservation(eng, room, new Date(currentDate), hour, pick([1, 2, 2]));
            }
        }

        // Freelancers: any day
        const freelancers = nonStudentUsers.filter(u => u.occupation === 'freelancer');
        const flBookings = randInt(1, 2);
        for (let i = 0; i < flBookings; i++) {
            const fl = pick(freelancers);
            if (!fl) continue;
            // Freelancers spread across hours, prefer private offices
            const hour = randInt(9, 17);
            const room = Math.random() < 0.6 ? pick(officeRooms) : pick(meetingRooms);
            tryAddReservation(fl, room, new Date(currentDate), hour, pick([1, 2, 3]));
        }

        // Business owners: rare (0-1/day, weekday only)
        if (isWeekday && Math.random() < 0.4) {
            const bizOwners = nonStudentUsers.filter(u => u.occupation === 'business owner');
            const biz = pick(bizOwners);
            if (biz) {
                const room = pick(meetingRooms); // always meeting rooms
                tryAddReservation(biz, room, new Date(currentDate), randInt(10, 14), pick([1, 2]));
            }
        }

        // Doctor/teacher: rare
        if (Math.random() < 0.2) {
            const others = nonStudentUsers.filter(u => !['engineer', 'freelancer', 'business owner'].includes(u.occupation));
            const other = pick(others);
            if (other) {
                const room = pick([...officeRooms, ...phoneBooths]);
                tryAddReservation(other, room, new Date(currentDate), randInt(9, 16), 1);
            }
        }

        // Phone booth usage: low overall (BIAS: phone booths are least popular)
        if (Math.random() < 0.3) {
            const anyUser = pick([...studentUsers, ...nonStudentUsers]);
            const booth = pick(phoneBooths);
            tryAddReservation(anyUser, booth, new Date(currentDate), randInt(9, 17), 1);
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return reservations;
};

// --- Main seeder ---
const seedStats = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    // Clear all existing data
    await Reservation.deleteMany();
    await Room.deleteMany();
    await CoworkingSpace.deleteMany();
    await User.deleteMany();
    console.log('Cleared existing data');

    // Create admin
    const admin = await User.create({
        ...adminUser,
        dateOfBirth: new Date(`${adminUser.dobYear}-06-15`)
    });
    console.log(`Created admin: ${admin.email}`);

    // Create owner
    const owner = await User.create({
        ...ownerUser,
        dateOfBirth: new Date(`${ownerUser.dobYear}-03-10`)
    });
    console.log(`Created owner: ${owner.email}`);

    // Create regular users
    const createdUsers = [];
    for (const tmpl of userTemplates) {
        const user = await User.create({
            name: tmpl.name,
            email: tmpl.email,
            tel: tmpl.tel,
            password: 'password123',
            role: 'user',
            occupation: tmpl.occupation,
            gender: tmpl.gender,
            revenue: tmpl.revenue,
            dateOfBirth: new Date(`${tmpl.dobYear}-${randInt(1, 12).toString().padStart(2, '0')}-${randInt(1, 28).toString().padStart(2, '0')}`)
        });
        createdUsers.push(user);
    }
    console.log(`Created ${createdUsers.length} users`);

    // Create coworking space owned by owner
    const space = await CoworkingSpace.create({
        ...spaceData,
        owner: owner._id
    });
    console.log(`Created space: ${space.name} (owner: ${owner.name})`);

    // Create rooms
    const createdRooms = [];
    for (const rd of roomsData) {
        const room = await Room.create({
            ...rd,
            coworkingSpace: space._id
        });
        createdRooms.push(room);
    }
    console.log(`Created ${createdRooms.length} rooms`);

    // Generate biased reservations
    const reservationDocs = generateReservations(createdUsers, createdRooms, space._id);
    if (reservationDocs.length > 0) {
        await Reservation.insertMany(reservationDocs);
    }
    console.log(`Created ${reservationDocs.length} reservations`);

    // Summary
    console.log('\n=== SEED COMPLETE ===');
    console.log(`Users: ${createdUsers.length + 2} (${createdUsers.length} regular + 1 admin + 1 owner)`);
    console.log(`Space: ${space.name} (ID: ${space._id})`);
    console.log(`Rooms: ${createdRooms.length}`);
    console.log(`Reservations: ${reservationDocs.length}`);
    console.log('\nCredentials:');
    console.log('  Owner:  owner@tkfastwork.com / owner1234');
    console.log('  Admin:  admin@cowork.com / admin1234');
    console.log(`\nSpace ID for API testing: ${space._id}`);
    console.log('\nBiases applied:');
    console.log('  - Students book 3-5x/day on weekdays vs 0-1x on weekends');
    console.log('  - Meeting rooms ~60% popular, phone booths ~10%');
    console.log('  - Peak hours 10:00-14:00 (70% of student bookings)');
    console.log('  - Engineers prefer weekdays + meeting rooms');
    console.log('  - Freelancers spread evenly, prefer private offices');

    await mongoose.disconnect();
    process.exit(0);
};

seedStats().catch(err => {
    console.error(err);
    process.exit(1);
});
