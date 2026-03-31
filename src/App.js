import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Switch,
  FormControlLabel,
  Button,
  TextField,
  Grid,
  Alert,
  Snackbar,
  LinearProgress,
  Tooltip,
  Fade,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Launch as LaunchIcon,
  Facebook as FacebookIcon,
  ExpandMore as ExpandMoreIcon,
  Logout as LogoutIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { ref, get, set, getDatabase } from 'firebase/database';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import app from './firebase';
import { initializeFirestoreStructure, checkFirestoreStructure } from './utils/firestoreInit';
import {
  normalizeWebsiteRedirectFromDb,
  validateWebsiteRedirectForm,
  buildWebsiteRedirectPayload,
} from './utils/websiteRedirect';
import { AD_SLOTS } from './constants/adConfig';
import LoginScreen from './LoginScreen';
import './App.css';

function emptySlot() {
  return { enabled: false, admob_id: '', adx_id: '', facebook_id: '' };
}

function parsePriorityInput(str) {
  return str
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function mapAuthError(err) {
  const code = err?.code || '';
  if (code === 'auth/invalid-email') return 'Email non valida.';
  if (code === 'auth/user-disabled') return 'Account disabilitato.';
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Credenziali non valide.';
  }
  if (code === 'auth/too-many-requests') return 'Troppi tentativi. Riprova più tardi.';
  return err?.message || 'Accesso non riuscito.';
}

