const express = require('express');
const router = express.Router();
const Record = require('../models/Record');
const auth = require('../middleware/auth');

router.post('/clock', auth, async (req, res) => {
  try {
    const { type, location } = req.body;
    const record = new Record({
      userId: req.user.id,
      type,
      location
    });
    await record.save();
    res.status(201).send(record);
  } catch (error) {
    res.status(400).send(error);
  }
});

router.get('/records', auth, async (req, res) => {
  try {
    const records = await Record.find({ userId: req.user.id })
      .sort({ timestamp: -1 })
      .populate('userId', 'name');
    res.send(records);
  } catch (error) {
    res.status(500).send(error);
  }
});