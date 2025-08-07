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
import supabase from '../utils/supabaseClient';

const LoginSupabase = ({ onLogin }) => {
  const [yourName, setYourName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Simple validation
    if (!yourName.trim() || !partnerName.trim()) {
      setError('Both names are required');
      setLoading(false);
      return;
    }
    
    if (yourName.trim() === partnerName.trim()) {
      setError('Your name and partner name should be different');
      setLoading(false);
      return;
    }
    
    try {
      // Check if users exist in the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert([
          { username: yourName.trim() },
        ])
        .select();

      if (userError) throw userError;

      const { data: partnerData, error: partnerError } = await supabase
        .from('users')
        .upsert([
          { username: partnerName.trim() },
        ])
        .select();

      if (partnerError) throw partnerError;

      // Create user and partner objects
      const user = userData[0] || { username: yourName.trim() };
      const partner = partnerData[0] || { username: partnerName.trim() };
      
      // Insert or update user status
      const { error: statusError } = await supabase
        .from('user_status')
        .upsert({
          username: user.username,
          status: 'online'
        });
        
      if (statusError) {
        console.error('Error updating user status:', statusError);
      }
      
      // Insert partner status if not exists
      const { data: partnerStatus, error: partnerStatusCheckError } = await supabase
        .from('user_status')
        .select('status')
        .eq('username', partner.username);
        
      if (partnerStatusCheckError) {
        console.error('Error checking partner status:', partnerStatusCheckError);
      }
      
      // If partner status doesn't exist, create it
      if (!partnerStatus || partnerStatus.length === 0) {
        const { error: partnerStatusError } = await supabase
          .from('user_status')
          .insert({
            username: partner.username,
            status: 'offline'
          });
          
        if (partnerStatusError) {
          console.error('Error inserting partner status:', partnerStatusError);
        }
      }
      
      // Enable presence for this user
      await supabase.channel('online').track({ user_id: user.id || user.username });
      
      // Call the onLogin function with user and partner data
      onLogin(user, partner);
    } catch (error) {
      console.error('Error during login:', error);
      setError('Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
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
                  disabled={loading}
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
                  disabled={loading}
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
              disabled={loading}
              sx={{ 
                mt: { xs: 2, sm: 3 }, 
                mb: { xs: 1, sm: 2 }, 
                borderRadius: 2,
                py: { xs: 1, sm: 1.5 },
                fontSize: { xs: '0.9rem', sm: '1rem' }
              }}
            >
              {loading ? 'Connecting...' : 'Start Chatting'}
            </Button>
          </Box>
        </Paper>
        
       <FavoriteIcon /> 
      </Box>
    </Container>
  );
};

export default LoginSupabase;