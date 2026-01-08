import { ref, set, get, getDatabase } from 'firebase/database';
import app from '../firebase';

// Default ad slot configurations matching FIRESTORE_AD_SETUP.md
const DEFAULT_AD_SLOTS = [
  { id: 'app_open', name: 'App Open Ad', type: 'AppOpen', location: 'App Launch' },
  { id: 'banner_home', name: 'Home Banner', type: 'Banner', location: 'Home Screen' },
  { id: 'banner_wallet', name: 'Wallet Banner', type: 'Banner', location: 'Wallet Screen' },
  { id: 'banner_leaderboard', name: 'Leaderboard Banner', type: 'Banner', location: 'Leaderboard Screen' },
  { id: 'banner_challenges', name: 'Challenges Banner', type: 'Banner', location: 'Challenges Screen' },
  { id: 'banner_referrals', name: 'Referrals Banner', type: 'Banner', location: 'Referrals Screen' },
  { id: 'banner_profile', name: 'Profile Banner', type: 'Banner', location: 'Profile Screen' },
  { id: 'banner_auth', name: 'Auth Banner', type: 'Banner', location: 'Auth Screen' },
  { id: 'banner_onboarding', name: 'Onboarding Banner', type: 'Banner', location: 'Onboarding Screens' },
  { id: 'interstitial_login', name: 'Login Interstitial', type: 'Interstitial', location: 'After Login' },
  { id: 'interstitial_screen_transition', name: 'Screen Transition', type: 'Interstitial', location: 'Between Screens' },
  { id: 'interstitial_challenge_complete', name: 'Challenge Complete', type: 'Interstitial', location: 'After Challenge' },
  { id: 'rewarded_challenge', name: 'Challenge Rewarded', type: 'Rewarded', location: 'Challenge Rewards' },
  { id: 'rewarded_booster', name: 'Booster Rewarded', type: 'Rewarded', location: 'Power-up Boosters' },
  { id: 'native_onboarding', name: 'Onboarding Native', type: 'Native', location: 'Onboarding Pages' },
  { id: 'native_auth', name: 'Auth Native', type: 'Native', location: 'Auth Screen' },
];

// Test ad unit IDs (Google's test IDs) - matching FIRESTORE_AD_SETUP.md
const TEST_AD_UNIT_IDS = {
  Banner: 'ca-app-pub-3940256099942544/6300978111',
  Interstitial: 'ca-app-pub-3940256099942544/1033173712',
  Rewarded: 'ca-app-pub-3940256099942544/5224354917',
  Native: 'ca-app-pub-3940256099942544/2247696110',
  AppOpen: 'ca-app-pub-3940256099942544/3419835294',
};

// Facebook placeholder IDs (from documentation)
const FACEBOOK_PLACEHOLDER_IDS = {
  Banner: 'IMG_16_9_APP_INSTALL#123456789',
  Interstitial: 'VID_HD_16_9_46S_APP_INSTALL#123456789',
  Rewarded: 'VID_HD_16_9_46S_APP_INSTALL#123456789',
  Native: 'IMG_16_9_APP_INSTALL#123456789',
  AppOpen: '', // Facebook doesn't support App Open ads
};

/**
 * Get database instance
 */
const getDb = () => {
  return getDatabase(app);
};

/**
 * Check if Firebase is properly configured and connected
 */
export const checkFirebaseConnection = async () => {
  try {
    const database = getDb();
    // Try to access Realtime Database
    const testRef = ref(database, 'ads_config/_test_connection');
    await get(testRef);
    return true;
  } catch (error) {
    console.error('Firebase connection check failed:', error);
    
    // Check for common configuration errors
    const errorMessage = error.message || error.toString();
    
    if (errorMessage.includes('YOUR_PROJECT_ID') || errorMessage.includes('YOUR_')) {
      throw new Error(
        'Firebase configuration error: Please update admin-panel/src/firebase.js with your real Firebase config values. ' +
        'See FIREBASE_SETUP_INSTRUCTIONS.md for help.'
      );
    }
    
    if (errorMessage.includes('permission-denied')) {
      throw new Error(
        'Firebase permission denied. Please check your Realtime Database rules. ' +
        'Make sure ads_config path has read/write access.'
      );
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('WebSocket')) {
      throw new Error(
        'Network/WebSocket error. Please check: ' +
        '1. Your internet connection, ' +
        '2. Firebase Realtime Database is enabled, ' +
        '3. databaseURL is correctly set in firebase.js'
      );
    }
    
    throw new Error(`Firebase connection failed: ${errorMessage}`);
  }
};

