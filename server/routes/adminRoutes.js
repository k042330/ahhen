const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// 驗證管理員
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: '需要管理員權限' });
    }
    next();
  } catch (error) {
    res.status(401).json({ message: '未授權' });
  }
};

// 獲取用戶列表
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    console.error('獲取用戶列表失敗:', error);
    res.status(500).json({ message: '獲取用戶列表失敗' });
  }
});

// 創建用戶
router.post('/users', verifyAdmin, async (req, res) => {
  try {
    const { username, password, name } = req.body;
    
    // 檢查用戶名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: '用戶名已存在' });
    }

    // 創建新用戶
    const user = new User({
      username,
      password: await bcrypt.hash(password, 10),
      name,
      role: 'employee'  // 默認創建普通員工
    });

    await user.save();
    res.status(201).json({ message: '用戶創建成功' });
  } catch (error) {
    console.error('創建用戶失敗:', error);
    res.status(500).json({ message: '創建用戶失敗' });
  }
});

module.exports = router;

// 驗證管理員中間件
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: '需要管理員權限' });
    }
    next();
  } catch (error) {
    res.status(401).json({ message: '未授權' });
  }
};

// 獲取用戶列表
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    console.error('獲取用戶列表失敗:', error);
    res.status(500).json({ message: '獲取用戶列表失敗' });
  }
});

// 創建用戶
router.post('/users', verifyAdmin, async (req, res) => {
  try {
    const { username, password, name } = req.body;
    
    // 檢查用戶名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: '用戶名已存在' });
    }

    // 創建新用戶
    const user = new User({
      username,
      password: await bcrypt.hash(password, 10),
      name,
      role: 'employee'  // 默認創建普通員工
    });

    await user.save();
    res.status(201).json({ message: '用戶創建成功' });
  } catch (error) {
    console.error('創建用戶失敗:', error);
    res.status(500).json({ message: '創建用戶失敗' });
  }
});

module.exports = router;