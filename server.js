const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
require('dotenv').config();

// Initialize Express app
const app = express();

// Configure CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: false,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Connect to MongoDB
let dbConnection = null;
(async () => {
  dbConnection = await connectDB();
})();

// API Routes
app.use('/api/messages', require('./routes/messages'));

// Create HTTP server with Express
const server = http.createServer(app);

// Initialize Socket.io with the server
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling']
});

// Import Message model
const Message = require('./models/Message');

// Store connected users
let connectedUsers = {};

// Store messages in memory if database is not available
let inMemoryMessages = [];

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Log all socket events for debugging
  const originalOnEvent = socket.onevent;
  socket.onevent = function(packet) {
    const args = packet.data || [];
    console.log('Socket event received:', args[0], args.slice(1));
    originalOnEvent.call(this, packet);
  };

  // Handle user login
  socket.on('login', async (userData) => {
    if (!userData || !userData.username) {
      console.error('Invalid login data received:', userData);
      return;
    }
    
    // Check if user was already connected with a different socket
    const existingSocketId = connectedUsers[userData.username];
    if (existingSocketId && existingSocketId !== socket.id) {
      console.log(`User ${userData.username} was already connected with socket ID ${existingSocketId}. Updating to new socket ID ${socket.id}`);
      // We don't need to disconnect the old socket as it might have already disconnected
      // or will be handled by the client-side reconnection logic
    }
    
    console.log(`User ${userData.username} logged in with socket ID ${socket.id}`);
    connectedUsers[userData.username] = socket.id;
    
    // Log all connected users for debugging
    console.log('Currently connected users:', Object.keys(connectedUsers));
    
    // Notify all users about this user's online status
    io.emit('userStatus', {
      username: userData.username,
      status: 'online'
    });
    
    // Also broadcast the status of all other connected users to this newly connected user
    // This ensures the new user has accurate status information about everyone
    Object.keys(connectedUsers).forEach(username => {
      if (username !== userData.username) {
        socket.emit('userStatus', {
          username,
          status: 'online'
        });
        console.log(`Sent status of ${username} to newly connected user ${userData.username}`);
      }
    });
  });
  
  // Handle request for previous messages
  socket.on('getPreviousMessages', async (data) => {
    console.log('Socket event received: getPreviousMessages', data);
    
    if (!data || !data.user || !data.partner) {
      console.error('Invalid getPreviousMessages data received:', data);
      socket.emit('previousMessages', []);
      return;
    }
    
    const username = data.user;
    const partner = data.partner;
    
    console.log(`Retrieving messages between ${username} and ${partner}`);
    
    let messages = [];
    
    // Send previous messages if database is connected
    if (dbConnection) {
      try {
        // Find messages where the user is either sender or recipient
        messages = await Message.find({
          $or: [
            { sender: username, recipient: partner },
            { sender: partner, recipient: username }
          ]
        }).sort({ timestamp: 1 });
        
        console.log(`Found ${messages.length} messages between ${username} and ${partner}`);
      } catch (err) {
        console.error('Error retrieving messages from database:', err.message);
      }
    } else {
      // If database is not connected, send in-memory messages if available
      console.log('Database not connected, using in-memory messages');
      messages = inMemoryMessages.filter(msg => 
        (msg.sender === username && msg.recipient === partner) || 
        (msg.sender === partner && msg.recipient === username)
      );
      console.log(`Found ${messages.length} in-memory messages between ${username} and ${partner}`);
    }
    
    // Check if there are any unread messages where the user is the recipient
    // and the user is currently online and has the window focused
    const unreadMessages = messages.filter(msg => 
      msg.recipient === username && 
      !msg.read
    );
    
    if (unreadMessages.length > 0) {
      console.log(`Found ${unreadMessages.length} unread messages for ${username}`);
    }
    
    // Send the messages to the client
    socket.emit('previousMessages', messages);
  });

  // Handle private messages
  socket.on('privateMessage', async (data) => {
    console.log('Socket event received: privateMessage', data);
    
    // Check for required fields based on client message format
    if (!data || !data.sender || !data.recipient || typeof data.message !== 'string') {
      console.error('Invalid message data received:', data);
      return;
    }
    
    const { sender, recipient, message, timestamp } = data;
    console.log(`Message from ${sender} to ${recipient}: ${message}`);
    
    // Create message data object
    const messageData = {
      sender,
      recipient,
      message,
      timestamp: timestamp || new Date().toISOString(),
      read: false,
      id: Date.now().toString() // Add unique ID for message tracking
    };
    
    // Save message to database if connected
    if (dbConnection) {
      try {
        const newMessage = new Message(messageData);
        await newMessage.save();
        console.log('Message saved to database');
      } catch (err) {
        console.error('Error saving message to database:', err.message);
        // Fall back to in-memory storage
        inMemoryMessages.push(messageData);
      }
    } else {
      // Store in memory if no database connection
      console.log('Database not connected, storing message in memory');
      inMemoryMessages.push(messageData);
    }
    
    // Send to recipient if online
    const recipientSocketId = connectedUsers[recipient];
    if (recipientSocketId) {
      console.log(`Sending message to recipient ${recipient} with socket ID ${recipientSocketId}`);
      io.to(recipientSocketId).emit('newMessage', messageData);
      
      // Automatically mark as read if recipient is online
      setTimeout(() => {
        // Check if recipient is STILL online before marking as read
        const isRecipientStillOnline = !!connectedUsers[recipient];
        
        if (isRecipientStillOnline) {
          console.log(`Marking message ${messageData.id} as read by ${recipient}`);
          messageData.read = true;
          messageData.readTimestamp = new Date().toISOString();
          
          // Update message in database if connected
          if (dbConnection) {
            try {
              Message.findOneAndUpdate(
                { id: messageData.id },
                { read: true, readTimestamp: messageData.readTimestamp },
                { new: true }
              ).then(updatedMsg => {
                console.log('Message updated in database:', updatedMsg ? updatedMsg.id : 'not found');
              });
            } catch (err) {
              console.error('Error updating message in database:', err.message);
            }
          }
          
          // Notify sender that message was read
          const senderSocketId = connectedUsers[sender];
          if (senderSocketId) {
            io.to(senderSocketId).emit('messageRead', { 
              messageId: messageData.id, 
              reader: recipient,
              readTimestamp: messageData.readTimestamp
            });
          }
        } else {
          console.log(`Recipient ${recipient} is no longer online, not marking message as read`);
        }
      }, 2000); // Simulate a delay before marking as read
    } else {
      console.log(`Recipient ${recipient} is not online, message will be delivered when they connect`);
    }
    
    // Confirm message was sent to the sender
    console.log(`Confirming message to sender ${sender}`);
    socket.emit('messageSent', messageData);
  });
  
  // Handle message read receipts
  socket.on('markMessageRead', async (data) => {
    console.log('Socket event received: markMessageRead', data);
    
    if (!data || !data.messageId || !data.reader) {
      console.error('Invalid markMessageRead data received:', data);
      return;
    }
    
    const { messageId, reader } = data;
    console.log(`Message ${messageId} marked as read by ${reader}`);
    
    let message = null;
    const readTimestamp = new Date().toISOString();
    
    // Update message in database if connected
    if (dbConnection) {
      try {
        message = await Message.findOneAndUpdate(
          { id: messageId },
          { read: true, readTimestamp: readTimestamp },
          { new: true }
        );
        console.log('Message updated in database:', message ? message.id : 'not found');
      } catch (err) {
        console.error('Error updating message in database:', err.message);
      }
    }
    
    // Update in memory if no database connection or message not found in DB
    if (!message) {
      const messageIndex = inMemoryMessages.findIndex(msg => msg.id === messageId);
      if (messageIndex !== -1) {
        inMemoryMessages[messageIndex].read = true;
        inMemoryMessages[messageIndex].readTimestamp = readTimestamp;
        message = inMemoryMessages[messageIndex];
        console.log('Message updated in memory:', message.id);
      }
    }
    
    // Notify sender that message was read
    if (message) {
      const senderSocketId = connectedUsers[message.sender];
      if (senderSocketId) {
        console.log(`Notifying sender ${message.sender} that message was read`);
        io.to(senderSocketId).emit('messageRead', { 
          messageId, 
          reader,
          readTimestamp: readTimestamp
        });
      } else {
        console.log(`Sender ${message.sender} is offline, can't notify about read receipt`);
      }
    } else {
      console.log(`Message ${messageId} not found, can't send read receipt`);
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const { sender, recipient, isTyping } = data;
    const recipientSocketId = connectedUsers[recipient];
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('userTyping', {
        sender,
        isTyping
      });
    }
  });
  
  // Handle user status check
  socket.on('checkUserStatus', (username) => {
    console.log(`Checking status for user: ${username}`);
    const isOnline = !!connectedUsers[username];
    
    // Broadcast status to all connected clients instead of just the requester
    // This ensures everyone has the same status information
    io.emit('userStatus', {
      username,
      status: isOnline ? 'online' : 'offline'
    });
    
    console.log(`Status for ${username}: ${isOnline ? 'online' : 'offline'} (broadcasted to all clients)`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Find and remove the disconnected user
    let disconnectedUser = null;
    for (const [username, id] of Object.entries(connectedUsers)) {
      if (id === socket.id) {
        disconnectedUser = username;
        delete connectedUsers[username];
        
        // Notify other users about offline status
        io.emit('userStatus', {
          username,
          status: 'offline'
        });
        console.log(`User ${username} is now offline. Remaining users:`, Object.keys(connectedUsers));
        break;
      }
    }
    
    if (!disconnectedUser) {
      console.log('Disconnected socket was not associated with any user');
    }
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Set port and start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export for Vercel deployment
module.exports = app;