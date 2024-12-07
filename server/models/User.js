const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['admin', 'employee'],
    required: true,
    default: 'employee'
  },
  shift: {
    type: String,
    enum: ['morning', 'middle', 'night'],
    default: 'morning'
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('User', userSchema);
