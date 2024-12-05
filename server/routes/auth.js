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
    
    // 明確選擇所有需要的字段
    const user = await User.findOne({ username })
      .select('username password name role');
      
    if (!user) {
      return res.status(400).json({ message: '用戶不存在' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: '密碼錯誤' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('User data:', {
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role
    });

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
    console.error('登入失敗:', error);
    res.status(500).json({ message: '登入失敗' });
  }
});

// 驗證 token 的路由（用於前端驗證）
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '未提供授權標頭' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error();
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Token 驗證失敗:', error);
    res.status(401).json({ message: '請重新登入' });
  }
});

// 更新用戶角色的路由
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

// 強制更新用戶角色的路由
router.post('/force-update-role', async (req, res) => {
  try {
    const { username, adminKey, targetRole } = req.body;
    
    // 驗證管理員密鑰
    if (adminKey !== process.env.ADMIN_CREATE_KEY) {
      return res.status(403).json({ message: '無效的管理員密鑰' });
    }

    // 直接使用 updateOne 來更新文檔
    const result = await User.updateOne(
      { username },
      { $set: { role: targetRole } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: '找不到用戶' });
    }

    res.json({ 
      message: '用戶角色更新成功',
      username,
      newRole: targetRole
    });

  } catch (error) {
    console.error('更新角色失敗:', error);
    res.status(500).json({ message: '更新角色失敗' });
  }
});

module.exports = router;
