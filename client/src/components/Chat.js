import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Badge,
  Container,
  Tooltip,
  Zoom,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import LogoutIcon from '@mui/icons-material/Logout';
import FavoriteIcon from '@mui/icons-material/Favorite';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import LocalFloristIcon from '@mui/icons-material/LocalFlorist';
import CircularProgress from '@mui/material/CircularProgress';

// Import glassmorphism styles
import './GlassmorphismStyles.css';

// Initialize socket connection with debug enabled
const socket = io(process.env.NODE_ENV === 'production' 
  ? `${window.location.protocol}//${window.location.host}`
  : 'http://localhost:5000', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity, // Keep trying to reconnect indefinitely
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 30000, // Increased timeout
  autoConnect: true,
  debug: true,
  withCredentials: false,
  forceNew: false,
  path: process.env.NODE_ENV === 'production' ? '/socket.io' : undefined,
  pingTimeout: 60000, // Increase ping timeout for better connection stability
  pingInterval: 25000 // Increase ping interval
});

// For debugging - expose socket globally
window.socket = socket;

// Log socket connection events
socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
  
  // Log additional information for debugging
  console.log('Current environment:', process.env.NODE_ENV);
  console.log('Connection URL:', process.env.NODE_ENV === 'production' 
    ? `${window.location.protocol}//${window.location.host}` 
    : 'http://localhost:5000');
  console.log('Socket options:', {
    path: process.env.NODE_ENV === 'production' ? '/socket.io' : undefined,
    transports: ['websocket', 'polling']
  });
  
  // Attempt to reconnect after a delay
  setTimeout(() => {
    console.log('Attempting to reconnect socket...');
    socket.connect();
  }, 5000);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});

// Create a function to update connection status in all components
const updateConnectionStatus = (status) => {
  // This will be called by the Chat component to update its state
  window.dispatchEvent(new CustomEvent('socket_status_change', { detail: status }));
};

// Update global connection status on socket events
socket.on('connect', () => {
  updateConnectionStatus('connected');
});

socket.on('disconnect', () => {
  updateConnectionStatus('disconnected');
});

socket.on('connect_error', () => {
  updateConnectionStatus('error');
});

socket.on('reconnect_attempt', () => {
  updateConnectionStatus('connecting');
});

socket.on('reconnect', () => {
  updateConnectionStatus('connected');
});

socket.on('reconnect_error', () => {
  updateConnectionStatus('error');
});

socket.on('reconnect_failed', () => {
  updateConnectionStatus('failed');
});

