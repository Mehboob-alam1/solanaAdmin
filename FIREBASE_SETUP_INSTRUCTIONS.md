# Firebase Realtime Database Setup Instructions

## ⚠️ IMPORTANT: Configure Firebase Before Using Admin Panel

The admin panel requires your Firebase Realtime Database configuration to work properly.

## Step 1: Get Your Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click the **gear icon** ⚙️ → **Project Settings**
4. Scroll down to **"Your apps"** section
5. If you don't have a web app, click **"Add app"** → **Web** (</> icon)
6. Copy the configuration values

## Step 2: Get Your Realtime Database URL

1. In Firebase Console, go to **Realtime Database**
2. If you haven't created it yet:
   - Click **"Create Database"**
   - Choose a location (e.g., `us-central1`)
   - Choose **"Start in test mode"** (for development)
   - Click **"Enable"**
3. Once created, you'll see the database URL at the top:
   - Format: `https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com/`
   - Example: `https://my-project-12345-default-rtdb.firebaseio.com/`

## Step 3: Update Admin Panel Configuration

1. Open `src/firebase.js`
2. Replace ALL placeholder values with your real Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...", // Your real API key
  authDomain: "my-project-12345.firebaseapp.com", // Your real auth domain
  projectId: "my-project-12345", // Your real project ID
  storageBucket: "my-project-12345.appspot.com", // Your real storage bucket
  messagingSenderId: "123456789012", // Your real messaging sender ID
  appId: "1:123456789012:web:abcdef123456", // Your real app ID
  databaseURL: "https://my-project-12345-default-rtdb.firebaseio.com/" // Your real database URL
};
```

## Step 4: Set Realtime Database Rules

The admin panel does **not** use Firebase Authentication. The bundled **`database.rules.json`** allows public read/write on `app_config` and `ads_config` so the web UI can work without login.

⚠️ **Security:** Anyone with your database URL and project config can change ads and app config. Use Firebase Hosting with access control, IP restrictions, or replace these rules with authenticated writes (e.g. custom claims + Admin SDK) for production.

1. Copy **`database.rules.json`** into Firebase Console → **Realtime Database** → **Rules**, **or** run:
   - `firebase deploy --only database` (requires `firebase.json` and Firebase CLI login)

Rule summary:

- **`app_config`** and **`ads_config`**: `.read` and `.write` = `true` (matches the no-auth admin panel).

## Step 5: Verify Connection

1. Start the admin panel: `npm start`
2. If the database is empty, click **Init** once to seed default nodes (rules must allow writes as above)

## Troubleshooting

### Error: "WebSocket connection failed"
- ✅ Check that `databaseURL` is correctly set in `firebase.js`
- ✅ Verify Realtime Database is enabled in Firebase Console
- ✅ Check that Realtime Database rules allow read/write access
- ✅ Make sure you're using the correct project ID

### Error: "permission-denied"
- ✅ Check Realtime Database security rules (`database.rules.json`) allow read/write on `app_config` and `ads_config`

### Error: "client is offline"
- ✅ Check your internet connection
- ✅ Verify Firebase project is active
- ✅ Check browser console for detailed error messages

## Example Configuration

Here's what a complete `firebase.js` should look like:

```javascript
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyC1234567890abcdefghijklmnopqrstuv",
  authDomain: "ethereum-mining-app.firebaseapp.com",
  projectId: "ethereum-mining-app",
  storageBucket: "ethereum-mining-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
  databaseURL: "https://ethereum-mining-app-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export default app;
```

## Need Help?

- Check Firebase Console → Realtime Database → Data tab to see if data is being created
- Check browser console (F12) for detailed error messages
- Verify all config values match your Firebase project settings

