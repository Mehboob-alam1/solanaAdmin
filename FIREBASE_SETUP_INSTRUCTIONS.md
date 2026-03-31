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

## Step 4: Enable Authentication (Email/Password)

1. Firebase Console → **Authentication** → **Sign-in method**
2. Enable **Email/Password**
3. Create a user for the admin panel (**Authentication** → **Users** → **Add user**)

## Step 5: Admin allowlist (first-time bootstrap)

Writes to `app_config/**` and `ads_config/**` are allowed only for UIDs listed under `_admin_allowlist` (see `database.rules.json` in this repo).

1. Copy the new user’s **UID** from **Authentication** → **Users**
2. Realtime Database → **Data** → add a node:
   - Path: `_admin_allowlist/<UID>`
   - Value: boolean `true`  
   (Only the Console or the Admin SDK can write here; clients cannot.)

## Step 6: Set Realtime Database Rules

1. Copy the contents of **`database.rules.json`** from this repository into Firebase Console → **Realtime Database** → **Rules**, **or** run:
   - `firebase deploy --only database` (requires `firebase.json` and Firebase CLI login)

Summary of the rules:

- **`app_config`** and **`ads_config`**: `.read` = `true` (the Flutter app can listen without auth; tighten if your app uses Firebase Auth and you want private config).
- **`.write`**: only if `auth.uid` is listed in `_admin_allowlist` with value `true`.
- **`_admin_allowlist/$uid`**: each user may **read only their own** entry (so the panel can verify admin status); **no client writes**.

## Step 7: Verify Connection

1. Start the admin panel: `npm start`
2. Sign in with the admin email/password
3. If the database is empty, click **Init** once to seed default nodes (requires admin write rules above)

## Troubleshooting

### Error: "WebSocket connection failed"
- ✅ Check that `databaseURL` is correctly set in `firebase.js`
- ✅ Verify Realtime Database is enabled in Firebase Console
- ✅ Check that Realtime Database rules allow read/write access
- ✅ Make sure you're using the correct project ID

### Error: "permission-denied"
- ✅ Check Realtime Database security rules (`database.rules.json`)
- ✅ Ensure `_admin_allowlist/<your_uid>` is `true` in the database
- ✅ You must be signed in to Firebase Auth in the browser before writing

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

