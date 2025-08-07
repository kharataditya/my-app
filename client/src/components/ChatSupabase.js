import React, { useState, useEffect, useRef } from 'react';
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
import supabase from '../utils/supabaseClient';

// Import glassmorphism styles
import './GlassmorphismStyles.css';

// Create a function to update connection status in all components
const updateConnectionStatus = (status) => {
  // This will be called by the Chat component to update its state
  window.dispatchEvent(new CustomEvent('supabase_status_change', { detail: status }));
};

const ChatSupabase = ({ user, partner, onLogout }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const messagesEndRef = useRef(null);
  
  // Use a ref to track unread messages to persist across renders
  const unreadMessagesRef = useRef([]);

  // Refs for Supabase subscriptions
  const messagesSubscription = useRef(null);
  const typingSubscription = useRef(null);
  const presenceSubscription = useRef(null);

  // Function to fetch messages from Supabase
  const fetchMessages = async () => {
    try {
      console.log('Fetching messages between', user.username, 'and', partner.username);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender.eq.${user.username},recipient.eq.${user.username}`)
        .or(`sender.eq.${partner.username},recipient.eq.${partner.username}`)
        .order('timestamp', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      console.log('Received messages:', data.length);
      setMessages(data || []);
      
      // Mark messages as read if user is the recipient
      const unreadMessages = data.filter(msg => 
        msg.recipient === user.username && 
        !msg.read
      );
      
      if (unreadMessages.length > 0) {
        console.log(`Found ${unreadMessages.length} unread messages for ${user.username}`);
        markMessagesAsRead(unreadMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error.message);
    }
  };

  // Function to mark messages as read
  const markMessagesAsRead = async (messagesToMark) => {
    try {
      // Update messages in Supabase
      for (const msg of messagesToMark) {
        const { error } = await supabase
          .from('messages')
          .update({ 
            read: true, 
            read_timestamp: new Date().toISOString() 
          })
          .eq('id', msg.id);
          
        if (error) {
          console.error('Error marking message as read:', error);
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error.message);
    }
  };

  // Listen for Supabase status changes
  useEffect(() => {
    const handleStatusChange = (event) => {
      console.log('Supabase status changed:', event.detail);
      setConnectionStatus(event.detail);
    };
    
    window.addEventListener('supabase_status_change', handleStatusChange);
    
    return () => {
      window.removeEventListener('supabase_status_change', handleStatusChange);
    };
  }, []);

  // Initialize Supabase subscriptions
  useEffect(() => {
    console.log('Initializing Supabase subscriptions for user:', user.username);
    
    // Set initial connection status
    setConnectionStatus('connected');
    updateConnectionStatus('connected');
    
    // Subscribe to new messages
    messagesSubscription.current = supabase
      .channel('public:messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' }, 
        (payload) => {
          console.log('New message received:', payload);
          // Only add message if it's relevant to this chat
          if ((payload.new.sender === user.username && payload.new.recipient === partner.username) ||
              (payload.new.sender === partner.username && payload.new.recipient === user.username)) {
            setMessages(prev => [...prev, payload.new]);
            
            // Mark as read if user is the recipient
            if (payload.new.recipient === user.username) {
              markMessagesAsRead([payload.new]);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Messages subscription status:', status);
      });
    
    // Create a broadcast channel for typing indicators
    typingSubscription.current = supabase
      .channel('typing')
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.sender === partner.username && payload.recipient === user.username) {
          setIsPartnerTyping(payload.isTyping);
        }
      })
      .subscribe();
    
    // Create a presence channel for online status
    presenceSubscription.current = supabase
      .channel('online')
      .on('presence', { event: 'sync' }, () => {
        const state = presenceSubscription.current.presenceState();
        console.log('Presence state:', state);
        
        // Check if partner is in the presence state
        const isOnline = Object.keys(state).some(key => {
          return state[key].some(presence => presence.user === partner.username);
        });
        
        setIsPartnerOnline(isOnline);
      })
      .subscribe();
    
    // Track user's presence
    presenceSubscription.current.track({
      user: user.username,
      online_at: new Date().toISOString(),
    });
    
    // Fetch initial messages
    fetchMessages();
    
    // Check partner's status
    checkPartnerStatus();
    
    return () => {
      // Clean up subscriptions
      if (messagesSubscription.current) {
        messagesSubscription.current.unsubscribe();
      }
      
      if (typingSubscription.current) {
        typingSubscription.current.unsubscribe();
      }
      
      if (presenceSubscription.current) {
        presenceSubscription.current.untrack();
        presenceSubscription.current.unsubscribe();
      }
    };
  }, [user, partner]);

  // Check partner's online status
  const checkPartnerStatus = async () => {
    try {
      // First check if the partner exists in the user_status table
      const { data, error } = await supabase
        .from('user_status')
        .select('status')
        .eq('username', partner.username);
      
      if (error) {
        console.error('Error checking partner status:', error);
        return;
      }
      
      // If no data or empty array, insert a new record
      if (!data || data.length === 0) {
        const { error: insertError } = await supabase
          .from('user_status')
          .insert({
            username: partner.username,
            status: 'offline'
          });
          
        if (insertError) {
          console.error('Error inserting partner status:', insertError);
        }
        setIsPartnerOnline(false);
      } else {
        setIsPartnerOnline(data[0]?.status === 'online');
      }
    } catch (error) {
      console.error('Error checking partner status:', error.message);
    }
  };

  // Send a message
  const sendMessage = async () => {
    if (!message.trim()) return;
    
    const newMessage = {
      sender: user.username,
      recipient: partner.username,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    try {
      // Insert message into Supabase
      const { data, error } = await supabase
        .from('messages')
        .insert(newMessage)
        .select();
      
      if (error) {
        throw error;
      }
      
      console.log('Message sent:', data);
      
      // Clear typing indicator
      sendTypingIndicator(false);
      
      // Clear message input
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error.message);
      alert('Failed to send message. Please try again.');
    }
  };

  // Send typing indicator
  const sendTypingIndicator = (isTyping) => {
    if (typingSubscription.current) {
      typingSubscription.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          sender: user.username,
          recipient: partner.username,
          isTyping
        }
      });
    }
  };

  // Handle message input change
  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    
    // Send typing indicator
    sendTypingIndicator(true);
    
    // Clear previous timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Set new timeout to clear typing indicator
    const newTimeout = setTimeout(() => {
      sendTypingIndicator(false);
    }, 3000);
    
    setTypingTimeout(newTimeout);
  };

  // Handle message send on Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get connection status color
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return '#4CAF50'; // Green
      case 'connecting':
      case 'reconnecting':
        return '#FF9800'; // Orange
      case 'disconnected':
      case 'error':
      case 'failed':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Grey
    }
  };

  // Get connection status text
  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      case 'failed':
        return 'Connection Failed';
      default:
        return 'Unknown Status';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#121212' }}>
      <AppBar position="static" className="glassmorphism">
        <Toolbar sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          py: { xs: 1, sm: 0 }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" component="div" sx={{ 
              display: 'flex', 
              alignItems: 'center',
              fontWeight: 'bold',
              color: '#fff',
              textShadow: '0 0 10px rgba(255,255,255,0.5)'
            }}>
              <FavoriteIcon sx={{ mr: 1, color: '#ff4081' }} />
              Forever <span style={{ color: '#ff4081', margin: '0 5px' }}>♥</span> Together
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Connection status indicator */}
            <Tooltip 
              title={getConnectionStatusText()}
              TransitionComponent={Zoom}
              arrow
            >
              <Box 
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: getConnectionStatusColor(),
                  mr: 2,
                  transition: 'background-color 0.3s ease',
                  boxShadow: `0 0 10px ${getConnectionStatusColor()}`
                }}
              />
            </Tooltip>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              <Badge
                color={isPartnerOnline ? "success" : "error"}
                variant="dot"
                overlap="circular"
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
              >
                <Avatar sx={{ bgcolor: '#9c27b0' }}>
                  {partner.username.charAt(0).toUpperCase()}
                </Avatar>
              </Badge>
              <Typography variant="subtitle1" sx={{ ml: 1, color: '#fff' }}>
                {partner.username}
                {isPartnerTyping && (
                  <Typography variant="caption" sx={{ display: 'block', color: '#bbb', fontStyle: 'italic' }}>
                    typing...
                  </Typography>
                )}
              </Typography>
            </Box>
            
            <IconButton color="inherit" onClick={onLogout} aria-label="logout">
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="md" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', py: 2, overflow: 'hidden' }}>
        <Paper 
          elevation={3} 
          className="glassmorphism"
          sx={{ 
            flexGrow: 1, 
            mb: 2, 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <Box sx={{ 
            p: 2, 
            overflowY: 'auto', 
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.3)',
              },
            },
          }}>
            {messages.map((msg, index) => {
              const isUserMessage = msg.sender === user.username;
              return (
                <Box 
                  key={msg.id || index} 
                  sx={{ 
                    alignSelf: isUserMessage ? 'flex-end' : 'flex-start',
                    maxWidth: '70%',
                    position: 'relative'
                  }}
                >
                  <Paper 
                    elevation={2}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: isUserMessage ? 'rgba(233, 30, 99, 0.15)' : 'rgba(156, 39, 176, 0.15)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid',
                      borderColor: isUserMessage ? 'rgba(233, 30, 99, 0.3)' : 'rgba(156, 39, 176, 0.3)',
                      position: 'relative',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: 'inherit',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
                        pointerEvents: 'none'
                      }
                    }}
                  >
                    <Typography variant="body1" sx={{ color: '#fff', wordBreak: 'break-word' }}>
                      {msg.message}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block', 
                        textAlign: 'right', 
                        mt: 0.5,
                        color: 'rgba(255,255,255,0.6)'
                      }}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isUserMessage && (
                        <span style={{ marginLeft: '4px' }}>
                          {msg.read ? '✓✓' : '✓'}
                        </span>
                      )}
                    </Typography>
                  </Paper>
                  {index === messages.length - 1 && (
                    <Box ref={messagesEndRef} />
                  )}
                </Box>
              );
            })}
            {messages.length === 0 && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                opacity: 0.7
              }}>
                <LocalFloristIcon sx={{ fontSize: 60, color: '#e91e63', mb: 2, opacity: 0.6 }} />
                <Typography variant="h6" sx={{ color: '#fff', textAlign: 'center' }}>
                  No messages yet
                </Typography>
                <Typography variant="body2" sx={{ color: '#bbb', textAlign: 'center', mt: 1 }}>
                  Send a message to start the conversation
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
        
        <Paper 
          component="form" 
          className="glassmorphism"
          sx={{ 
            p: 2,
            display: 'flex', 
            alignItems: 'center',
            gap: 1
          }}
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <IconButton 
            color="primary" 
            aria-label="add emoji"
            sx={{ color: '#e91e63' }}
          >
            <EmojiEmotionsIcon />
          </IconButton>
          
          <TextField
            fullWidth
            placeholder="Type a message..."
            value={message}
            onChange={handleMessageChange}
            onKeyPress={handleKeyPress}
            variant="outlined"
            size="small"
            autoComplete="off"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#e91e63',
                },
              },
              '& .MuiInputBase-input::placeholder': {
                color: 'rgba(255, 255, 255, 0.5)',
                opacity: 1,
              },
            }}
          />
          
          <Button
            variant="contained"
            color="primary"
            endIcon={<SendIcon />}
            onClick={sendMessage}
            disabled={!message.trim()}
            sx={{
              bgcolor: '#e91e63',
              '&:hover': {
                bgcolor: '#d81b60',
              },
              '&.Mui-disabled': {
                bgcolor: 'rgba(233, 30, 99, 0.3)',
              },
            }}
          >
            Send
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default ChatSupabase;