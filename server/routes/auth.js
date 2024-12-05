const express = require('express');
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    // 暫時返回模擬數據
    res.json({ message: 'Login route' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    // 暫時返回模擬數據
    res.json({ message: 'Register route' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;