import { initializeApp } from 'firebase/app';

// ⚠️ IMPORTANT: Replace ALL placeholder values with your real Firebase config!
// 
// How to get your config:
// 1. Go to Firebase Console → Project Settings → Your apps
// 2. Copy the config values from your web app
// 3. For databaseURL: Go to Realtime Database → Copy the URL shown at the top
//    Format: https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com/
//
// See FIREBASE_SETUP_INSTRUCTIONS.md for detailed steps

const firebaseConfig = {
  apiKey: "AIzaSyCZsldHLZXLBFa_64o7AlF4E_354Kkj1P4",
  authDomain: "solanagroup-5c99d.firebaseapp.com",
  databaseURL: "https://solanagroup-5c99d-default-rtdb.firebaseio.com",
  projectId: "solanagroup-5c99d",
  storageBucket: "solanagroup-5c99d.firebasestorage.app",
  messagingSenderId: "609443641302",
  appId: "1:609443641302:web:3b9fced8df89cb53db1677",
  measurementId: "G-H2ZWHE39D7"
};
// Validate that config is not using placeholders
const hasPlaceholders = 
  firebaseConfig.apiKey.includes('YOUR_') ||
  firebaseConfig.projectId.includes('YOUR_') ||
  firebaseConfig.databaseURL.includes('YOUR_');

if (hasPlaceholders && process.env.NODE_ENV !== 'test') {
  console.error('❌ ERROR: Firebase configuration contains placeholders!');
  console.error('Please update admin-panel/src/firebase.js with your real Firebase config.');
  console.error('See FIREBASE_SETUP_INSTRUCTIONS.md for help.');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Note: Don't initialize database here to avoid circular dependencies
// Use getDatabase(app) in components instead

export default app;

