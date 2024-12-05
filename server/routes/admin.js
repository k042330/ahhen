// server/routes/admin.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Record = require('../models/Record');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// 檢查是否為管理員的中間件
router.use(auth);
router.use(adminAuth);

// 獲取所有用戶
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'employee' }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 創建新用戶
router.post('/users', async (req, res) => {
  try {
    const user = new User({
      username: req.body.username,
      password: req.body.password,
      name: req.body.name,
      role: 'employee'
    });
    await user.save();
    res.status(201).json({ message: '用戶創建成功' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 獲取特定用戶的打卡記錄
router.get('/records/:userId', async (req, res) => {
  try {
    const records = await Record.find({ userId: req.params.userId })
      .sort({ timestamp: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 管理員手動打卡
router.post('/clock', async (req, res) => {
  try {
    const record = new Record({
      userId: req.body.userId,
      type: req.body.type,
      timestamp: new Date()
    });
    await record.save();
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;