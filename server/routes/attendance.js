const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const AttendanceRecord = require('../models/AttendanceRecord');
const User = require('../models/User');

// 驗證中間件
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error();
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: '請先登入' });
  }
};

// 獲取個人打卡記錄（一般用戶）
router.get('/records', auth, async (req, res) => {
  try {
    const records = await AttendanceRecord.find({ userId: req.user._id })
      .sort({ timestamp: -1 });
    res.json(records || []);
  } catch (error) {
    console.error('獲取記錄失敗:', error);
    res.status(500).json([]);
  }
});

// 管理員查看所有打卡記錄
router.get('/admin/records', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '無權限訪問' });
    }

    const records = await AttendanceRecord.find()
      .populate('userId', 'name') // 假設User模型有'name'字段
      .sort({ timestamp: -1 });

    res.json(records || []);
  } catch (error) {
    console.error('獲取記錄失敗:', error);
    res.status(500).json([]);
  }
});

// 打卡
router.post('/clock', auth, async (req, res) => {
  try {
    const { type, location, lateMinutes } = req.body;
    const user = await User.findById(req.user._id);
    const currentHour = new Date().getHours();

    // 驗證打卡時間
    const isValidTime = (() => {
      const hour = currentHour;
      switch(user.shift) {
        case 'morning':
          return hour >= 5 && hour <= 15;
        case 'middle':
          return hour >= 13 && hour <= 23;
        case 'night':
          return hour >= 21 || hour <= 7;
        default:
          return false;
      }
    })();

    if (!isValidTime) {
      return res.status(400).json({ 
        message: '不在允許的打卡時間範圍內',
        currentTime: currentHour,
        shift: user.shift
      });
    }

    const record = new AttendanceRecord({
      userId: user._id,
      userName: user.name,
      userShift: user.shift,
      type,
      timestamp: new Date(),
      location,
      lateMinutes: type === 'clockIn' ? lateMinutes : 0
    });

    await record.save();
    res.json(record);
  } catch (error) {
    console.error('打卡失敗:', error);
    res.status(500).json({ message: '打卡失敗' });
  }
});

// 添加自動打卡路由
router.post('/auto-clock-out', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const record = new AttendanceRecord({
      userId: user._id,
      userName: user.name,
      userShift: user.shift,
      type: 'autoClockOut',
      timestamp: new Date(),
      note: '忘記打下班卡'
    });
    await record.save();
    res.json(record);
  } catch (error) {
    console.error('自動打卡失敗:', error);
    res.status(500).json({ message: '自動打卡失敗' });
  }
});

module.exports = router;
