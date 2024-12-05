const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 創建管理員
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

// 登入
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(400).json({ message: '用戶不存在' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: '密碼錯誤' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: '登入失敗' });
  }
});

module.exports = router;