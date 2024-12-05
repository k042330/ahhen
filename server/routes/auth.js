const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 註冊路由
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, role, adminKey } = req.body;
    
    // 如果要創建管理員，檢查 adminKey
    if (role === 'admin') {
      if (adminKey !== process.env.ADMIN_CREATE_KEY) {
        return res.status(403).json({ message: '無效的管理員密鑰' });
      }
    }

    // 檢查用戶名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: '用戶名已存在' });
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 10);

    // 創建新用戶
    const user = new User({
      username,
      password: hashedPassword,
      name,
      role: role || 'employee' // 預設為一般用戶
    });

    await user.save();
    res.status(201).json({ message: '用戶創建成功' });
  } catch (error) {
    console.error('創建用戶失敗:', error);
    res.status(500).json({ message: '創建用戶失敗' });
  }
});

// 登入路由
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 查找用戶
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: '用戶不存在' });
    }

    // 驗證密碼
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: '密碼錯誤' });
    }

    // 生成 JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 返回用戶信息和 token，確保包含 role
    res.json({
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role  // 確保返回用戶角色
      },
      token
    });
  } catch (error) {
    console.error('登入失敗:', error);
    res.status(500).json({ message: '登入失敗' });
  }
});

// 添加更新角色的路由
router.post('/update-role', async (req, res) => {
  try {
    const { username, adminKey, newRole } = req.body;
    
    // 驗證管理員密鑰
    if (adminKey !== process.env.ADMIN_CREATE_KEY) {
      return res.status(403).json({ message: '無效的管理員密鑰' });
    }

    // 查找並更新用戶
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: '用戶不存在' });
    }

    user.role = newRole;
    await user.save();

    res.json({ 
      message: '角色更新成功',
      username: user.username,
      role: user.role
    });
  } catch (error) {
    console.error('更新角色失敗:', error);
    res.status(500).json({ message: '更新角色失敗' });
  }
});

module.exports = router;
