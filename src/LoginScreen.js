import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';

export default function LoginScreen({ onSignIn, loading, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSignIn(email.trim(), password);
  };

  const inputSx = {
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.25)' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.45)' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FF9BBF' },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #05060A 0%, #0A0D14 50%, #05060A 100%)',
        p: 2,
      }}
    >
      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 4,
          maxWidth: 420,
          width: '100%',
          background: 'linear-gradient(135deg, rgba(21,24,33,0.95) 0%, rgba(10,13,20,0.95) 100%)',
          border: '1px solid rgba(255,155,191,0.25)',
          borderRadius: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <LockIcon sx={{ color: '#FF9BBF', fontSize: 32 }} />
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #FF9BBF 0%, #FFC857 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Solana Admin
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)', mb: 3 }}>
          Accedi con un account Firebase autorizzato come amministratore.
        </Typography>
        {error ? (
          <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(211,47,47,0.15)', color: '#ffcdd2' }}>
            {error}
          </Alert>
        ) : null}
        <TextField
          fullWidth
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          margin="normal"
          InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.7)' } }}
          InputProps={{ sx: { color: 'white', ...inputSx } }}
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          margin="normal"
          InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.7)' } }}
          InputProps={{ sx: { color: 'white', ...inputSx } }}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading || !email.trim() || !password}
          sx={{
            mt: 3,
            py: 1.25,
            fontWeight: 700,
            bgcolor: '#FF9BBF',
            '&:hover': { bgcolor: '#FF6BA3' },
          }}
        >
          {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Accedi'}
        </Button>
      </Paper>
    </Box>
  );
}
