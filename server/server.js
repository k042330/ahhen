const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://attendance-system-9ylf.onrender.com' 
    : 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: '服務器錯誤',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// MongoDB 連接
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

mongoose.connection.on('error', err => {
  console.error('MongoDB 連接錯誤:', err);
});

// 引入路由
const authRouter = require('./routes/auth');
const attendanceRouter = require('./routes/attendance');
const adminRouter = require('./routes/adminRoutes');

// API 路由
app.use('/api/auth', authRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/admin', adminRouter);

// API 404 處理
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API 路徑不存在' });
});

// 提供前端靜態文件
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  // 所有非 API 請求都返回 index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    }
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

// 處理未捕獲的異常
process.on('uncaughtException', (err) => {
  console.error('未捕獲的異常:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未處理的 Promise 拒絕:', reason);
});