/**
 * Initialize Realtime Database with default ad configuration structure
 * Creates ALL documents according to FIRESTORE_AD_SETUP.md documentation
 * Structure: ads_config/{slot_id}/{field}
 */
export const initializeFirestoreStructure = async (forceCreate = false) => {
  try {
    console.log('🚀 Initializing Realtime Database structure...');

    // Check Firebase connection first
    try {
      await checkFirebaseConnection();
    } catch (error) {
      throw error;
    }

    let createdCount = 0;
    let updatedCount = 0;

    const database = getDb();

    // 1. Create/Update global config
    const globalRef = ref(database, 'ads_config/global');
    const globalSnap = await get(globalRef);
    if (!globalSnap.exists() || forceCreate) {
      await set(globalRef, {
        ads_enabled: true
      });
      console.log('✅ Created/Updated global config');
      createdCount++;
    } else {
      console.log('ℹ️ Global config already exists');
    }

    // 2. Create/Update priority config
    const priorityRef = ref(database, 'ads_config/priority');
    const prioritySnap = await get(priorityRef);
    if (!prioritySnap.exists() || forceCreate) {
      await set(priorityRef, {
        order: ['admob', 'adx', 'facebook']
      });
      console.log('✅ Created/Updated priority config');
      createdCount++;
    } else {
      console.log('ℹ️ Priority config already exists');
    }

    // 3. Create/Update website redirect config
    const websiteRedirectRef = ref(database, 'app_config/website_redirect');
    const websiteRedirectSnap = await get(websiteRedirectRef);
    if (!websiteRedirectSnap.exists() || forceCreate) {
      await set(websiteRedirectRef, {
        enabled: false,
        url: 'https://finance.easyranktools.com/'
      });
      console.log('✅ Created/Updated website redirect config');
      createdCount++;
    } else {
      console.log('ℹ️ Website redirect config already exists');
    }

    // 4. Create/Update Facebook meta config
    const facebookMetaRef = ref(database, 'app_config/meta');
    const facebookMetaSnap = await get(facebookMetaRef);
    if (!facebookMetaSnap.exists() || forceCreate) {
      await set(facebookMetaRef, {
        app_id: '',
        client_token: ''
      });
      console.log('✅ Created/Updated Facebook meta config');
      createdCount++;
    } else {
      console.log('ℹ️ Facebook meta config already exists');
    }

    // 5. Create/Update all ad slot configs
    for (const slot of DEFAULT_AD_SLOTS) {
      const slotRef = ref(database, `ads_config/${slot.id}`);
      const slotSnap = await get(slotRef);
      
      if (!slotSnap.exists() || forceCreate) {
        const testAdUnitId = TEST_AD_UNIT_IDS[slot.type] || TEST_AD_UNIT_IDS.Banner;
        const facebookId = FACEBOOK_PLACEHOLDER_IDS[slot.type] || FACEBOOK_PLACEHOLDER_IDS.Banner;
        
        // According to documentation, all slots should start with enabled: true
        await set(slotRef, {
          enabled: true, // Start enabled as per documentation
          admob_id: testAdUnitId,
          adx_id: testAdUnitId,
          facebook_id: facebookId
        });
        
        if (!slotSnap.exists()) {
          console.log(`✅ Created ${slot.id} config`);
          createdCount++;
        } else {
          console.log(`🔄 Updated ${slot.id} config`);
          updatedCount++;
        }
      } else {
        console.log(`ℹ️ ${slot.id} already exists`);
      }
    }

    console.log(`🎉 Realtime Database structure initialized! Created: ${createdCount}, Updated: ${updatedCount}`);
    return { created: createdCount, updated: updatedCount };
  } catch (error) {
    console.error('❌ Error initializing Realtime Database structure:', error);
    throw error;
  }
};

/**
 * Check if Realtime Database structure exists
 */
export const checkFirestoreStructure = async () => {
  try {
    const database = getDb();
    const globalRef = ref(database, 'ads_config/global');
    const globalSnap = await get(globalRef);
    
    // Also check if at least some ad slots exist
    const bannerHomeRef = ref(database, 'ads_config/banner_home');
    const bannerHomeSnap = await get(bannerHomeRef);
    
    return globalSnap.exists() && bannerHomeSnap.exists();
  } catch (error) {
    console.error('Error checking Realtime Database structure:', error);
    return false;
  }
};

/**
 * Get all ad slots configuration
 */
export const getAllAdSlots = () => {
  return DEFAULT_AD_SLOTS;
};
