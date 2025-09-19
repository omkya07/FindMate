const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const lostItemSchema = new Schema({
    user: {
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
    color: {
        type: String,
        trim: true
    },
    brand: {
        type: String,
        trim: true
    },
    lostLocation: {
        type: String,
        required: [true, 'location is required'],
        enum: ['BSH-Department', 'CIVIL-Department','BIOTECH-Department','ENTC-Department','Ground','Library','AIML-building', 'South-enclave', 'North-enclave','boys-hostel', 'Girls-hostel','MBA-building','other']
    },
    lostDate: {
        type: Date,
        required: [true, 'Lost date is required']
    },
    status: {
        type: String,
        enum: ['lost', 'reunited'],
        default: 'lost'
    },
    additionalNotes: {
        type: String
    }
}, {
    timestamps: true
});

const LostItem = mongoose.model('LostItem', lostItemSchema);
module.exports = LostItem;