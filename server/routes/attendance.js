const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); // 確保已安裝jsonwebtoken
const Record = require('../models/Record');
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
    const records = await Record.find({ userId: req.user._id })
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

    const records = await Record.find()
      .populate('userId', 'name') // 這裡假設User模型有'name'字段
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
    const { type } = req.body;
    const record = new Record({
      userId: req.user._id,
      type,
      timestamp: new Date()
    });
    await record.save();
    res.status(201).json(record);
  } catch (error) {
    console.error('打卡失敗:', error);
    res.status(500).json({ message: '打卡失敗' });
  }
});

module.exports = router;
