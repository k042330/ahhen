const express = require('express');
const router = express.Router();
const AttendanceRecord = require('../models/AttendanceRecord');
const jwt = require('jsonwebtoken');

// 驗證用戶中間件
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: '未授權' });
  }
};

// 打卡路由
router.post('/clock', verifyToken, async (req, res) => {
  try {
    const { type, location } = req.body;
    const userId = req.userId;

    // 創建新的打卡記錄
    const record = new AttendanceRecord({
      userId,
      type,
      location
    });

    await record.save();
    res.json({ message: type === 'clockIn' ? '上班打卡成功' : '下班打卡成功' });
  } catch (error) {
    console.error('打卡失敗:', error);
    res.status(500).json({ message: error.message });
  }
});

// 獲取打卡記錄路由
router.get('/records', verifyToken, async (req, res) => {
  try {
    const records = await AttendanceRecord.find({ userId: req.userId })
      .sort({ timestamp: -1 }) // 按時間倒序排序
      .limit(30);  // 限制返回最近30條記錄
    
    res.json(records);
  } catch (error) {
    console.error('獲取記錄失敗:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;