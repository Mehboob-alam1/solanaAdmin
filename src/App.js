import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Switch, 
  FormControlLabel,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  IconButton,
  Alert,
  Snackbar,
  Chip,
  Divider,
  CircularProgress,
  LinearProgress,
  Tooltip,
  Fade,
  Zoom
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Launch as LaunchIcon,
  Facebook as FacebookIcon
} from '@mui/icons-material';
import { 
  ref, 
  get, 
  set, 
  remove,
  getDatabase
} from 'firebase/database';
import app from './firebase';
import { initializeFirestoreStructure, checkFirestoreStructure } from './utils/firestoreInit';
import './App.css';

const AD_SLOTS = [
  { id: 'app_open', name: 'App Open Ad', type: 'AppOpen', location: 'App Launch', icon: '🚀' },
  { id: 'banner_home', name: 'Home Banner', type: 'Banner', location: 'Home Screen', icon: '🏠' },
  { id: 'banner_wallet', name: 'Wallet Banner', type: 'Banner', location: 'Wallet Screen', icon: '💼' },
  { id: 'banner_leaderboard', name: 'Leaderboard Banner', type: 'Banner', location: 'Leaderboard Screen', icon: '🏆' },
  { id: 'banner_challenges', name: 'Challenges Banner', type: 'Banner', location: 'Challenges Screen', icon: '🎯' },
  { id: 'banner_referrals', name: 'Referrals Banner', type: 'Banner', location: 'Referrals Screen', icon: '👥' },
  { id: 'banner_profile', name: 'Profile Banner', type: 'Banner', location: 'Profile Screen', icon: '👤' },
  { id: 'banner_auth', name: 'Auth Banner', type: 'Banner', location: 'Auth Screen', icon: '🔐' },
  { id: 'banner_onboarding', name: 'Onboarding Banner', type: 'Banner', location: 'Onboarding Screens', icon: '📱' },
  { id: 'interstitial_login', name: 'Login Interstitial', type: 'Interstitial', location: 'After Login', icon: '🚪' },
  { id: 'interstitial_screen_transition', name: 'Screen Transition', type: 'Interstitial', location: 'Between Screens', icon: '🔄' },
  { id: 'interstitial_challenge_complete', name: 'Challenge Complete', type: 'Interstitial', location: 'After Challenge', icon: '✅' },
  { id: 'rewarded_challenge', name: 'Challenge Rewarded', type: 'Rewarded', location: 'Challenge Rewards', icon: '🎁' },
  { id: 'rewarded_booster', name: 'Booster Rewarded', type: 'Rewarded', location: 'Power-up Boosters', icon: '⚡' },
  { id: 'native_onboarding', name: 'Onboarding Native', type: 'Native', location: 'Onboarding Pages', icon: '📄' },
  { id: 'native_auth', name: 'Auth Native', type: 'Native', location: 'Auth Screen', icon: '📋' },
];

