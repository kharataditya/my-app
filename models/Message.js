const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true
  },
  recipient: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  },
  readTimestamp: {
    type: Date,
    default: null
  },
  id: {
    type: String,
    default: function() {
      return Date.now().toString();
    }
  }
});

module.exports = mongoose.model('Message', MessageSchema);