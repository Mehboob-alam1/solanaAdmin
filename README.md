# BTC Mining - Admin Panel

A simple React admin panel for managing ads configuration in Firebase Realtime Database.

## Features

- ✅ Enable/disable all ads globally
- ✅ View all ad slots (Banner, Interstitial, Rewarded, Native)
- ✅ Edit ad unit IDs (AdMob, AdX, Facebook)
- ✅ Add new ad slots
- ✅ Delete ad slots
- ✅ Real-time updates from Realtime Database
- ✅ Beautiful UI matching app theme (Blush Pink)

## Setup Instructions

### 1. Install Dependencies

```bash
cd admin-panel
npm install
```

### 2. Configure Firebase

1. Open `src/firebase.js`
2. Replace the Firebase config with your project's config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com/"
};
```

**Important**: Make sure to add the `databaseURL` field! You can find it in:
- Firebase Console → Realtime Database → Data tab
- The URL is shown at the top (e.g., `https://your-project-default-rtdb.firebaseio.com/`)

**How to get Firebase config:**
- Go to [Firebase Console](https://console.firebase.google.com/)
- Select your project
- Click the gear icon ⚙️ → Project Settings
- Scroll down to "Your apps"
- Copy the config values

### 3. Start the Development Server

```bash
npm start
```

The app will open at `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
```

The build folder will contain the production-ready files.

## Usage

### Global Ads Control

- Toggle the switch at the top to enable/disable all ads across the app
- This updates the `global` document in Firestore

### Managing Ad Slots

1. **View Ad Slots**: All ad slots are displayed in cards showing:
   - Slot name and type (Banner, Interstitial, etc.)
   - Location in the app
   - Current status (Active/Inactive)
   - AdMob ID (if set)

2. **Edit Ad Slot**:
   - Click the "Edit" button on any card
   - Update the ad unit IDs (AdMob, AdX, Facebook)
   - Toggle enabled/disabled
   - Click "Save"

3. **Delete Ad Slot**:
   - Click the delete icon (trash) on any card
   - Confirm deletion
   - The slot will be removed from Firestore

4. **Add New Slot**:
   - Click "Add New Slot" button
   - Enter slot details
   - Save

### Ad Slot Types

- **Banner**: Displayed at the bottom of screens
- **Interstitial**: Full-screen ads shown between screens
- **Rewarded**: Video ads that grant rewards
- **Native**: Customizable native ads

## Realtime Database Structure

The admin panel manages the `ads_config` path in Realtime Database:

```
ads_config/
  ├── global/          (Global ads enabled/disabled)
  │   └── ads_enabled: true
  ├── priority/       (Network priority order)
  │   └── order: ["admob", "adx", "facebook"]
  ├── banner_home/     (Home screen banner)
  │   ├── enabled: true
  │   ├── admob_id: "..."
  │   ├── adx_id: "..."
  │   └── facebook_id: "..."
  └── ... (other ad slots with same structure)
```

Each ad slot node contains:
```json
{
  "enabled": true,
  "admob_id": "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX",
  "adx_id": "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX",
  "facebook_id": "IMG_16_9_APP_INSTALL#XXXXXXXXXX"
}
```

## Security Note

⚠️ **Important**: This admin panel has no authentication. For production use:

1. Add Firebase Authentication
2. Restrict Firestore rules to authenticated admin users only
3. Deploy to a secure server or use Firebase Hosting

## Troubleshooting

### "Firebase: Error (auth/unauthorized)" or "permission-denied"

- Check your Firebase config in `src/firebase.js`
- Make sure `databaseURL` is included in the config
- Verify Realtime Database security rules allow read/write access
- Check that Realtime Database is enabled in Firebase Console

### "Error loading ad slots" or "client is offline"

- Ensure Realtime Database is enabled in Firebase Console
- Check that `databaseURL` is correctly set in `src/firebase.js`
- Verify your internet connection
- Check Realtime Database security rules
- Ensure the `ads_config` path exists in Realtime Database (admin panel will create it automatically)

### Changes not reflecting in app

- The app reads from Firestore in real-time
- Changes should appear immediately
- If not, check Firestore rules and network connection

## Support

For issues or questions, check:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Material-UI Documentation](https://mui.com/)