function App() {
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [adSlots, setAdSlots] = useState({});
  const [websiteRedirect, setWebsiteRedirect] = useState({ enabled: false, url: '' });
  const [facebookMeta, setFacebookMeta] = useState({ app_id: '', client_token: '' });
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [formData, setFormData] = useState({
    enabled: true,
    admob_id: '',
    adx_id: '',
    facebook_id: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const database = getDatabase(app);
      
      // Load global config - create if doesn't exist
      const globalRef = ref(database, 'ads_config/global');
      const globalSnap = await get(globalRef);
      if (globalSnap.exists()) {
        const data = globalSnap.val();
        setAdsEnabled(data?.ads_enabled ?? true);
      } else {
        // Create global config if missing
        await set(globalRef, { ads_enabled: true });
        setAdsEnabled(true);
      }

      // Load website redirect config - create if doesn't exist
      const websiteRedirectRef = ref(database, 'app_config/website_redirect');
      const websiteRedirectSnap = await get(websiteRedirectRef);
      if (websiteRedirectSnap.exists()) {
        const data = websiteRedirectSnap.val();
        setWebsiteRedirect({
          enabled: data?.enabled ?? false,
          url: data?.url || ''
        });
      } else {
        // Create default website redirect config if missing
        const defaultWebsiteRedirect = {
          enabled: false,
          url: 'https://finance.easyranktools.com/'
        };
        await set(websiteRedirectRef, defaultWebsiteRedirect);
        setWebsiteRedirect(defaultWebsiteRedirect);
      }

      // Load Facebook meta config - create if doesn't exist
      const facebookMetaRef = ref(database, 'app_config/meta');
      const facebookMetaSnap = await get(facebookMetaRef);
      if (facebookMetaSnap.exists()) {
        const data = facebookMetaSnap.val();
        setFacebookMeta({
          app_id: data?.app_id || '',
          client_token: data?.client_token || ''
        });
      } else {
        // Create default Facebook meta config if missing
        const defaultFacebookMeta = {
          app_id: '',
          client_token: ''
        };
        await set(facebookMetaRef, defaultFacebookMeta);
        setFacebookMeta(defaultFacebookMeta);
      }

      // Load all ad slots - create missing ones
      const slots = {};
      for (const slot of AD_SLOTS) {
        const slotRef = ref(database, `ads_config/${slot.id}`);
        const slotSnap = await get(slotRef);
        
        if (slotSnap.exists()) {
          slots[slot.id] = slotSnap.val();
        } else {
          // Create missing slot with default values
          const testAdUnitId = slot.type === 'Banner' ? 'ca-app-pub-3940256099942544/6300978111' :
                              slot.type === 'Interstitial' ? 'ca-app-pub-3940256099942544/1033173712' :
                              slot.type === 'Rewarded' ? 'ca-app-pub-3940256099942544/5224354917' :
                              slot.type === 'AppOpen' ? 'ca-app-pub-3940256099942544/3419835294' :
                              'ca-app-pub-3940256099942544/2247696110';
          
          const facebookId = slot.type === 'Banner' || slot.type === 'Native' 
            ? 'IMG_16_9_APP_INSTALL#123456789'
            : 'VID_HD_16_9_46S_APP_INSTALL#123456789';
          
          const defaultData = {
            enabled: true, // Default enabled as per documentation
            admob_id: testAdUnitId,
            adx_id: testAdUnitId,
            facebook_id: facebookId
          };
          
          await set(slotRef, defaultData);
          slots[slot.id] = defaultData;
        }
      }
      
      setAdSlots(slots);
    } catch (error) {
      console.error('Error loading data:', error);
      showSnackbar(`Error loading data: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  // Initialize Firestore structure on mount
  useEffect(() => {
    const init = async () => {
      try {
        setInitializing(true);
        const exists = await checkFirestoreStructure();
        
        if (!exists) {
          console.log('📦 Firestore structure not found. Creating all documents...');
          const result = await initializeFirestoreStructure(false);
          showSnackbar(
            `Firestore structure created! Created ${result.created} documents.`, 
            'success'
          );
        } else {
          console.log('✅ Firestore structure already exists');
          // Ensure all documents exist (create missing ones)
          const result = await initializeFirestoreStructure(false);
          if (result.created > 0) {
            showSnackbar(
              `Created ${result.created} missing documents.`, 
              'success'
            );
          }
        }
        
        // Load data after initialization
        await loadData();
      } catch (error) {
        console.error('Error initializing:', error);
        const errorMsg = error.message || error.toString();
        if (errorMsg.includes('YOUR_') || errorMsg.includes('configuration')) {
          showSnackbar(
            '⚠️ Please configure Firebase! Update src/firebase.js with your real config. See FIREBASE_SETUP_INSTRUCTIONS.md',
            'error'
          );
        } else {
          showSnackbar(`Error: ${errorMsg}`, 'error');
        }
      } finally {
        setInitializing(false);
        setLoading(false);
      }
    };

    init();
  }, [loadData, showSnackbar]);

  const handleGlobalToggle = async (event) => {
    const newValue = event.target.checked;
    try {
      const database = getDatabase(app);
      await set(ref(database, 'ads_config/global'), {
        ads_enabled: newValue
      });
      setAdsEnabled(newValue);
      showSnackbar(`Ads ${newValue ? 'enabled' : 'disabled'} globally`, 'success');
    } catch (error) {
      console.error('Error updating global config:', error);
      showSnackbar(`Error updating global config: ${error.message}`, 'error');
    }
  };

  const handleWebsiteRedirectToggle = async (event) => {
    const newValue = event.target.checked;
    try {
      const database = getDatabase(app);
      await set(ref(database, 'app_config/website_redirect'), {
        enabled: newValue,
        url: websiteRedirect.url
      });
      setWebsiteRedirect(prev => ({ ...prev, enabled: newValue }));
      showSnackbar(`Website redirect ${newValue ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      console.error('Error updating website redirect config:', error);
      showSnackbar(`Error updating website redirect: ${error.message}`, 'error');
    }
  };

  const handleWebsiteRedirectUrlChange = async (newUrl) => {
    try {
      const database = getDatabase(app);
      await set(ref(database, 'app_config/website_redirect'), {
        enabled: websiteRedirect.enabled,
        url: newUrl.trim()
      });
      setWebsiteRedirect(prev => ({ ...prev, url: newUrl.trim() }));
      showSnackbar('Website redirect URL updated successfully', 'success');
    } catch (error) {
      console.error('Error updating website redirect URL:', error);
      showSnackbar(`Error updating website redirect URL: ${error.message}`, 'error');
    }
  };

  const handleFacebookMetaChange = async (field, value) => {
    try {
      const database = getDatabase(app);
      const updatedMeta = {
        ...facebookMeta,
        [field]: value.trim()
      };
      await set(ref(database, 'app_config/meta'), updatedMeta);
      setFacebookMeta(updatedMeta);
      showSnackbar(`Facebook ${field === 'app_id' ? 'App ID' : 'Client Token'} updated successfully`, 'success');
    } catch (error) {
      console.error('Error updating Facebook meta:', error);
      showSnackbar(`Error updating Facebook meta: ${error.message}`, 'error');
    }
  };

  const handleEdit = (slotId) => {
    const slot = adSlots[slotId] || {
      enabled: false,
      admob_id: '',
      adx_id: '',
      facebook_id: ''
    };
    
    setEditingSlot(slotId);
    setFormData({
      enabled: slot.enabled ?? false,
      admob_id: slot.admob_id || '',
      adx_id: slot.adx_id || '',
      facebook_id: slot.facebook_id || ''
    });
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!editingSlot) {
      showSnackbar('Please select a slot to edit', 'warning');
      return;
    }

    try {
      const database = getDatabase(app);
      await set(ref(database, `ads_config/${editingSlot}`), {
        enabled: formData.enabled,
        admob_id: formData.admob_id.trim(),
        adx_id: formData.adx_id.trim(),
        facebook_id: formData.facebook_id.trim()
      });

      setAdSlots(prev => ({
        ...prev,
        [editingSlot]: {
          enabled: formData.enabled,
          admob_id: formData.admob_id.trim(),
          adx_id: formData.adx_id.trim(),
          facebook_id: formData.facebook_id.trim()
        }
      }));

      setOpenDialog(false);
      showSnackbar('Ad slot updated successfully!', 'success');
    } catch (error) {
      console.error('Error saving ad slot:', error);
      showSnackbar(`Error saving ad slot: ${error.message}`, 'error');
    }
  };

  const handleDelete = async (slotId) => {
    if (!window.confirm(`Are you sure you want to delete "${slotId}"?`)) {
      return;
    }

    try {
      const database = getDatabase(app);
      await remove(ref(database, `ads_config/${slotId}`));
      
      setAdSlots(prev => {
        const newSlots = { ...prev };
        delete newSlots[slotId];
        return newSlots;
      });

      showSnackbar('Ad slot deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting ad slot:', error);
      showSnackbar(`Error deleting ad slot: ${error.message}`, 'error');
    }
  };

  const handleRefresh = async () => {
    await loadData();
    showSnackbar('Data refreshed', 'success');
  };

  const handleInitialize = async () => {
    try {
      setInitializing(true);
      const result = await initializeFirestoreStructure(true); // Force create/update all
      await loadData();
      showSnackbar(
        `Firestore structure reinitialized! Created: ${result.created}, Updated: ${result.updated}`, 
        'success'
      );
    } catch (error) {
      console.error('Error initializing:', error);
      showSnackbar('Error initializing Firestore', 'error');
    } finally {
      setInitializing(false);
    }
  };

  const getSlotInfo = (slotId) => {
    return AD_SLOTS.find(s => s.id === slotId) || { name: slotId, type: 'Unknown', location: 'Unknown', icon: '❓' };
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Banner': return '#FF9BBF';
      case 'Interstitial': return '#FFC857';
      case 'Rewarded': return '#4CAF50';
      case 'Native': return '#9C27B0';
      case 'AppOpen': return '#FF5722';
      default: return '#757575';
    }
  };

  if (initializing) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #05060A 0%, #0A0D14 50%, #05060A 100%)'
      }}>
        <CircularProgress sx={{ color: '#FF9BBF', mb: 3 }} size={60} />
        <Typography variant="h6" sx={{ color: '#FF9BBF', fontWeight: 600 }}>
          Initializing Firestore Structure...
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mt: 1 }}>
          Creating ad configuration documents
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #05060A 0%, #0A0D14 50%, #05060A 100%)',
      pb: 4
    }}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Fade in timeout={800}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 2
            }}>
              <Box>
                <Typography variant="h3" component="h1" sx={{ 
                  fontWeight: 'bold', 
                  background: 'linear-gradient(135deg, #FF9BBF 0%, #FFC857 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1
                }}>
                  Eth 2 Panel
                </Typography>
                <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>
                  Ad Configuration
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Tooltip title="Reinitialize Firestore Structure">
                  <Button
                    variant="outlined"
                    startIcon={<SettingsIcon />}
                    onClick={handleInitialize}
                    disabled={initializing}
                    sx={{ 
                      borderColor: 'rgba(255,155,191,0.5)',
                      color: '#FF9BBF',
                      '&:hover': { 
                        borderColor: '#FF9BBF',
                        bgcolor: 'rgba(255,155,191,0.1)'
                      }
                    }}
                  >
                    Init
                  </Button>
                </Tooltip>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  disabled={loading}
                  sx={{ 
                    borderColor: 'rgba(255,155,191,0.5)',
                    color: '#FF9BBF',
                    '&:hover': { 
                      borderColor: '#FF9BBF',
                      bgcolor: 'rgba(255,155,191,0.1)'
                    }
                  }}
                >
                  Refresh
                </Button>
              </Box>
            </Box>
            {loading && <LinearProgress sx={{ bgcolor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#FF9BBF' } }} />}
          </Box>
        </Fade>

        {/* Global Toggle */}
        <Fade in timeout={1000}>
          <Paper sx={{ 
            p: 4, 
            mb: 4, 
            background: 'linear-gradient(135deg, rgba(21,24,33,0.95) 0%, rgba(10,13,20,0.95) 100%)',
            border: '1px solid rgba(255,155,191,0.2)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(10px)'
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
                    Global Ads Control
                  </Typography>
                  {adsEnabled ? (
                    <CheckCircleIcon sx={{ color: '#4CAF50', fontSize: 28 }} />
                  ) : (
                    <WarningIcon sx={{ color: '#ff5252', fontSize: 28 }} />
                  )}
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  Enable or disable all ads across the entire app instantly
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={adsEnabled}
                    onChange={handleGlobalToggle}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#FF9BBF',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#FF9BBF',
                      },
                      '& .MuiSwitch-thumb': {
                        boxShadow: '0 2px 8px rgba(255,155,191,0.4)',
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ 
                    color: 'white', 
                    fontWeight: 600,
                    fontSize: '1.1rem'
                  }}>
                    {adsEnabled ? 'Enabled' : 'Disabled'}
                  </Typography>
                }
              />
            </Box>
          </Paper>
        </Fade>

        {/* Website Redirect Control */}
        <Fade in timeout={1200}>
          <Paper sx={{ 
            p: 4, 
            mb: 4, 
            background: 'linear-gradient(135deg, rgba(21,24,33,0.95) 0%, rgba(10,13,20,0.95) 100%)',
            border: '1px solid rgba(255,155,191,0.2)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(10px)'
          }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LaunchIcon sx={{ color: '#FF9BBF', fontSize: 28 }} />
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
                  Website Redirect Control
                </Typography>
                {websiteRedirect.enabled ? (
                  <CheckCircleIcon sx={{ color: '#4CAF50', fontSize: 28 }} />
                ) : (
                  <WarningIcon sx={{ color: '#ff5252', fontSize: 28 }} />
                )}
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 3 }}>
                Configure website redirect URL and enable/disable redirect functionality
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                <TextField
                  fullWidth
                  label="Redirect URL"
                  value={websiteRedirect.url}
                  onChange={(e) => setWebsiteRedirect(prev => ({ ...prev, url: e.target.value }))}
                  onBlur={(e) => {
                    if (e.target.value.trim() !== websiteRedirect.url) {
                      handleWebsiteRedirectUrlChange(e.target.value);
                    }
                  }}
                  placeholder="https://finance.easyranktools.com/"
                  InputLabelProps={{ style: { color: '#fff' } }}
                  InputProps={{
                    sx: {
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.5)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#FF9BBF',
                      },
                    },
                  }}
                  sx={{ flex: 1 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={websiteRedirect.enabled}
                      onChange={handleWebsiteRedirectToggle}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#FF9BBF',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#FF9BBF',
                        },
                        '& .MuiSwitch-thumb': {
                          boxShadow: '0 2px 8px rgba(255,155,191,0.4)',
                        },
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ 
                      color: 'white', 
                      fontWeight: 600,
                      fontSize: '1.1rem',
                      minWidth: '80px'
                    }}>
                      {websiteRedirect.enabled ? 'Enabled' : 'Disabled'}
                    </Typography>
                  }
                />
              </Box>
            </Box>
          </Paper>
        </Fade>

        {/* Facebook Meta Configuration */}
        <Fade in timeout={1400}>
          <Paper sx={{ 
            p: 4, 
            mb: 4, 
            background: 'linear-gradient(135deg, rgba(21,24,33,0.95) 0%, rgba(10,13,20,0.95) 100%)',
            border: '1px solid rgba(255,155,191,0.2)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(10px)'
          }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <FacebookIcon sx={{ color: '#FF9BBF', fontSize: 28 }} />
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
                  Facebook Meta Configuration
                </Typography>
                {(facebookMeta.app_id && facebookMeta.client_token) ? (
                  <CheckCircleIcon sx={{ color: '#4CAF50', fontSize: 28 }} />
                ) : (
                  <WarningIcon sx={{ color: '#ff5252', fontSize: 28 }} />
                )}
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 3 }}>
                Configure Facebook App ID and Client Token for Facebook Ads integration
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Facebook App ID"
                    value={facebookMeta.app_id}
                    onChange={(e) => setFacebookMeta(prev => ({ ...prev, app_id: e.target.value }))}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== facebookMeta.app_id) {
                        handleFacebookMetaChange('app_id', e.target.value);
                      }
                    }}
                    placeholder="YOUR_FACEBOOK_APP_ID"
                    InputLabelProps={{ style: { color: '#fff' } }}
                    InputProps={{
                      sx: {
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255,255,255,0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255,255,255,0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#FF9BBF',
                        },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Facebook Client Token"
                    value={facebookMeta.client_token}
                    onChange={(e) => setFacebookMeta(prev => ({ ...prev, client_token: e.target.value }))}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== facebookMeta.client_token) {
                        handleFacebookMetaChange('client_token', e.target.value);
                      }
                    }}
                    placeholder="YOUR_FACEBOOK_CLIENT_TOKEN"
                    type="password"
                    InputLabelProps={{ style: { color: '#fff' } }}
                    InputProps={{
                      sx: {
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255,255,255,0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255,255,255,0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#FF9BBF',
                        },
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Fade>

        {/* Ad Slots Grid */}
        <Grid container spacing={3}>
          {AD_SLOTS.map((slot, index) => {
            const slotData = adSlots[slot.id] || {
              enabled: false,
              admob_id: '',
              adx_id: '',
              facebook_id: ''
            };

            const typeColor = getTypeColor(slot.type);

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={slot.id}>
                <Zoom in timeout={300 + index * 50}>
                  <Card sx={{ 
                    background: slotData.enabled 
                      ? `linear-gradient(135deg, rgba(21,24,33,0.95) 0%, rgba(10,13,20,0.95) 100%)`
                      : `linear-gradient(135deg, rgba(21,24,33,0.6) 0%, rgba(10,13,20,0.6) 100%)`,
                    border: `1px solid ${slotData.enabled ? 'rgba(255,155,191,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s ease',
                    boxShadow: slotData.enabled 
                      ? '0 8px 32px rgba(255,155,191,0.2)' 
                      : '0 4px 16px rgba(0,0,0,0.2)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 40px rgba(255,155,191,0.3)',
                      borderColor: 'rgba(255,155,191,0.5)',
                    }
                  }}>
                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="h4" sx={{ fontSize: '2rem' }}>
                              {slot.icon}
                            </Typography>
                            <Typography variant="h6" sx={{ 
                              fontWeight: 'bold', 
                              color: 'white',
                              flex: 1
                            }}>
                              {slot.name}
                            </Typography>
                          </Box>
                          <Chip 
                            label={slot.type} 
                            size="small" 
                            sx={{ 
                              bgcolor: typeColor,
                              color: 'white',
                              fontWeight: 600,
                              mr: 1,
                              mb: 1
                            }} 
                          />
                          <Typography variant="caption" sx={{ 
                            display: 'block', 
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: '0.75rem'
                          }}>
                            📍 {slot.location}
                          </Typography>
                        </Box>
                        <Chip 
                          icon={slotData.enabled ? <CheckCircleIcon /> : <WarningIcon />}
                          label={slotData.enabled ? 'Active' : 'Inactive'} 
                          size="small"
                          sx={{
                            bgcolor: slotData.enabled ? 'rgba(76,175,80,0.2)' : 'rgba(255,82,82,0.2)',
                            color: slotData.enabled ? '#4CAF50' : '#ff5252',
                            border: `1px solid ${slotData.enabled ? '#4CAF50' : '#ff5252'}`,
                            fontWeight: 600
                          }}
                        />
                      </Box>

                      <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" sx={{ 
                          display: 'block', 
                          mb: 0.5,
                          color: 'rgba(255,255,255,0.6)',
                          fontWeight: 600
                        }}>
                          AdMob ID:
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          fontFamily: 'monospace', 
                          fontSize: '0.7rem',
                          wordBreak: 'break-all',
                          color: slotData.admob_id ? '#FFC857' : 'rgba(255,255,255,0.4)',
                          bgcolor: 'rgba(0,0,0,0.2)',
                          p: 1,
                          borderRadius: 1
                        }}>
                          {slotData.admob_id || 'Not configured'}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => handleEdit(slot.id)}
                          fullWidth
                          sx={{ 
                            borderColor: '#FF9BBF',
                            color: '#FF9BBF',
                            fontWeight: 600,
                            '&:hover': { 
                              borderColor: '#FF6BA3', 
                              bgcolor: 'rgba(255,155,191,0.1)',
                              transform: 'scale(1.02)'
                            }
                          }}
                        >
                          Edit
                        </Button>
                        <Tooltip title="Delete this ad slot">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(slot.id)}
                            sx={{ 
                              color: '#ff5252',
                              '&:hover': { 
                                bgcolor: 'rgba(255,82,82,0.1)',
                                transform: 'scale(1.1)'
                              }
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                </Zoom>
              </Grid>
            );
          })}
        </Grid>

        {/* Edit Dialog */}
        <Dialog 
          open={openDialog} 
          onClose={() => setOpenDialog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { 
              bgcolor: '#151821',
              background: 'linear-gradient(135deg, rgba(21,24,33,0.98) 0%, rgba(10,13,20,0.98) 100%)',
              border: '1px solid rgba(255,155,191,0.3)',
              borderRadius: 3
            }
          }}
        >
          <DialogTitle sx={{ 
            color: 'white', 
            fontWeight: 'bold',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            pb: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h5">
                {editingSlot ? getSlotInfo(editingSlot).icon : '➕'}
              </Typography>
              <Typography variant="h6">
                {editingSlot ? `Edit: ${getSlotInfo(editingSlot).name}` : 'Add New Ad Slot'}
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#FF9BBF',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#FF9BBF',
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ color: 'white', fontWeight: 600 }}>
                    Enabled
                  </Typography>
                }
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                label="AdMob Ad Unit ID"
                value={formData.admob_id}
                onChange={(e) => setFormData({ ...formData, admob_id: e.target.value })}
                placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
                sx={{ mb: 2 }}
                InputLabelProps={{ style: { color: '#fff' } }}
                InputProps={{
                  sx: {
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.3)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#FF9BBF',
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                label="AdX Ad Unit ID (Optional)"
                value={formData.adx_id}
                onChange={(e) => setFormData({ ...formData, adx_id: e.target.value })}
                placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
                sx={{ mb: 2 }}
                InputLabelProps={{ style: { color: '#fff' } }}
                InputProps={{
                  sx: {
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.3)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#FF9BBF',
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                label="Facebook Ad Unit ID (Optional)"
                value={formData.facebook_id}
                onChange={(e) => setFormData({ ...formData, facebook_id: e.target.value })}
                placeholder="IMG_16_9_APP_INSTALL#XXXXXXXXXX"
                InputLabelProps={{ style: { color: '#fff' } }}
                InputProps={{
                  sx: {
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.3)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#FF9BBF',
                    },
                  },
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Button 
              onClick={() => setOpenDialog(false)}
              sx={{ 
                color: 'rgba(255,255,255,0.7)',
                '&:hover': { color: 'white' }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={!editingSlot}
              sx={{ 
                bgcolor: '#FF9BBF', 
                fontWeight: 600,
                '&:hover': { bgcolor: '#FF6BA3' },
                '&:disabled': { bgcolor: 'rgba(255,155,191,0.3)' }
              }}
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })} 
            severity={snackbar.severity}
            sx={{ 
              width: '100%',
              bgcolor: snackbar.severity === 'success' ? 'rgba(76,175,80,0.9)' : 'rgba(255,82,82,0.9)',
              color: 'white',
              fontWeight: 600
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}

export default App;
