const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userShift: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['clockIn', 'clockOut', 'autoClockOut'], // 添加自動打卡類型
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  location: {
    latitude: Number,
    longitude: Number
  },
  lateMinutes: { // 新增遲到時間
    type: Number,
    default: 0
  },
  note: { // 新增備註欄位
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
