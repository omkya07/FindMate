const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const foundItemSchema = new Schema({
    finder: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    itemName: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['electronics', 'clothing', 'accessories', 'documents', 'keys', 'jewelry', 'bags', 'other']
    },
    description: {
        type: String,
        required: [true, 'Description is required']
    },
    photoUrl: {
        type: String // URL to the uploaded image
    },
    foundLocation: {
        type: String,
        required: [true, 'location is required'],
        enum: ['BSH-Department', 'CIVIL-Department','BIOTECH-Department','ENTC-Department','Ground','Library','AIML-building', 'South-enclave', 'North-enclave','boys-hostel', 'Girls-hostel','MBA-building','other']
    },
    foundDate: {
        type: Date,
        required: [true, 'Found date is required']
    },
    currentLocation: {
        type: String,
        required: [true, 'Current location of the item is required']
    },
    contactPhone: {
        type: String,
        required: [true, 'A contact phone number is required']
    },
    status: {
        type: String,
        enum: ['found', 'claimed'],
        default: 'found'
    },
    additionalNotes: {
        type: String
    }
}, {
    timestamps: true
});

const FoundItem = mongoose.model('FoundItem', foundItemSchema);
module.exports = FoundItem;