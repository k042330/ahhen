const express = require('express');
const router = express.Router();

router.post('/clock', async (req, res) => {
  try {
    // 暫時返回模擬數據
    res.json({ message: 'Clock in/out route' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/records', async (req, res) => {
  try {
    // 暫時返回模擬數據
    res.json({ records: [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;