const Chat = ({ user, partner, onLogout }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(socket.connected ? 'connected' : 'connecting');
  const messagesEndRef = useRef(null);
  
  // Use a ref to track unread messages to persist across renders
  const unreadMessagesRef = useRef([]);

  // Function to fetch messages via HTTP API as fallback
  const fetchMessagesViaHttp = async () => {
    try {
      console.log('Attempting to fetch messages via HTTP API');
      const apiUrl = process.env.NODE_ENV === 'production'
        ? `/api/messages/${user.username}/${partner.username}`
        : `http://localhost:5000/api/messages/${user.username}/${partner.username}`;
      
      console.log('Fetching from:', apiUrl);
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received messages via HTTP:', data.length);
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages via HTTP:', error);
    }
  };

  // Listen for socket status changes
  useEffect(() => {
    const handleSocketStatusChange = (event) => {
      console.log('Socket status changed:', event.detail);
      setConnectionStatus(event.detail);
    };
    
    window.addEventListener('socket_status_change', handleSocketStatusChange);
    
    return () => {
      window.removeEventListener('socket_status_change', handleSocketStatusChange);
    };
  }, []);

  // Connect to socket and handle events
  useEffect(() => {
    console.log('Connecting with user:', user);
    
    // Update initial connection status
    setConnectionStatus(socket.connected ? 'connected' : 'connecting');
    
    // Ensure socket is connected
    if (!socket.connected) {
      console.log('Socket not connected, connecting now...');
      socket.connect();
    }
    
    // Make sure socket is connected before emitting events
    if (socket.connected) {
      console.log('Socket already connected with ID:', socket.id, 'emitting login');
      socket.emit('login', user);
      
      // Request previous messages
      console.log('Requesting previous messages for:', user, partner.username);
      socket.emit('getPreviousMessages', { user: user.username, partner: partner.username });
    } else {
      console.log('Socket not connected, waiting for connection');
      socket.on('connect', () => {
        console.log('Socket connected with ID:', socket.id, 'now emitting login');
        socket.emit('login', user);
        
        // Request previous messages after login
        console.log('Requesting previous messages for:', user, partner.username);
        socket.emit('getPreviousMessages', { user: user.username, partner: partner.username });
      });
      
      // If socket doesn't connect within 5 seconds, try HTTP fallback
      setTimeout(() => {
        if (!socket.connected) {
          console.log('Socket still not connected after timeout, using HTTP fallback');
          fetchMessagesViaHttp();
        }
      }, 5000);
    }
    
    // Function to mark message as read via HTTP API as fallback
    const markMessageReadViaHttp = async (messageId, reader) => {
      try {
        console.log('Attempting to mark message as read via HTTP API');
        const apiUrl = process.env.NODE_ENV === 'production'
          ? `/api/messages/read/${messageId}/${reader}`
          : `http://localhost:5000/api/messages/read/${messageId}/${reader}`;
        
        console.log('Sending to:', apiUrl);
        const response = await fetch(apiUrl, {
          method: 'PUT'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log('Message marked as read via HTTP');
        return true;
      } catch (error) {
        console.error('Error marking message as read via HTTP:', error);
        return false;
      }
    };
    
    // Function to mark unread messages as read when window gets focus
    const handleWindowFocus = () => {
      console.log('Window focused, marking any unread messages as read');
      if (unreadMessagesRef.current.length > 0) {
        console.log(`Marking ${unreadMessagesRef.current.length} unread messages as read`);
        
        // Try to mark messages as read via socket first if connected
        if (socket.connected) {
          unreadMessagesRef.current.forEach(msgId => {
            socket.emit('markMessageRead', {
              messageId: msgId,
              reader: user.username
            });
          });
        } else {
          // Fallback to HTTP API if socket is not connected
          console.log('Socket not connected, falling back to HTTP API for marking messages as read');
          unreadMessagesRef.current.forEach(msgId => {
            markMessageReadViaHttp(msgId, user.username);
          });
        }
        
        // Clear the unread messages array
        unreadMessagesRef.current = [];
      }
    };
    
    // Add window focus event listener
    window.addEventListener('focus', handleWindowFocus);

    // Listen for previous messages from database
    socket.on('previousMessages', (previousMessages) => {
      console.log('Received previous messages:', previousMessages ? previousMessages.length : 0);
      if (previousMessages && Array.isArray(previousMessages)) {
        setMessages(previousMessages);
      } else if (previousMessages) {
        console.error('previousMessages is not an array:', previousMessages);
      } else {
        console.log('No previous messages received or empty array');
        setMessages([]);
      }
    });

    // Listen for new messages
    socket.on('newMessage', (messageData) => {
      console.log('Received new message:', messageData);
      setMessages((prevMessages) => [...prevMessages, messageData]);
      
      // Only mark message as read if the window is active/focused
      if (document.hasFocus()) {
        console.log('Window is focused, marking message as read');
        if (socket.connected) {
          socket.emit('markMessageRead', {
            messageId: messageData.id,
            reader: user.username
          });
        } else {
          // Fallback to HTTP API if socket is not connected
          console.log('Socket not connected, using HTTP API to mark message as read');
          markMessageReadViaHttp(messageData.id, user.username);
        }
      } else {
        console.log('Window is not focused, message will be marked as read when user returns');
        // Add to unread messages ref to be marked as read when window gets focus
        unreadMessagesRef.current.push(messageData.id);
        console.log(`Added message ${messageData.id} to unread queue (total: ${unreadMessagesRef.current.length})`);
      }
    });

    // Listen for sent message confirmation
    socket.on('messageSent', (messageData) => {
      console.log('Message sent confirmation:', messageData);
      
      // Replace pending message with confirmed message
      setMessages((prevMessages) => 
        prevMessages.map(msg => 
          msg.pending && msg.message === messageData.message && msg.sender === messageData.sender
            ? { ...messageData, pending: false, id: messageData.id }
            : msg
        )
      );
      
      // Log the updated message for debugging
      console.log('Message updated with ID:', messageData.id);
    });
    
    // Listen for message read receipts
    socket.on('messageRead', (data) => {
      console.log('Message read receipt received:', data);
      
      // Update messages with read status
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === data.messageId
            ? { ...msg, read: true }
            : msg
        )
      );
    });

    // Listen for user status updates
    socket.on('userStatus', (statusData) => {
      console.log('User status update:', statusData);
      if (statusData.username === partner.username) {
        setIsPartnerOnline(statusData.status === 'online');
        console.log(`Partner ${partner.username} is now ${statusData.status}`);
      }
    });
    
    // Check partner status on connection and set up periodic check
    if (socket.connected) {
      socket.emit('checkUserStatus', partner.username);
    }
    
    // Set up periodic status check every 30 seconds
    const statusCheckInterval = setInterval(() => {
      if (socket.connected) {
        console.log('Performing periodic status check for partner:', partner.username);
        socket.emit('checkUserStatus', partner.username);
      }
    }, 30000);

    // Listen for typing indicator
    socket.on('userTyping', (typingData) => {
      if (typingData.sender === partner.username) {
        setIsPartnerTyping(typingData.isTyping);
      }
    });

    // Handle reconnection
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsPartnerOnline(false); // Set partner offline immediately on disconnect
      
      // Try to reconnect if disconnected
      setTimeout(() => {
        console.log('Attempting to reconnect...');
        socket.connect();
      }, 1000);
    });
    
    // Handle successful reconnection
    socket.on('connect', () => {
      console.log('Socket reconnected, re-emitting login');
      
      // Re-login on reconnection
      socket.emit('login', user);
      
      // Request previous messages again
      socket.emit('getPreviousMessages', { user: user.username, partner: partner.username });
      
      // Check partner status
      socket.emit('checkUserStatus', partner.username);
    });

    // Clean up on unmount
    return () => {
      console.log('Cleaning up socket listeners and intervals');
      clearInterval(statusCheckInterval); // Clear the status check interval
      // Remove window focus event listener
      window.removeEventListener('focus', handleWindowFocus);
      socket.off('previousMessages');
      socket.off('newMessage');
      socket.off('messageSent');
      socket.off('messageRead');
      socket.off('userStatus');
      socket.off('userTyping');
      socket.off('disconnect');
      socket.off('connect'); // Remove connect listener
      socket.disconnect();
    };
  }, [user, partner]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Function to send message via HTTP API as fallback
  const sendMessageViaHttp = async (messageData) => {
    try {
      console.log('Attempting to send message via HTTP API');
      const apiUrl = process.env.NODE_ENV === 'production'
        ? `/api/messages`
        : `http://localhost:5000/api/messages`;
      
      console.log('Sending to:', apiUrl);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Message sent via HTTP:', data);
      
      // Update the pending message with the confirmed message data
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.pending && msg.message === messageData.message && msg.sender === messageData.sender
            ? { ...data, pending: false }
            : msg
        )
      );
      
      return data;
    } catch (error) {
      console.error('Error sending message via HTTP:', error);
      return null;
    }
  };

  // Handle sending a message
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (message.trim() === '') return;
    
    console.log('Sending message to:', partner.username);
    
    const messageData = {
      sender: user.username,
      recipient: partner.username,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };
    
    // Add message to local state immediately for better UX
    // This will be replaced when the server confirms the message
    const pendingMessage = {
      ...messageData,
      pending: true, // Mark as pending until confirmed by server
      id: `pending-${Date.now()}` // Add temporary ID for tracking
    };
    
    setMessages(prevMessages => [...prevMessages, pendingMessage]);
    setMessage('');
    
    // Try to send via socket.io first
    if (socket.connected) {
      console.log('Emitting privateMessage event with data:', messageData);
      socket.emit('privateMessage', messageData);
      
      // Clear typing indicator
      socket.emit('typing', {
        sender: user.username,
        recipient: partner.username,
        isTyping: false,
      });
    } else {
      // Fallback to HTTP API if socket is not connected
      console.log('Socket not connected, falling back to HTTP API');
      sendMessageViaHttp(messageData);
    }
    
    // If socket doesn't confirm the message within 3 seconds, try HTTP fallback
    const messageTimeout = setTimeout(() => {
      // Check if the message is still pending
      setMessages(prevMessages => {
        const stillPending = prevMessages.some(msg => 
          msg.id === pendingMessage.id && msg.pending
        );
        
        if (stillPending && !socket.connected) {
          console.log('Message still pending after timeout, trying HTTP fallback');
          sendMessageViaHttp(messageData);
        }
        
        return prevMessages;
      });
    }, 3000);
    
    // Clean up timeout on next render
    return () => clearTimeout(messageTimeout);
  };

  // Handle typing indicator
  const handleTyping = (e) => {
    setMessage(e.target.value);
    
    // Clear previous timeout
    if (typingTimeout) clearTimeout(typingTimeout);
    
    // Emit typing event
    socket.emit('typing', {
      sender: user.username,
      recipient: partner.username,
      isTyping: true,
    });
    
    // Set timeout to clear typing indicator after 2 seconds
    const timeout = setTimeout(() => {
      socket.emit('typing', {
        sender: user.username,
        recipient: partner.username,
        isTyping: false,
      });
    }, 2000);
    
    setTypingTimeout(timeout);
  };

  // Handle logout
  const handleLogout = () => {
    socket.disconnect();
    onLogout();
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
      // Remove any padding or margin at the top
      pt: 0,
      mt: 0
    }}>
      {/* Header - Absolute positioned for Apple glass effect */}
      <AppBar 
        position="absolute" 
        className="glassmorphism glass-shimmer apple-glass-header"
        sx={{ 
          background: 'rgba(233, 30, 99, 0.03)', // Very light background for glassmorphism
          backdropFilter: 'blur(10px)', // Strong blur for glass effect
          WebkitBackdropFilter: 'blur(10px)', // For Safari support
          boxShadow: 'none', // Remove box shadow
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          position: 'absolute', // Absolute position to allow content to flow underneath
          top: 0,
          left: 0, // No margin on mobile
          right: 0, // No margin on mobile
          width: '100%', // Full width on mobile
          borderRadius: 0, // No rounded corners on mobile
          zIndex: 1100, // Ensure it stays on top
          overflow: 'visible',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'none', // Removed the radial gradient
            zIndex: 0,
            animation: 'moveBackground 15s infinite alternate ease-in-out',
            '@keyframes moveBackground': {
              '0%': { transform: 'translateX(-10%)' },
              '100%': { transform: 'translateX(10%)' }
            }
          }
        }}>
        <Toolbar 
          className="glassmorphism glass-reflection"
          sx={{ 
            flexDirection: { xs: 'column', sm: 'row' },
            py: { xs: 1.5, sm: 1.2 },
            px: { xs: 1.5, sm: 2 },
            gap: { xs: 1.5, sm: 2 },
            position: 'relative',
            zIndex: 1,
            maxWidth: '1200px',
            width: '100%',
            mx: 'auto',
            minHeight: { xs: 'auto', sm: '64px' },
            background: 'rgba(20, 20, 20, 0.3)', // More transparent background for glassmorphism
            backdropFilter: 'blur(20px)', // Stronger blur for Apple-like glass effect
            WebkitBackdropFilter: 'blur(20px)', // For Safari support
            borderRadius: { xs: 0, sm: '0 0 16px 16px' }, // No rounded corners on mobile, rounded on desktop
            border: '1px solid rgba(255, 255, 255, 0.1)', // Slightly more visible border
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)', // Deeper shadow for depth
          }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'center', sm: 'flex-start' },
            mb: { xs: 0.5, sm: 0 },
            position: 'relative',
            '&::after': {
              content: { xs: '""', sm: 'none' },
              position: 'absolute',
              bottom: -8,
              left: '25%',
              width: '50%',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
            }
          }}>
            <Box sx={{ 
              position: 'relative',
              mr: { xs: 1.5, sm: 2 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: { xs: 'scale(1.1)', sm: 'scale(1.2)' }
            }}>
              <FavoriteIcon sx={{ 
                color: '#ff4081',
                animation: 'heartbeat 1.5s infinite', 
                '@keyframes heartbeat': {
                  '0%': { transform: 'scale(1)', opacity: 0.9 },
                  '25%': { transform: 'scale(1.2)', opacity: 1 },
                  '50%': { transform: 'scale(1)', opacity: 0.9 },
                  '75%': { transform: 'scale(1.2)', opacity: 1 },
                  '100%': { transform: 'scale(1)', opacity: 0.9 }
                },
                fontSize: { xs: '1.3rem', sm: '1.8rem' },
                filter: 'drop-shadow(0 0 5px rgba(255,64,129,0.7))'
              }} />
              <FavoriteIcon sx={{ 
                position: 'absolute',
                color: 'rgba(255,255,255,0.4)',
                fontSize: { xs: '1rem', sm: '1.4rem' },
                transform: 'rotate(-15deg) translateX(-5px)',
                filter: 'blur(0.5px)'
              }} />
            </Box>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontWeight: 'bold',
                fontSize: { xs: '1.2rem', sm: '1.5rem' },
                background: 'linear-gradient(90deg, #ffffff, #ffcce6)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                letterSpacing: { xs: '0.5px', sm: '0.7px' },
                fontFamily: '"Quicksand", "Roboto", sans-serif',
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: -2,
                  left: 0,
                  width: '100%',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  opacity: 0.5,
                  display: { xs: 'none', sm: 'block' }
                }
              }}
            >
              Couple Chat
            </Typography>
          </Box>
          
          {/* Connection status indicator */}
          <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
            <Tooltip 
              title={`Connection: ${connectionStatus}`} 
              placement="bottom"
              arrow
            >
              <div>
                <Box 
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: connectionStatus === 'connected' ? 'rgba(76, 175, 80, 0.8)' : // Green for connected
                               connectionStatus === 'connecting' ? 'rgba(255, 152, 0, 0.8)' : // Orange for connecting
                               connectionStatus === 'disconnected' ? 'rgba(244, 67, 54, 0.8)' : // Red for disconnected
                               'rgba(244, 67, 54, 0.8)', // Red for error or failed
                    boxShadow: connectionStatus === 'connected' ? '0 0 5px rgba(76, 175, 80, 0.8)' :
                               connectionStatus === 'connecting' ? '0 0 5px rgba(255, 152, 0, 0.8)' :
                               '0 0 5px rgba(244, 67, 54, 0.8)',
                    transition: 'all 0.3s ease'
                  }}
                />
              </div>
            </Tooltip>
          </Box>
          
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', mx: 2, position: 'relative' }}>
            <Box 
              component="span" 
              sx={{ 
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.9,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '20px',
                px: 2,
                py: 0.5,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: '1px solid rgba(255,255,255,0.1)',
                '& svg': {
                  mx: 0.5,
                  fontSize: '1rem',
                  color: '#ff4081',
                  filter: 'drop-shadow(0 0 2px rgba(255,64,129,0.5))',
                  animation: 'pulse 1.5s infinite',
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(1)', opacity: 0.8 },
                    '50%': { transform: 'scale(1.1)', opacity: 1 },
                    '100%': { transform: 'scale(1)', opacity: 0.8 }
                  }
                }
              }}
            >
              <Box component="span" sx={{ 
                fontSize: '0.9rem', 
                fontStyle: 'italic', 
                color: 'rgba(255,255,255,0.9)',
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                letterSpacing: '0.5px',
                fontWeight: 500
              }}>
                Forever
              </Box>
              <FavoriteIcon />
              <Box component="span" sx={{ 
                fontSize: '0.9rem', 
                fontStyle: 'italic', 
                color: 'rgba(255,255,255,0.9)',
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                letterSpacing: '0.5px',
                fontWeight: 500
              }}>
                Together
              </Box>
            </Box>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'center', sm: 'flex-end' },
            background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 100%)',
            borderRadius: 30,
            px: { xs: 1.5, sm: 2 },
            py: { xs: 0.5, sm: 0.5 },
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(5px)',
            mt: { xs: 0.5, sm: 0 },
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            mx: { xs: 'auto', sm: 0 },
            maxWidth: { xs: '90%', sm: 'auto' }
          }}>
            <Box sx={{ 
              position: 'relative', 
              mr: { xs: 1.5, sm: 2 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Badge
                color={isPartnerOnline ? 'success' : 'error'}
                variant="dot"
                overlap="circular"
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                sx={{ 
                  '& .MuiBadge-badge': {
                    boxShadow: '0 0 0 2px rgba(26, 26, 26, 0.5)',
                    width: { xs: 12, sm: 14 },
                    height: { xs: 12, sm: 14 },
                    borderRadius: '50%',
                    right: { xs: 3, sm: 4 },
                    bottom: { xs: 3, sm: 4 },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      animation: 'ripple 1.2s infinite ease-in-out',
                      border: '1px solid currentColor',
                      opacity: 0.8
                    },
                    '@keyframes ripple': {
                      '0%': {
                        transform: 'scale(1)',
                        opacity: 1
                      },
                      '100%': {
                        transform: 'scale(2.5)',
                        opacity: 0
                      }
                    }
                  }
                }}
              >
                <Avatar sx={{ 
                  bgcolor: 'secondary.main',
                  background: 'linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)',
                  boxShadow: '0 4px 12px rgba(156, 39, 176, 0.3)',
                  transition: 'all 0.3s ease',
                  width: { xs: 40, sm: 45 },
                  height: { xs: 40, sm: 45 },
                  border: '2px solid rgba(255,255,255,0.3)',
                  fontSize: { xs: '1.2rem', sm: '1.4rem' },
                  fontWeight: 'bold',
                  color: 'white',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    boxShadow: '0 6px 16px rgba(156, 39, 176, 0.4)'
                  }
                }}>
                  {partner.username.charAt(0).toUpperCase()}
                </Avatar>
              </Badge>
              {isPartnerOnline && (
                <Box sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  fontSize: { xs: '1rem', sm: '1.2rem' },
                  filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.5))',
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.2)' },
                    '100%': { transform: 'scale(1)' }
                  },
                  zIndex: 2
                }}>
                  ❤️
                </Box>
              )}
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: { xs: 'center', sm: 'flex-start' },
              minWidth: { xs: '80px', sm: 'auto' }
            }}>
              <Typography variant="body1" sx={{ 
                  fontWeight: 700,
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  letterSpacing: '0.5px',
                  background: 'linear-gradient(90deg, #ffffff, #ffcce6)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 0.3,
                  textAlign: { xs: 'center', sm: 'left' },
                  textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  width: '100%'
                }}>
                {partner.username}
              </Typography>
              <Box component="span" sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: { xs: 'center', sm: 'flex-start' },
                  px: 1.2, 
                  py: 0.3, 
                  borderRadius: 20, 
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  fontWeight: 500,
                  bgcolor: isPartnerOnline ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                  color: isPartnerOnline ? '#81c784' : '#e57373',
                  border: `1px solid ${isPartnerOnline ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  minWidth: '70px',
                  width: { xs: '100%', sm: 'auto' }
                }}>
                <Box 
                  component="span" 
                  sx={{ 
                    width: { xs: 7, sm: 8 }, 
                    height: { xs: 7, sm: 8 }, 
                    borderRadius: '50%', 
                    bgcolor: isPartnerOnline ? '#4caf50' : '#f44336',
                    mr: 0.8,
                    boxShadow: isPartnerOnline ? '0 0 5px #4caf50' : 'none',
                    animation: isPartnerOnline ? 'pulse-dot 1.5s infinite' : 'none',
                    '@keyframes pulse-dot': {
                      '0%': { opacity: 0.6 },
                      '50%': { opacity: 1 },
                      '100%': { opacity: 0.6 }
                    }
                  }} 
                />
                {isPartnerOnline ? 'Online' : 'Offline'}
              </Box>
            </Box>
            
            <Tooltip title="Logout" placement="bottom" arrow TransitionComponent={Zoom}>
              <IconButton 
                color="inherit" 
                onClick={handleLogout}
                size="small"
                sx={{ 
                  ml: { xs: 1.5, sm: 2 },
                  bgcolor: 'rgba(255,255,255,0.15)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  '&:hover': { 
                    bgcolor: 'rgba(255,255,255,0.25)',
                    boxShadow: '0 0 10px rgba(255,255,255,0.3)',
                    transform: 'translateY(-2px)'
                  },
                  p: { xs: 0.6, sm: 0.8 },
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                  width: { xs: 32, sm: 36 },
                  height: { xs: 32, sm: 36 }
                }}
              >
                <LogoutIcon sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem' }, color: '#fff' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Chat Messages - Starts from the very top of the screen */}
      <Box 
        className="content-under-glass"
        sx={{ 
          flexGrow: 1, 
          overflow: 'auto', 
          overflowX: 'hidden',
          p: { xs: 1, sm: 2 },
          pt: 0, // No top padding to allow content to go under the header
          backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")',
          backgroundBlendMode: 'soft-light',
          backgroundColor: '#0a0a0a', // Solid background color without transparency
          backgroundSize: '100px 100px', // Make the pattern smaller like original
          backgroundAttachment: 'fixed', // Keep the background fixed when scrolling
          position: 'absolute', // Absolute position to start from the very top
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          width: '100%', // Ensure it extends across the entire width
          height: '100vh', // Full viewport height
          pb: { xs: 8, sm: 10 }, // Add padding to ensure messages don't get hidden behind the form
          WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
          scrollbarWidth: 'thin', // Firefox scrollbar
          msOverflowStyle: 'none', // IE/Edge scrollbar
          marginTop: 0, // Start from the very top
          '&::-webkit-scrollbar': {
            width: '4px',
            display: { xs: 'none', sm: 'block' }
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
            borderRadius: '20px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(236, 65, 122, 0.82)',
            borderRadius: '20px',
            border: '1px solid transparent',
            backgroundClip: 'padding-box',
            '&:hover': {
              background: 'rgba(233, 30, 99, 0.4)',
              borderRadius: '20px',
            },
          },
        }}>
        <Container maxWidth="md" sx={{ px: { xs: 1, sm: 2 }, position: 'relative', zIndex: 0, pb: { xs: 2, sm: 3 }, pt: { xs: '70px', sm: '80px' } }}>
          <Box className="messages-container">
          {messages.length === 0 ? (
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                opacity: 0.7,
                animation: 'fadeIn 1.5s ease-in-out',
                '@keyframes fadeIn': {
                  '0%': { opacity: 0, transform: 'translateY(20px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              <Box sx={{ 
                position: 'relative',
                width: { xs: 80, sm: 120 },
                height: { xs: 80, sm: 120 },
                margin: '0 auto',
                mb: 3
              }}>
                <FavoriteIcon color="primary" sx={{ 
                  position: 'absolute',
                  fontSize: { xs: 50, sm: 80 },
                  top: 0,
                  left: 0,
                  animation: 'heartBeat 1.5s infinite',
                  '@keyframes heartBeat': {
                    '0%': { transform: 'scale(1)' },
                    '14%': { transform: 'scale(1.3)' },
                    '28%': { transform: 'scale(1)' },
                    '42%': { transform: 'scale(1.3)' },
                    '70%': { transform: 'scale(1)' }
                  }
                }} />
                <FavoriteIcon sx={{ 
                  position: 'absolute',
                  fontSize: { xs: 40, sm: 60 }, 
                  color: 'secondary.main', 
                  bottom: 0,
                  right: 0,
                  animation: 'heartBeat 1.5s infinite 0.5s'
                }} />
              </Box>
              <Typography variant="h6" sx={{ 
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #e91e63 30%, #9c27b0 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                textAlign: 'center'
              }}>
                No messages yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                Send a message to start your conversation with {partner.username}
              </Typography>
            </Box>
          ) : (
            messages.map((msg, index) => {
              const isUserMessage = msg.sender === user.username;
              
              return (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    justifyContent: isUserMessage ? 'flex-end' : 'flex-start',
                    mb: 2,
                    transition: 'all 0.3s ease',
                    animation: 'fadeIn 0.5s ease-in-out',
                    '@keyframes fadeIn': {
                      '0%': { opacity: 0, transform: 'translateY(10px)' },
                      '100%': { opacity: 1, transform: 'translateY(0)' }
                    }
                  }}
                >
                  {!isUserMessage && (
                    <Avatar 
                      sx={{ 
                        bgcolor: 'secondary.main', 
                        width: { xs: 28, sm: 32 }, 
                        height: { xs: 28, sm: 32 }, 
                        mr: 1,
                        alignSelf: 'flex-end',
                        mb: 1,
                        boxShadow: '0 4px 8px rgba(156, 39, 176, 0.3)',
                        border: '2px solid rgba(156, 39, 176, 0.5)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'scale(1.1)'
                        }
                      }}
                    >
                      {partner.username.charAt(0).toUpperCase()}
                    </Avatar>
                  )}
                  <Paper
                    elevation={2}
                    sx={{
                      p: { xs: 1.2, sm: 2 },
                      maxWidth: { xs: '85%', sm: '70%' },
                      borderRadius: isUserMessage ? 
                        '16px 16px 0 16px' : 
                        '16px 16px 16px 0',
                      background: isUserMessage ? 
                        (msg.pending ? 'linear-gradient(135deg, rgba(233, 30, 99, 0.65) 30%, rgba(156, 39, 176, 0.65) 90%)' : 'linear-gradient(135deg, rgba(233, 30, 99, 0.7) 0%, rgba(176, 0, 58, 0.7) 100%)') : 
                        'linear-gradient(135deg, rgba(66, 66, 143, 0.5) 0%, rgba(41, 53, 86, 0.5) 100%)',
                      backdropFilter: 'blur(15px)',
                      WebkitBackdropFilter: 'blur(15px)',
                      border: isUserMessage ? 
                        '1px solid rgba(233, 30, 99, 0.3)' : 
                        '1px solid rgba(100, 120, 200, 0.25)',
                      boxShadow: isUserMessage ? 
                        '0 4px 16px rgba(233, 30, 99, 0.35)' : 
                        '0 4px 16px rgba(66, 66, 143, 0.35)',
                      position: 'relative',
                      transition: 'all 0.3s ease',
                      wordBreak: 'break-word',
                      overflow: 'hidden',
                      '&:hover': {
                        boxShadow: isUserMessage ? 
                          '0 6px 18px rgba(233, 30, 99, 0.45)' : 
                          '0 6px 18px rgba(66, 66, 143, 0.45)',
                        transform: { xs: 'none', sm: 'translateY(-2px) scale(1.01)' }
                      },
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '30%',
                        background: isUserMessage ?
                          'linear-gradient(to bottom, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0))' :
                          'linear-gradient(to bottom, rgba(180, 190, 255, 0.1), rgba(180, 190, 255, 0))',
                        opacity: 0.5,
                        pointerEvents: 'none'
                      }
                    }}
                    className="message-appear"
                  >
                    <Typography variant="body1" className="message-content" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' }, lineHeight: { xs: 1.4, sm: 1.5 }, userSelect: 'text', WebkitUserSelect: 'text' }}>{msg.message}</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5, alignItems: 'center', flexWrap: 'nowrap' }}>                      <Tooltip 
                        title={new Date(msg.timestamp).toLocaleString()} 
                        placement="bottom"
                        TransitionComponent={Zoom}
                        arrow
                      >
                        <Typography 
                          variant="caption" 
                          color={isUserMessage ? 'rgba(255,255,255,0.7)' : 'text.secondary'} 
                          sx={{ 
                            mr: 0.5,
                            fontSize: { xs: '0.6rem', sm: '0.7rem' },
                            fontWeight: 500,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {formatTime(msg.timestamp)}
                        </Typography>
                      </Tooltip>
                      {isUserMessage && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {msg.pending ? (
                            <Tooltip 
                              title="Sending..." 
                              placement="bottom"
                              TransitionComponent={Zoom}
                              arrow
                            >
                              <Box sx={{ display: 'inline-block', width: 14, height: 14, position: 'relative' }}>
                                <CircularProgress 
                                  size={14} 
                                  thickness={6} 
                                  sx={{ 
                                    color: 'rgba(255,255,255,0.8)',
                                  }} 
                                />
                              </Box>
                            </Tooltip>
                          ) : msg.read ? (
                            <Tooltip 
                              title={`Read at ${new Date(msg.readTimestamp || msg.timestamp).toLocaleTimeString()}`} 
                              placement="bottom"
                              TransitionComponent={Zoom}
                              arrow
                            >
                              <Box sx={{ 
                                color: '#34B7F1', 
                                display: 'flex',
                                animation: 'fadeIn 0.3s ease-in-out',
                                backgroundColor: 'rgba(52, 183, 241, 0.1)',
                                borderRadius: '0 8px 8px 8px',
                                padding: '1px 3px',
                                '@keyframes fadeIn': {
                                  '0%': { opacity: 0 },
                                  '100%': { opacity: 1 }
                                }
                              }}>
                                <Box sx={{ fontSize: '0.9rem', lineHeight: 1 }}>✓</Box>
                                <Box sx={{ fontSize: '0.9rem', lineHeight: 1, ml: -0.8 }}>✓</Box>
                              </Box>
                            </Tooltip>
                          ) : (
                            <Tooltip 
                              title="Delivered" 
                              placement="bottom"
                              TransitionComponent={Zoom}
                              arrow
                            >
                              <Box sx={{ 
                                color: 'rgba(255,255,255,0.6)', 
                                fontSize: '0.9rem', 
                                lineHeight: 1,
                                animation: 'fadeIn 0.3s ease-in-out',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                borderRadius: '0 8px 8px 8px',
                                padding: '1px 3px',
                                '@keyframes fadeIn': {
                                  '0%': { opacity: 0 },
                                  '100%': { opacity: 1 }
                                }
                              }}>✓</Box>
                            </Tooltip>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Paper>
                  {isUserMessage && (
                    <Avatar 
                      sx={{ 
                        bgcolor: 'primary.main', 
                        width: 32, 
                        height: 32, 
                        ml: 1,
                        alignSelf: 'flex-end',
                        mb: 1
                      }}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </Avatar>
                  )}
                </Box>
              );
            })
          )}
          
          {isPartnerTyping && (
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {partner.username} is typing...
              </Typography>
            </Box>
          )}
          
          <div ref={messagesEndRef} />
          </Box>
        </Container>
      </Box>

      {/* Message Input */}
      {isPartnerTyping && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 1,
          animation: 'fadeIn 0.3s ease-in-out',
          '@keyframes fadeIn': {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 }
          }
        }}>
          <Avatar 
            sx={{ 
              width: { xs: 20, sm: 24 }, 
              height: { xs: 20, sm: 24 }, 
              mr: 1, 
              bgcolor: 'secondary.main',
              fontSize: { xs: '0.7rem', sm: '0.8rem' }
            }}
          >
            {partner.username.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            color: 'text.secondary',
            fontSize: { xs: '0.75rem', sm: '0.85rem' },
            fontStyle: 'italic'
          }}>
            <Box component="span" sx={{ 
              mr: 0.5,
              display: { xs: 'none', sm: 'inline' }
            }}>{partner.username} is typing</Box>
            <Box component="span" sx={{ 
              mr: 0.5,
              display: { xs: 'inline', sm: 'none' }
            }}>typing</Box>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              '& .dot': {
                width: { xs: 3, sm: 4 },
                height: { xs: 3, sm: 4 },
                backgroundColor: 'text.secondary',
                borderRadius: '50%',
                mx: 0.2,
                animation: 'bounce 1.4s infinite ease-in-out both',
              },
              '& .dot:nth-of-type(1)': {
                animationDelay: '-0.32s'
              },
              '& .dot:nth-of-type(2)': {
                animationDelay: '-0.16s'
              },
              '@keyframes bounce': {
                '0%, 80%, 100%': { transform: 'scale(0)' },
                '40%': { transform: 'scale(1.0)' }
              }
            }}>
              <Box className="dot" />
              <Box className="dot" />
              <Box className="dot" />
            </Box>
          </Box>
        </Box>
      )}
      <Box component="form" onSubmit={handleSendMessage} sx={{ 
        display: 'flex',
        alignItems: 'center',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.08)', // More transparent for Apple glass effect
        borderRadius: { xs: '20px 20px 0 0', sm: 30 },
        p: { xs: 1, sm: 2 },
        mx: { xs: 0, sm: 2, md: 3 },
        mb: 0,
        mt: { xs: 1, sm: 2 },
        boxShadow: '0 -4px 15px rgba(0, 0, 0, 0.08)', // Subtle depth effect
        transition: 'all 0.4s ease',
        border: '1px solid rgba(255, 255, 255, 0.1)', // More subtle border
        backdropFilter: 'blur(10px)', // Increased blur for better Apple glass effect
        WebkitBackdropFilter: 'blur(10px)', // For Safari support
        zIndex: 10, // Higher z-index to ensure it stays on top
        width: { xs: '100%', sm: 'calc(100% - 32px)' }, // Full width on mobile, margin on larger screens
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          boxShadow: '0 -5px 18px rgba(0, 0, 0, 0.12)',
          borderColor: 'rgba(255, 255, 255, 0.25)'
        }
      }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Write a loving message..."
          value={message}
          onChange={handleTyping}
          sx={{ 
            mr: { xs: 1, sm: 2 },
            '& .MuiOutlinedInput-root': {
              borderRadius: { xs: 20, sm: 25 },
              backgroundColor: 'rgba(255, 255, 255, 0.12)', // Even more transparent background
              backdropFilter: 'blur(8px)', // Increased blur to match form
              transition: 'all 0.3s ease',
              fontSize: { xs: '0.8rem', sm: '1rem' },
              border: '1px solid rgba(255, 255, 255, 0.15)', // More subtle border
              '& .MuiOutlinedInput-input': {
                py: { xs: 1, sm: 1.7 },
                px: { xs: 1.5, sm: 2 }
              },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                }
              },
              '&.Mui-focused': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  borderWidth: 1
                }
              }
            },
            '& .MuiInputBase-input': {
              color: 'rgba(255, 255, 255, 0.85)',
              '&::placeholder': {
                color: 'rgba(255, 255, 255, 0.5)',
                opacity: 1
              }
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'transparent' // Hide the default outline
            }
          }}
          InputProps={{
             endAdornment: (
               <Box sx={{ 
                 display: 'flex', 
                 alignItems: 'center',
                 color: 'text.secondary',
                 mr: 1.5,
                 ml: 0.5
               }}>
                 <Tooltip title="Send a heart" placement="top" arrow>
                   <IconButton 
                     size="small"
                     onClick={() => {
                       setMessage(message => message + '❤️');
                     }}
                     sx={{ 
                       p: { xs: 0.5, sm: 0.7 },
                       color: 'rgba(233, 30, 99, 0.7)',
                       transition: 'all 0.4s ease',
                       backdropFilter: 'blur(5px)',
                       '&:hover': {
                         backgroundColor: 'rgba(233, 30, 99, 0.12)',
                         transform: 'scale(1.15)',
                         color: 'rgba(233, 30, 99, 0.9)',
                         boxShadow: '0 2px 8px rgba(233, 30, 99, 0.2)'
                       }
                     }}
                   >
                     <FavoriteIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                   </IconButton>
                 </Tooltip>
                 <Tooltip title="Send a flower" placement="top" arrow>
                   <IconButton 
                     size="small"
                     onClick={() => {
                       setMessage(message => message + '🌹');
                     }}
                     sx={{ 
                       p: { xs: 0.5, sm: 0.7 },
                       ml: 1,
                       color: 'rgba(156, 39, 176, 0.7)',
                       transition: 'all 0.4s ease',
                       backdropFilter: 'blur(5px)',
                       '&:hover': {
                         backgroundColor: 'rgba(156, 39, 176, 0.12)',
                         transform: 'scale(1.15)',
                         color: 'rgba(156, 39, 176, 0.9)',
                         boxShadow: '0 2px 8px rgba(156, 39, 176, 0.2)'
                       }
                     }}
                   >
                     <LocalFloristIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                   </IconButton>
                 </Tooltip>
                 <Tooltip title="Add emoji" placement="top" arrow>
                   <IconButton 
                     size="small"
                     onClick={() => {
                       // Simple emoji insertion
                       const emojis = ['😊', '😍', '🥰', '😘', '💕', '💖', '💓', '💞', '💘', '💝'];
                       const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                       setMessage(message => message + randomEmoji);
                     }}
                     sx={{ 
                       p: { xs: 0.5, sm: 0.7 },
                       ml: 1,
                       color: 'rgba(255, 215, 0, 0.7)',
                       transition: 'all 0.4s ease',
                       backdropFilter: 'blur(5px)',
                       '&:hover': {
                         backgroundColor: 'rgba(255, 215, 0, 0.12)',
                         transform: 'scale(1.15)',
                         color: 'rgba(255, 215, 0, 0.9)',
                         boxShadow: '0 2px 8px rgba(255, 215, 0, 0.2)'
                       }
                     }}
                   >
                     <EmojiEmotionsIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                   </IconButton>
                 </Tooltip>
               </Box>
             )
           }}
        />
        <Button
                variant="contained"
                color="primary"
                type="submit"
                disabled={!message.trim()}
                sx={{
                  borderRadius: 16,
                  minWidth: 0,
                  width: { xs: 40, sm: 62 },
                  height: { xs: 40, sm: 62 },
                  ml: 1,
                  background: 'linear-gradient(135deg, rgba(233, 30, 99, 0.75) 0%, rgba(156, 39, 176, 0.75) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(233, 30, 99, 0.3)',
                  boxShadow: '0 3px 10px rgba(233, 30, 99, 0.2)',
                  transition: 'all 0.4s ease',
                  opacity: message.trim() ? 1 : 0.6,
                  '&:hover': {
                    background: 'linear-gradient(135deg, rgba(233, 30, 99, 0.85) 0%, rgba(156, 39, 176, 0.85) 100%)',
                    transform: { xs: 'scale(1.05)', sm: 'translateY(-3px) scale(1.02)' },
                    boxShadow: '0 5px 15px rgba(233, 30, 99, 0.3)',
                    borderColor: 'rgba(233, 30, 99, 0.5)'
                  },
                  '&:active': {
                    transform: 'translateY(1px)',
                    boxShadow: '0 2px 8px rgba(233, 30, 99, 0.2)'
                  }
                }}
        >
          <SendIcon sx={{ 
                  fontSize: { xs: 20, sm: 24 },
                  transform: 'rotate(-15deg)',
                  transition: 'all 0.3s ease',
                  color: 'rgba(255, 255, 255, 0.95)',
                  '.MuiButton-root:hover &': {
                    transform: 'rotate(-15deg) scale(1.1)'
                  }
                }} />
        </Button>
      </Box>
    </Box>
  );
};

export default Chat;