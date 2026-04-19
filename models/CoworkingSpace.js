const mongoose = require('mongoose');

const CoworkingSpaceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        unique: true,
        trim: true,
        maxlength: [50, 'Name can not be more than 50 characters']
    },
    address: {
        type: String,
        required: [true, 'Please add an address']
    },
    tel: {
        type: String,
        required: [true, 'Please add a telephone number']
    },
    opentime: { 
        type: String,
        required: [true, 'Please add open time (e.g., 08:00)']
    },
    closetime: {
        type: String,
        required: [true, 'Please add close time (e.g., 18:00)']
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    pics: {
        type: [String],
        default: []
    },
    isVisible: {
        type: Boolean,
        default: true
    },
    owner: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

CoworkingSpaceSchema.virtual('reservations', {
    ref: 'Reservation',
    localField: '_id',
    foreignField: 'coworkingSpace',
    justOne: false
});

CoworkingSpaceSchema.virtual('rooms', {
    ref: 'Room',
    localField: '_id',
    foreignField: 'coworkingSpace',
    justOne: false
});

CoworkingSpaceSchema.index({ owner: 1 });
CoworkingSpaceSchema.index({ isVisible: 1, _id: 1 });

module.exports = mongoose.model('CoworkingSpace', CoworkingSpaceSchema);