import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Container,
  Grid,
  Divider,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';

const Login = ({ onLogin }) => {
  const [yourName, setYourName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Simple validation
    if (!yourName.trim() || !partnerName.trim()) {
      setError('Both names are required');
      return;
    }
    
    if (yourName.trim() === partnerName.trim()) {
      setError('Your name and partner name should be different');
      return;
    }
    
    // Create user and partner objects
    const user = {
      username: yourName.trim(),
    };
    
    const partner = {
      username: partnerName.trim(),
    };
    
    // Call the onLogin function with user and partner data
    onLogin(user, partner);
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: { xs: 4, sm: 8 }, display: 'flex', flexDirection: 'column', alignItems: 'center', px: { xs: 2, sm: 0 } }}>
        <Paper 
          elevation={6} 
          sx={{ 
            p: { xs: 3, sm: 4 }, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            borderRadius: 3,
            background: 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)',
            width: '100%'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FavoriteIcon color="primary" sx={{ fontSize: { xs: 32, sm: 40 }, mr: 1 }} />
            <Typography component="h1" variant="h4" color="primary" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
              Couple Chat
            </Typography>
          </Box>
          
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Your Private Space
          </Typography>
          
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
            Connect with your loved one in this exclusive chat just for the two of you
          </Typography>
          
          <Divider sx={{ width: '100%', mb: 2 }} />
          
          {error && (
            <Typography color="error" sx={{ mb: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              {error}
            </Typography>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Your Name"
                  variant="outlined"
                  value={yourName}
                  onChange={(e) => setYourName(e.target.value)}
                  required
                  InputProps={{
                    style: { fontSize: window.innerWidth < 600 ? '0.9rem' : '1rem' }
                  }}
                  InputLabelProps={{
                    style: { fontSize: window.innerWidth < 600 ? '0.9rem' : '1rem' }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Partner's Name"
                  variant="outlined"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  required
                  InputProps={{
                    style: { fontSize: window.innerWidth < 600 ? '0.9rem' : '1rem' }
                  }}
                  InputLabelProps={{
                    style: { fontSize: window.innerWidth < 600 ? '0.9rem' : '1rem' }
                  }}
                />
              </Grid>
            </Grid>
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              sx={{ 
                mt: { xs: 2, sm: 3 }, 
                mb: { xs: 1, sm: 2 }, 
                borderRadius: 2,
                py: { xs: 1, sm: 1.5 },
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              Start Chatting
            </Button>
          </Box>
        </Paper>
        
       <FavoriteIcon /> 
      </Box>
    </Container>
  );
};

export default Login;