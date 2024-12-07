const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator'); // 用於輸入驗證
const AttendanceRecord = require('../models/AttendanceRecord');
const User = require('../models/User');

// 班別時間配置
const SHIFT_CONFIG = {
  morning: {
    startHour: 8,
    endHour: 16,
    allowEarlyMinutes: 60
  },
  middle: {
    startHour: 16,
    endHour: 1, // 隔天
    allowEarlyMinutes: 60
  },
  night: {
    startHour: 0,
    endHour: 9,
    allowEarlyMinutes: 60
  }
};

// 驗證中間件
const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '請先登入' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error('用戶不存在');
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('驗證失敗:', error);
    res.status(401).json({ message: '請先登入' });
  }
};

// 檢查打卡時間是否有效
const isValidClockTime = (shift, currentDate, type) => {
  const config = SHIFT_CONFIG[shift];
  if (!config) return false;

  const currentTime = currentDate.getHours() * 60 + currentDate.getMinutes(); // 總分鐘數
  const startTime = config.startHour * 60;
  const endTime = config.endHour * 60;
  const allowEarly = config.allowEarlyMinutes;

  if (type === 'clockIn') {
    const earliestClockIn = (startTime - allowEarly + 1440) % 1440; // 1440 分鐘 = 24 小時
    if (config.startHour < config.endHour) { // 非跨日
      return currentTime >= earliestClockIn && currentTime <= startTime + 60;
    } else { // 跨日
      return (currentTime >= earliestClockIn && currentTime < 1440) || (currentTime >= 0 && currentTime <= (startTime + 60) % 1440);
    }
  } else { // clockOut
    // 下班打卡不做時間限制
    return true;
  }
};

// 獲取個人打卡記錄（一般用戶）
router.get('/records', auth, async (req, res) => {
  try {
    const records = await AttendanceRecord.find({ userId: req.user._id })
      .sort({ timestamp: -1 });
    res.json({ records: records || [] });
  } catch (error) {
    console.error('獲取記錄失敗:', error);
    res.status(500).json({ records: [] });
  }
});

// 管理員查看所有打卡記錄
router.get('/admin/records', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '無權限訪問' });
    }
    const records = await AttendanceRecord.find()
      .populate('userId', 'name')
      .sort({ timestamp: -1 });
    res.json({ records: records || [] });
  } catch (error) {
    console.error('獲取記錄失敗:', error);
    res.status(500).json({ records: [] });
  }
});

// 打卡
router.post('/clock', 
  auth, 
  [
    body('type').isIn(['clockIn', 'clockOut']).withMessage('無效的打卡類型'),
    body('location').isString().optional(),
    body('lateMinutes').isInt({ min: 0 }).optional()
  ], 
  async (req, res) => {
    // 驗證輸入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: '輸入驗證失敗', errors: errors.array() });
    }

    try {
      const { type, location, lateMinutes } = req.body;
      const user = req.user;

      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      // 驗證打卡時間
      const isValidTime = isValidClockTime(user.shift, now, type);
      
      if (!isValidTime) {
        return res.status(400).json({ 
          message: '不在允許的打卡時間範圍內',
          currentTime: `${now.getHours()}:${now.getMinutes()}`,
          shift: user.shift
        });
      }

      // 驗證打卡類型並檢查狀態
      if (type === 'clockIn') {
        const lastRecord = await AttendanceRecord.findOne({ userId: user._id }).sort({ timestamp: -1 });
        if (lastRecord && lastRecord.type === 'clockIn' && !['clockOut', 'autoClockOut'].includes(lastRecord.type)) {
          return res.status(400).json({ message: '您已經打過上班卡，請先打下班卡' });
        }
      } else if (type === 'clockOut') {
        const lastRecord = await AttendanceRecord.findOne({ userId: user._id }).sort({ timestamp: -1 });
        if (!lastRecord || (lastRecord.type !== 'clockIn' && lastRecord.type !== 'autoClockOut')) {
          return res.status(400).json({ message: '您尚未打上班卡，無法打下班卡' });
        }
      }

      const record = new AttendanceRecord({
        userId: user._id,
        userName: user.name,
        userShift: user.shift,
        type,
        timestamp: now,
        location: location || '',
        lateMinutes: type === 'clockIn' ? (lateMinutes || 0) : 0
      });

      await record.save();
      res.json({ record });
    } catch (error) {
      console.error('打卡失敗:', error);
      res.status(500).json({ message: '打卡失敗' });
    }
  }
);

// 自動打卡
router.post('/auto-clock-out', auth, async (req, res) => {
  try {
    const user = req.user;

    // 檢查最後一條記錄是否為 clockIn 且未打下班卡
    const lastRecord = await AttendanceRecord.findOne({ userId: user._id }).sort({ timestamp: -1 });
    if (!lastRecord || (lastRecord.type !== 'clockIn' && lastRecord.type !== 'autoClockOut')) {
      return res.status(400).json({ message: '無需自動打下班卡' });
    }

    if (lastRecord.type === 'autoClockOut') {
      return res.status(400).json({ message: '已經自動打過下班卡' });
    }

    const now = new Date();

    const record = new AttendanceRecord({
      userId: user._id,
      userName: user.name,
      userShift: user.shift,
      type: 'autoClockOut',
      timestamp: now,
      note: '忘記打下班卡'
    });

    await record.save();
    res.json({ record });
  } catch (error) {
    console.error('自動打卡失敗:', error);
    res.status(500).json({ message: '自動打卡失敗' });
  }
});

module.exports = router;
