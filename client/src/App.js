import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import LoginSupabase from './components/LoginSupabase';
import ChatSupabase from './components/ChatSupabase';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#e91e63', // Pink color for a romantic theme
      light: '#ff6090',
      dark: '#b0003a',
    },
    secondary: {
      main: '#9c27b0', // Purple as secondary color
      light: '#d05ce3',
      dark: '#6a0080',
    },
    background: {
      default: '#0a0a0a',
      paper: '#1a1a1a',
    },
    error: {
      main: '#f44336',
    },
    success: {
      main: '#4caf50',
    },
    info: {
      main: '#34B7F1', // WhatsApp blue for read receipts
    },
    love: {
      main: '#ff4081', // Special love color for couple elements
      light: '#ff79b0',
      dark: '#c60055',
    },
  },
  typography: {
    fontFamily: '"Quicksand", "Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 600,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 16,
  },
});

function App() {
  const [user, setUser] = useState(null);
  const [partner, setPartner] = useState(null);

  // Check if user is already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const storedPartner = localStorage.getItem('partner');
    if (storedPartner) {
      setPartner(JSON.parse(storedPartner));
    }
  }, []);

  // Handle login
  const handleLogin = (userData, partnerData) => {
    setUser(userData);
    setPartner(partnerData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('partner', JSON.stringify(partnerData));
  };

  // Handle logout
  const handleLogout = () => {
    setUser(null);
    setPartner(null);
    localStorage.removeItem('user');
    localStorage.removeItem('partner');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div className="App">
          <Routes>
            <Route 
              path="/" 
              element={
                !user ? 
                <LoginSupabase onLogin={handleLogin} /> : 
                <Navigate to="/chat" />
              } 
            />
            <Route 
              path="/chat" 
              element={
                user ? 
                <ChatSupabase 
                  user={user} 
                  partner={partner} 
                  onLogout={handleLogout} 
                /> : 
                <Navigate to="/" />
              } 
            />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
