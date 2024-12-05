const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['clockIn', 'clockOut'], required: true },
  timestamp: { type: Date, default: Date.now },
  location: {
    latitude: Number,
    longitude: Number
  }
});

module.exports = mongoose.model('Record', recordSchema);