const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 創建管理員帳號的路由
router.post('/create-admin', async (req, res) => {
  try {
    const { adminKey, username, password, name } = req.body;
    
    // 驗證管理員創建密鑰
    if (adminKey !== process.env.ADMIN_CREATE_KEY) {
      return res.status(403).json({ message: '無效的管理員創建密鑰' });
    }

    // 檢查用戶名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: '用戶名已存在' });
    }

    // 創建管理員用戶
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new User({
      username,
      password: hashedPassword,
      name,
      role: 'admin'
    });

    await admin.save();
    res.status(201).json({ message: '管理員帳號創建成功' });
  } catch (error) {
    console.error('創建管理員失敗:', error);
    res.status(500).json({ message: '創建管理員失敗' });
  }
});

module.exports = router;