const express = require('express');
const router = express.Router();
const Record = require('../models/Record');
const auth = require('../middleware/auth');

// 獲取個人打卡記錄（一般用戶）
router.get('/records', auth, async (req, res) => {
  try {
    // 只查詢當前用戶的記錄
    const records = await Record.find({ userId: req.user.userId })
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
    // 驗證是否為管理員
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: '無權限訪問此資源'
      });
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const records = await Record.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Record.countDocuments();

    res.json({
      records: records || [],
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('獲取記錄失敗:', error);
    res.status(500).json({
      records: [],
      total: 0,
      page: 1,
      limit: 10
    });
  }
});

// 打卡
router.post('/clock', auth, async (req, res) => {
  try {
    const { type, location } = req.body; // 如果需要 location，可以保留
    const record = new Record({
      userId: req.user.userId,
      type,
      location, // 如果需要 location，可以保留
      timestamp: new Date()
    });
    await record.save();
    res.status(201).json({
      message: type === 'clockIn' ? '上班打卡成功' : '下班打卡成功',
      record
    });
  } catch (error) {
    console.error('打卡失敗:', error);
    res.status(500).json({ message: '打卡失敗' });
  }
});

module.exports = router;
