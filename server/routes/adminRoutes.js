// server/routes/adminRoutes.js
const router = require('express').Router();
const User = require('../models/User');
const AttendanceRecord = require('../models/AttendanceRecord');  // 使用 AttendanceRecord 模型
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createObjectCsvStringifier } = require('csv-writer');

// 定義班別選項
const SHIFT_OPTIONS = [
  { value: 'morning', label: '早班' },
  { value: 'middle', label: '中班' },
  { value: 'night', label: '夜班' },
  // 根據需要添加更多班別
];

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
    const { username, password, name, shift } = req.body;
    
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
      role: 'employee',  // 默認創建普通員工
      shift: shift || 'morning'  // 默認早班
    });
    await user.save();
    res.status(201).json({ message: '用戶創建成功' });
  } catch (error) {
    console.error('創建用戶失敗:', error);
    res.status(500).json({ message: '創建用戶失敗' });
  }
});

// 刪除用戶
router.delete('/users/:username', verifyAdmin, async (req, res) => {
  try {
    const { username } = req.params;
    
    // 查找並刪除用戶
    const deletedUser = await User.findOneAndDelete({ username });
    
    if (!deletedUser) {
      return res.status(404).json({ message: '用戶未找到' });
    }
    
    res.json({ message: `用戶 ${username} 已成功刪除` });
  } catch (error) {
    console.error('刪除用戶失敗:', error);
    res.status(500).json({ message: '刪除用戶失敗' });
  }
});

// 更新用戶班別
router.patch('/users/:userId', verifyAdmin, async (req, res) => {
  try {
    const { shift } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { shift },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: '用戶不存在' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('更新班別失敗:', error);
    res.status(500).json({ message: '更新班別失敗' });
  }
});

// 獲取考勤記錄 (已添加分頁支持)
router.get('/records', verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate, userId, type, shift, page = 1, limit = 10 } = req.query;
    const query = {};
    
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(`${endDate}T23:59:59`)
      };
    }
    if (userId) query.userId = userId;
    if (type) query.type = type;
    if (shift) {
      // 通過關聯查詢查找特定班別的用戶的記錄
      const usersWithShift = await User.find({ shift }, '_id');
      query.userId = { $in: usersWithShift.map(u => u._id) };
    }

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const total = await AttendanceRecord.countDocuments(query);  // 使用 AttendanceRecord

    const records = await AttendanceRecord.find(query)  // 使用 AttendanceRecord
      .populate('userId', 'name shift')  // 加入 shift 字段
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNumber);

    const formattedRecords = records.map(record => ({
      id: record._id,
      userName: record.userId?.name || 'Unknown',
      userShift: record.userId?.shift || 'unknown',  // 添加班別信息
      type: record.type,
      timestamp: record.timestamp,
      location: record.location
    }));

    res.json({
      records: formattedRecords,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber)
    });
  } catch (error) {
    console.error('獲取記錄失敗:', error);
    res.status(500).json({ message: '獲取記錄失敗' });
  }
});

// 清空所有打卡記錄
router.delete('/records/deleteAll', verifyAdmin, async (req, res) => {
  try {
    await AttendanceRecord.deleteMany({});  // 使用 AttendanceRecord
    res.json({ message: '所有打卡記錄已清空' });
  } catch (error) {
    console.error('清空記錄失敗:', error);
    res.status(500).json({ message: '清空記錄失敗' });
  }
});

// 導出考勤記錄（新增遲到時間和備註欄位）
router.get('/records/export', verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate, userId, type, shift } = req.query;
    const query = {};
    
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(`${endDate}T23:59:59`)
      };
    }
    if (userId) query.userId = userId;
    if (type) query.type = type;
    if (shift) {
      const usersWithShift = await User.find({ shift }, '_id');
      query.userId = { $in: usersWithShift.map(u => u._id) };
    }

    const records = await AttendanceRecord.find(query)  // 使用 AttendanceRecord
      .populate('userId', 'name shift')
      .sort({ timestamp: -1 });

    const csvHeaders = [
      { id: 'userName', title: '員工姓名' },
      { id: 'userShift', title: '班別' },
      { id: 'type', title: '打卡類型' },
      { id: 'timestamp', title: '打卡時間' },
      { id: 'location', title: '位置' },
      { id: 'lateMinutes', title: '遲到時間(分鐘)' },  // 新增欄位
      { id: 'note', title: '備註' }                 // 新增欄位
    ];

    const csvStringifier = createObjectCsvStringifier({
      header: csvHeaders
    });

    const allRecords = records.map(record => ({
      userName: record.userId?.name || 'Unknown',
      userShift: SHIFT_OPTIONS.find(opt => opt.value === record.userShift)?.label || '未指定',
      type: record.type === 'clockIn' ? '上班' : 
            record.type === 'clockOut' ? '下班' : 
            '自動下班',
      timestamp: new Date(record.timestamp).toLocaleString(),
      location: record.location ? `${record.location.latitude},${record.location.longitude}` : '-',
      lateMinutes: record.lateMinutes || 0,  // 新增遲到時間
      note: record.note || ''               // 新增備註
    }));

    const headerString = csvStringifier.getHeaderString();
    const recordsString = csvStringifier.stringifyRecords(allRecords);

    const csvContent = headerString + recordsString;

    // 設置響應頭以觸發下載
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance_records.csv"');

    res.send(csvContent);
  } catch (error) {
    console.error('導出記錄失敗:', error);
    res.status(500).json({ message: '導出記錄失敗' });
  }
});

module.exports = router;
