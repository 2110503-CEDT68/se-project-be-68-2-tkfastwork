const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a room name'],
        trim: true,
        maxlength: [100, 'Name can not be more than 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description can not be more than 500 characters']
    },
    capacity: {
        type: Number,
        required: [true, 'Please add a room capacity'],
        min: [1, 'Capacity must be at least 1']
    },
    coworkingSpace: {
        type: mongoose.Schema.ObjectId,
        ref: 'CoworkingSpace',
        required: true
    },
    roomType: {
        type: String,
        enum: ['meeting', 'private office', 'phone booth'],
        required: [true, 'Please specify a room type']
    },
    facilities: {
        type: [String],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

RoomSchema.virtual('reservations', {
    ref: 'Reservation',
    localField: '_id',
    foreignField: 'room',
    justOne: false
});

RoomSchema.index({ coworkingSpace: 1 });

module.exports = mongoose.model('Room', RoomSchema);