function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [adsEnabled, setAdsEnabled] = useState(true);
  const [priorityOrderStr, setPriorityOrderStr] = useState('admob, adx, facebook');
  const [websiteForm, setWebsiteForm] = useState(() => normalizeWebsiteRedirectFromDb(null));
  const [websiteFieldErrors, setWebsiteFieldErrors] = useState({});
  const [facebookMeta, setFacebookMeta] = useState({ app_id: '', client_token: '' });
  const [adSlots, setAdSlots] = useState({});

  const [loading, setLoading] = useState(false);
  const [initRunning, setInitRunning] = useState(false);
  const [bootLoading, setBootLoading] = useState(false);
  const [structureMissing, setStructureMissing] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const database = getDatabase(app);

      const globalSnap = await get(ref(database, 'ads_config/global'));
      setAdsEnabled(globalSnap.exists() ? globalSnap.val()?.ads_enabled !== false : true);

      const prioritySnap = await get(ref(database, 'ads_config/priority'));
      if (prioritySnap.exists()) {
        const o = prioritySnap.val()?.order;
        setPriorityOrderStr(Array.isArray(o) && o.length ? o.join(', ') : 'admob, adx, facebook');
      } else {
        setPriorityOrderStr('admob, adx, facebook');
      }

      const websiteSnap = await get(ref(database, 'app_config/website_redirect'));
      setWebsiteForm(normalizeWebsiteRedirectFromDb(websiteSnap.exists() ? websiteSnap.val() : null));
      setWebsiteFieldErrors({});

      const metaSnap = await get(ref(database, 'app_config/meta'));
      if (metaSnap.exists()) {
        const d = metaSnap.val();
        setFacebookMeta({
          app_id: d?.app_id || '',
          client_token: d?.client_token || '',
        });
      } else {
        setFacebookMeta({ app_id: '', client_token: '' });
      }

      const slots = {};
      for (const slot of AD_SLOTS) {
        const slotSnap = await get(ref(database, `ads_config/${slot.id}`));
        if (slotSnap.exists()) {
          const v = slotSnap.val();
          slots[slot.id] = {
            enabled: !!v?.enabled,
            admob_id: v?.admob_id ?? '',
            adx_id: v?.adx_id ?? '',
            facebook_id: v?.facebook_id ?? '',
          };
        } else {
          slots[slot.id] = emptySlot();
        }
      }
      setAdSlots(slots);
    } catch (error) {
      console.error('Error loading data:', error);
      showSnackbar(`Errore nel caricamento: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    const auth = getAuth(app);
    const database = getDatabase(app);
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setLoginError('');
      if (!user) {
        setIsAdmin(false);
        setAuthChecked(true);
        return;
      }
      try {
        const snap = await get(ref(database, `_admin_allowlist/${user.uid}`));
        setIsAdmin(snap.val() === true);
      } catch (e) {
        console.error(e);
        setIsAdmin(false);
      }
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authChecked || !firebaseUser || !isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        setBootLoading(true);
        const exists = await checkFirestoreStructure();
        if (!cancelled) setStructureMissing(!exists);
        if (!cancelled && !exists) {
          showSnackbar(
            'Struttura Realtime Database incompleta: premi Init per creare i nodi predefiniti (solo admin).',
            'warning'
          );
        }
        await loadData();
      } catch (e) {
        console.error(e);
        if (!cancelled) showSnackbar(e.message || 'Errore avvio', 'error');
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authChecked, firebaseUser, isAdmin, loadData, showSnackbar]);

  const handleSignIn = async (email, password) => {
    setLoginLoading(true);
    setLoginError('');
    try {
      await signInWithEmailAndPassword(getAuth(app), email, password);
    } catch (e) {
      setLoginError(mapAuthError(e));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(getAuth(app));
    } catch (e) {
      showSnackbar(e.message, 'error');
    }
  };

  const handleGlobalToggle = async (event) => {
    const newValue = event.target.checked;
    try {
      const database = getDatabase(app);
      await set(ref(database, 'ads_config/global'), { ads_enabled: newValue });
      setAdsEnabled(newValue);
      showSnackbar(newValue ? 'Annunci abilitati globalmente' : 'Annunci disabilitati globalmente', 'success');
    } catch (error) {
      showSnackbar(`Errore: ${error.message}`, 'error');
    }
  };

  const handleSavePriority = async () => {
    const order = parsePriorityInput(priorityOrderStr);
    if (!order.length) {
      showSnackbar('Inserisci almeno una rete nell’ordine (es. admob, adx, facebook).', 'warning');
      return;
    }
    try {
      const database = getDatabase(app);
      await set(ref(database, 'ads_config/priority'), { order });
      setPriorityOrderStr(order.join(', '));
      showSnackbar('Ordine reti salvato', 'success');
    } catch (error) {
      showSnackbar(`Errore: ${error.message}`, 'error');
    }
  };

  const handleSaveWebsiteRedirect = async () => {
    const errs = validateWebsiteRedirectForm(websiteForm);
    setWebsiteFieldErrors(errs);
    if (Object.keys(errs).length) {
      showSnackbar('Correggi gli errori nel modulo redirect.', 'warning');
      return;
    }
    try {
      const database = getDatabase(app);
      const payload = buildWebsiteRedirectPayload(websiteForm);
      await set(ref(database, 'app_config/website_redirect'), payload);
      setWebsiteForm(normalizeWebsiteRedirectFromDb(payload));
      setWebsiteFieldErrors({});
      showSnackbar('Website redirect salvato', 'success');
    } catch (error) {
      showSnackbar(`Errore: ${error.message}`, 'error');
    }
  };

  const handleSaveFacebookMeta = async () => {
    try {
      const database = getDatabase(app);
      const payload = {
        app_id: facebookMeta.app_id.trim(),
        client_token: facebookMeta.client_token.trim(),
      };
      await set(ref(database, 'app_config/meta'), payload);
      setFacebookMeta(payload);
      showSnackbar('Meta Facebook salvata', 'success');
    } catch (error) {
      showSnackbar(`Errore: ${error.message}`, 'error');
    }
  };

  const updateSlotField = (slotId, field, value) => {
    setAdSlots((prev) => ({
      ...prev,
      [slotId]: {
        ...(prev[slotId] || emptySlot()),
        [field]: value,
      },
    }));
  };

  const handleSaveSlot = async (slotId) => {
    const row = adSlots[slotId] || emptySlot();
    try {
      const database = getDatabase(app);
      const payload = {
        enabled: !!row.enabled,
        admob_id: String(row.admob_id || '').trim(),
        adx_id: String(row.adx_id || '').trim(),
        facebook_id: String(row.facebook_id || '').trim(),
      };
      await set(ref(database, `ads_config/${slotId}`), payload);
      setAdSlots((prev) => ({ ...prev, [slotId]: payload }));
      showSnackbar(`Slot ${slotId} salvato`, 'success');
    } catch (error) {
      showSnackbar(`Errore: ${error.message}`, 'error');
    }
  };

  const handleRefresh = async () => {
    await loadData();
    showSnackbar('Dati aggiornati', 'success');
  };

  const handleInitialize = async () => {
    try {
      setInitRunning(true);
      const result = await initializeFirestoreStructure(true);
      setStructureMissing(false);
      await loadData();
      showSnackbar(`Init completato. Creati/aggiornati: ${result.created + result.updated} nodi.`, 'success');
    } catch (error) {
      showSnackbar(`Errore Init: ${error.message}`, 'error');
    } finally {
      setInitRunning(false);
    }
  };

  const websiteRedirectPreview = useMemo(() => {
    const errs = validateWebsiteRedirectForm(websiteForm);
    if (Object.keys(errs).length) {
      return { _validation_errors: errs, _draft: websiteForm };
    }
    return buildWebsiteRedirectPayload(websiteForm);
  }, [websiteForm]);

  const jsonPreview = useMemo(() => {
    const order = parsePriorityInput(priorityOrderStr);
    const slots = {};
    AD_SLOTS.forEach((s) => {
      slots[s.id] = adSlots[s.id] || emptySlot();
    });
    return {
      app_config: {
        website_redirect: websiteRedirectPreview,
        meta: {
          app_id: facebookMeta.app_id.trim(),
          client_token: facebookMeta.client_token ? '***' : '',
        },
      },
      ads_config: {
        global: { ads_enabled: adsEnabled },
        priority: { order: order.length ? order : ['admob', 'adx', 'facebook'] },
        ...slots,
      },
    };
  }, [adsEnabled, priorityOrderStr, facebookMeta, adSlots, websiteRedirectPreview]);

  const getTypeColor = (type) => {
    switch (type) {
      case 'Banner':
        return '#FF9BBF';
      case 'Interstitial':
        return '#FFC857';
      case 'Rewarded':
        return '#4CAF50';
      case 'Native':
        return '#9C27B0';
      case 'AppOpen':
        return '#FF5722';
      default:
        return '#757575';
    }
  };

  if (!authChecked) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #05060A 0%, #0A0D14 50%, #05060A 100%)',
        }}
      >
        <CircularProgress sx={{ color: '#FF9BBF' }} />
      </Box>
    );
  }

  if (!firebaseUser) {
    return <LoginScreen onSignIn={handleSignIn} loading={loginLoading} error={loginError} />;
  }

  if (!isAdmin) {
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
          sx={{
            p: 4,
            maxWidth: 480,
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(21,24,33,0.95) 0%, rgba(10,13,20,0.95) 100%)',
            border: '1px solid rgba(255,82,82,0.35)',
          }}
        >
          <Typography variant="h6" sx={{ color: '#ff8a80', mb: 2, fontWeight: 700 }}>
            Accesso negato
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mb: 3 }}>
            L’account non è presente in <code style={{ color: '#FF9BBF' }}>_admin_allowlist/&lt;uid&gt;</code> nel
            Realtime Database. Chiedi a un owner di aggiungere il tuo UID con valore{' '}
            <code style={{ color: '#FF9BBF' }}>true</code>.
          </Typography>
          <Button variant="contained" onClick={handleSignOut} startIcon={<LogoutIcon />} sx={{ bgcolor: '#FF9BBF' }}>
            Esci
          </Button>
        </Paper>
      </Box>
    );
  }

  const paperSx = {
    p: 4,
    mb: 4,
    background: 'linear-gradient(135deg, rgba(21,24,33,0.95) 0%, rgba(10,13,20,0.95) 100%)',
    border: '1px solid rgba(255,155,191,0.2)',
    borderRadius: 3,
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    backdropFilter: 'blur(10px)',
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05060A 0%, #0A0D14 50%, #05060A 100%)',
        pb: 4,
      }}
    >
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Fade in timeout={600}>
          <Box sx={{ mb: 4 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Box>
                <Typography
                  variant="h3"
                  component="h1"
                  sx={{
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #FF9BBF 0%, #FFC857 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 1,
                  }}
                >
                  Solana Admin
                </Typography>
                <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>
                  Realtime Database — app_config & ads_config
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', display: 'block', mt: 0.5 }}>
                  {firebaseUser.email}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<LogoutIcon />}
                  onClick={handleSignOut}
                  sx={{
                    borderColor: 'rgba(255,155,191,0.5)',
                    color: '#FF9BBF',
                    '&:hover': { borderColor: '#FF9BBF', bgcolor: 'rgba(255,155,191,0.08)' },
                  }}
                >
                  Esci
                </Button>
                <Tooltip title="Crea/aggiorna nodi predefiniti (richiede permessi admin)">
                  <Button
                    variant="outlined"
                    startIcon={<SettingsIcon />}
                    onClick={handleInitialize}
                    disabled={initRunning || bootLoading}
                    sx={{
                      borderColor: 'rgba(255,155,191,0.5)',
                      color: '#FF9BBF',
                      '&:hover': { borderColor: '#FF9BBF', bgcolor: 'rgba(255,155,191,0.08)' },
                    }}
                  >
                    Init
                  </Button>
                </Tooltip>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  disabled={loading || bootLoading}
                  sx={{
                    borderColor: 'rgba(255,155,191,0.5)',
                    color: '#FF9BBF',
                    '&:hover': { borderColor: '#FF9BBF', bgcolor: 'rgba(255,155,191,0.08)' },
                  }}
                >
                  Aggiorna
                </Button>
              </Box>
            </Box>
            {structureMissing ? (
              <Alert severity="warning" sx={{ mb: 2, bgcolor: 'rgba(255,193,7,0.12)', color: '#ffe082' }}>
                Struttura assente o incompleta: usa <strong>Init</strong> dopo aver pubblicato le regole di sicurezza.
              </Alert>
            ) : null}
            {(loading || bootLoading) && (
              <LinearProgress
                sx={{ bgcolor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#FF9BBF' } }}
              />
            )}
          </Box>
        </Fade>

        <Paper sx={paperSx}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
                Annunci globali
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                ads_config/global — ads_enabled
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={adsEnabled}
                  onChange={handleGlobalToggle}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#FF9BBF' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#FF9BBF' },
                  }}
                />
              }
              label={
                <Typography sx={{ color: 'white', fontWeight: 600 }}>
                  {adsEnabled ? 'Abilitati' : 'Disabilitati'}
                </Typography>
              }
            />
          </Box>
        </Paper>

        <Paper sx={paperSx}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white', mb: 1 }}>
            Ordine reti pubblicitarie
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
            ads_config/priority — order (array di stringhe, separate da virgola o spazio)
          </Typography>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="order"
                value={priorityOrderStr}
                onChange={(e) => setPriorityOrderStr(e.target.value)}
                placeholder="admob, adx, facebook"
                InputLabelProps={{ style: { color: '#fff' } }}
                InputProps={{
                  sx: {
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FF9BBF' },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSavePriority}
                fullWidth
                sx={{ mt: { xs: 0, md: 1 }, bgcolor: '#FF9BBF', '&:hover': { bgcolor: '#FF6BA3' } }}
              >
                Salva ordine
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={paperSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <LaunchIcon sx={{ color: '#FF9BBF' }} />
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
              Website redirect
            </Typography>
            {websiteForm.enabled ? (
              <CheckCircleIcon sx={{ color: '#4CAF50' }} />
            ) : (
              <WarningIcon sx={{ color: '#ff5252' }} />
            )}
          </Box>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
            app_config/website_redirect — validazione URL, mode, click_rate (0–100), click_frequency (≥1)
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="url"
                value={websiteForm.url}
                onChange={(e) => setWebsiteForm((f) => ({ ...f, url: e.target.value }))}
                error={!!websiteFieldErrors.url}
                helperText={websiteFieldErrors.url || 'URL completo o dominio (l’app può aggiungere https://)'}
                InputLabelProps={{ style: { color: '#fff' } }}
                InputProps={{
                  sx: {
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FF9BBF' },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={websiteForm.enabled}
                    onChange={(e) => setWebsiteForm((f) => ({ ...f, enabled: e.target.checked }))}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#FF9BBF' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#FF9BBF' },
                    }}
                  />
                }
                label={<Typography sx={{ color: 'white', fontWeight: 600 }}>enabled</Typography>}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={websiteForm.every_click}
                    onChange={(e) => setWebsiteForm((f) => ({ ...f, every_click: e.target.checked }))}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#FF9BBF' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#FF9BBF' },
                    }}
                  />
                }
                label={<Typography sx={{ color: 'white' }}>every_click</Typography>}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.8)' }}>mode</InputLabel>
                <Select
                  label="mode"
                  value={websiteForm.mode}
                  onChange={(e) => setWebsiteForm((f) => ({ ...f, mode: e.target.value }))}
                  sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FF9BBF' },
                  }}
                >
                  <MenuItem value="always">always</MenuItem>
                  <MenuItem value="random">random</MenuItem>
                  <MenuItem value="counter">counter</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="click_rate (0–100)"
                type="number"
                disabled={websiteForm.every_click || websiteForm.mode !== 'random'}
                value={websiteForm.click_rate === '' ? '' : websiteForm.click_rate}
                onChange={(e) =>
                  setWebsiteForm((f) => ({ ...f, click_rate: e.target.value === '' ? '' : e.target.value }))
                }
                error={!!websiteFieldErrors.click_rate}
                helperText={websiteFieldErrors.click_rate || 'Solo con mode random e every_click false'}
                InputLabelProps={{ style: { color: '#fff' } }}
                InputProps={{
                  sx: {
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="click_frequency (≥1)"
                type="number"
                disabled={websiteForm.every_click || websiteForm.mode !== 'counter'}
                value={websiteForm.click_frequency === '' ? '' : websiteForm.click_frequency}
                onChange={(e) =>
                  setWebsiteForm((f) => ({ ...f, click_frequency: e.target.value === '' ? '' : e.target.value }))
                }
                error={!!websiteFieldErrors.click_frequency}
                helperText={websiteFieldErrors.click_frequency || 'Solo con mode counter e every_click false'}
                InputLabelProps={{ style: { color: '#fff' } }}
                InputProps={{
                  sx: {
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveWebsiteRedirect}
                sx={{ bgcolor: '#FF9BBF', '&:hover': { bgcolor: '#FF6BA3' } }}
              >
                Salva website redirect
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={paperSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FacebookIcon sx={{ color: '#FF9BBF' }} />
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
              Facebook Meta
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
            app_config/meta
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                label="app_id"
                value={facebookMeta.app_id}
                onChange={(e) => setFacebookMeta((m) => ({ ...m, app_id: e.target.value }))}
                InputLabelProps={{ style: { color: '#fff' } }}
                InputProps={{
                  sx: {
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                label="client_token"
                type="password"
                value={facebookMeta.client_token}
                onChange={(e) => setFacebookMeta((m) => ({ ...m, client_token: e.target.value }))}
                InputLabelProps={{ style: { color: '#fff' } }}
                InputProps={{
                  sx: {
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveFacebookMeta}
                fullWidth
                sx={{ mt: { xs: 0, md: 1 }, bgcolor: '#FF9BBF', '&:hover': { bgcolor: '#FF6BA3' } }}
              >
                Salva
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={paperSx}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white', mb: 2 }}>
            Slot pubblicitari
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2 }}>
            ads_config/&lt;slot&gt; — una riga per slot; salva la riga per scrivere su Firebase.
          </Typography>
          <TableContainer
            sx={{
              maxHeight: 560,
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 2,
              bgcolor: 'rgba(0,0,0,0.2)',
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#FF9BBF', fontWeight: 700, bgcolor: '#12151c' }}>Slot</TableCell>
                  <TableCell sx={{ color: '#FF9BBF', fontWeight: 700, bgcolor: '#12151c' }}>Tipo</TableCell>
                  <TableCell sx={{ color: '#FF9BBF', fontWeight: 700, bgcolor: '#12151c' }}>Abilitato</TableCell>
                  <TableCell sx={{ color: '#FF9BBF', fontWeight: 700, bgcolor: '#12151c' }}>admob_id</TableCell>
                  <TableCell sx={{ color: '#FF9BBF', fontWeight: 700, bgcolor: '#12151c' }}>adx_id</TableCell>
                  <TableCell sx={{ color: '#FF9BBF', fontWeight: 700, bgcolor: '#12151c' }}>facebook_id</TableCell>
                  <TableCell align="right" sx={{ color: '#FF9BBF', fontWeight: 700, bgcolor: '#12151c' }}>
                    Salva
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {AD_SLOTS.map((slot) => {
                  const row = adSlots[slot.id] || emptySlot();
                  const tc = {
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.08)',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                  };
                  return (
                    <TableRow key={slot.id} hover>
                      <TableCell sx={{ color: 'white', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {slot.icon} {slot.id}
                      </TableCell>
                      <TableCell>
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: getTypeColor(slot.type),
                            color: 'white',
                            fontWeight: 700,
                          }}
                        >
                          {slot.type}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Switch
                          size="small"
                          checked={!!row.enabled}
                          onChange={(e) => updateSlotField(slot.id, 'enabled', e.target.checked)}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': { color: '#FF9BBF' },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#FF9BBF',
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 200 }}>
                        <TextField
                          size="small"
                          fullWidth
                          value={row.admob_id}
                          onChange={(e) => updateSlotField(slot.id, 'admob_id', e.target.value)}
                          InputProps={{ sx: tc }}
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 200 }}>
                        <TextField
                          size="small"
                          fullWidth
                          value={row.adx_id}
                          onChange={(e) => updateSlotField(slot.id, 'adx_id', e.target.value)}
                          InputProps={{ sx: tc }}
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 200 }}>
                        <TextField
                          size="small"
                          fullWidth
                          value={row.facebook_id}
                          onChange={(e) => updateSlotField(slot.id, 'facebook_id', e.target.value)}
                          InputProps={{ sx: tc }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Salva questo slot">
                          <IconButton
                            size="small"
                            onClick={() => handleSaveSlot(slot.id)}
                            sx={{ color: '#FF9BBF' }}
                          >
                            <SaveIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Accordion
          sx={{
            mb: 4,
            bgcolor: 'rgba(21,24,33,0.9)',
            color: 'white',
            border: '1px solid rgba(255,155,191,0.2)',
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#FF9BBF' }} />}>
            <CodeIcon sx={{ color: '#FF9BBF', mr: 1 }} />
            <Typography fontWeight={700}>Anteprima JSON (stato attuale in UI)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', display: 'block', mb: 1 }}>
              Bozza ricostruita dai campi sopra (meta token mascherato). Non sostituisce la lettura dal server finché non
              salvi.
            </Typography>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 2,
                borderRadius: 2,
                bgcolor: 'rgba(0,0,0,0.45)',
                overflow: 'auto',
                fontSize: 12,
                maxHeight: 400,
                color: '#e0e0e0',
              }}
            >
              {JSON.stringify(jsonPreview, null, 2)}
            </Box>
          </AccordionDetails>
        </Accordion>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            severity={snackbar.severity}
            sx={{
              width: '100%',
              fontWeight: 600,
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
