// server/routes/adminRoutes.js
const router = require('express').Router();
const User = require('../models/User');
const Record = require('../models/Record');  // 使用 Record 模型
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

// 獲取考勤記錄 (已修改為 /records 並添加分頁支持)
router.get('/records', verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate, userId, type, page = 1, limit = 10 } = req.query;
    const query = {};
    
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(`${endDate}T23:59:59`)
      };
    }
    if (userId) query.userId = userId;
    if (type) query.type = type;

    // 轉換 page 和 limit 為數字，並設置默認值
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    // 獲取總記錄數
    const total = await Record.countDocuments(query);

    // 獲取分頁記錄
    const records = await Record.find(query)
      .populate('userId', 'name')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNumber);

    const formattedRecords = records.map(record => ({
      id: record._id,  // 修正 id 的獲取方式
      userName: record.userId?.name || 'Unknown',  // 添加空值檢查
      type: record.type,
      timestamp: record.timestamp,
      location: record.location
    }));

    const totalPages = Math.ceil(total / limitNumber);

    res.json({
      records: formattedRecords,
      total,
      page: pageNumber,
      totalPages
    });
  } catch (error) {
    console.error('獲取記錄失敗:', error);
    res.status(500).json({ message: '獲取記錄失敗' });
  }
});

// 新增：清空所有打卡記錄
router.delete('/records/deleteAll', verifyAdmin, async (req, res) => {
  try {
    await Record.deleteMany({});  // 清空所有記錄
    res.json({ message: '所有打卡記錄已清空' });
  } catch (error) {
    console.error('清空記錄失敗:', error);
    res.status(500).json({ message: '清空記錄失敗' });
  }
});

// 新增：導出考勤記錄
router.get('/records/export', verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate, userId, type } = req.query;
    const query = {};
    
    // 添加日期範圍
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(`${endDate}T23:59:59`)
      };
    }

    // 添加其他篩選條件
    if (userId) query.userId = userId;
    if (type) query.type = type;

    // 獲取所有符合條件的記錄
    const records = await Record.find(query)
      .populate('userId', 'name')
      .sort({ timestamp: -1 });

    // 格式化數據
    const formattedRecords = records.map(record => ({
      userName: record.userId.name,
      type: record.type,
      timestamp: record.timestamp,
      location: record.location
    }));

    // 設置響應頭以下載 JSON 文件
    res.setHeader('Content-Disposition', 'attachment; filename=records_export.json');
    res.setHeader('Content-Type', 'application/json');
    res.json(formattedRecords);
  } catch (error) {
    console.error('導出記錄失敗:', error);
    res.status(500).json({ message: '導出記錄失敗' });
  }
});

module.exports = router;
