const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB 連接
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// 引入路由
const authRouter = require('./routes/auth');
const attendanceRouter = require('./routes/attendance');
const adminRouter = require('./routes/admin');

// 使用路由
app.use('/api/auth', authRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/admin', adminRouter);

// 提供前端靜態文件
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});