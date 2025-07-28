const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// Get all messages between two users
router.get('/:user1/:user2', async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    
    // Find messages where either user is sender and the other is recipient
    const messages = await Message.find({
      $or: [
        { sender: user1, recipient: user2 },
        { sender: user2, recipient: user1 }
      ]
    }).sort({ timestamp: 1 }); // Sort by timestamp ascending
    
    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Create a new message
router.post('/', async (req, res) => {
  try {
    const { sender, recipient, message, timestamp } = req.body;
    
    const newMessage = new Message({
      sender,
      recipient,
      message,
      timestamp: timestamp || Date.now()
    });
    
    const savedMessage = await newMessage.save();
    res.json(savedMessage);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Mark messages as read
router.put('/read/:sender/:recipient', async (req, res) => {
  try {
    const { sender, recipient } = req.params;
    
    // Update all unread messages from sender to recipient
    const result = await Message.updateMany(
      { sender, recipient, read: false },
      { $set: { read: true } }
    );
    
    res.json({ updated: result.nModified });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;