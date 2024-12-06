const router = require('express').Router();
const User = require('../models/User');
const AttendanceRecord = require('../models/AttendanceRecord');  // 添加 AttendanceRecord 引用
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// 驗證管理員中間件
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '未提供授權標頭' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: '需要管理員權限' });
    }
    next();
  } catch (error) {
    console.error('驗證管理員失敗:', error);
    res.status(401).json({ message: '未授權' });
  }
};

// 獲取用戶列表
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password');  // 排除密碼字段
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
    const hashedPassword = await bcrypt.hash(password, 10);  // 加密密碼
    const user = new User({
      username,
      password: hashedPassword,
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

// 添加新的考勤記錄路由
router.get('/attendance', verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate, userId, type } = req.query;
    const query = {};
    
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(`${endDate}T23:59:59`)
      };
    }
    if (userId) query.userId = userId;
    if (type) query.type = type;

    const records = await AttendanceRecord.find(query)
      .populate('userId', 'name')
      .sort({ timestamp: -1 });

    const formattedRecords = records.map(record => ({
      _id: record._id,
      userName: record.userId.name,
      type: record.type,
      timestamp: record.timestamp,
      location: record.location
    }));

    res.json(formattedRecords);
  } catch (error) {
    console.error('獲取考勤記錄失敗:', error);
    res.status(500).json({ message: '獲取考勤記錄失敗' });
  }
});

module.exports = router;
