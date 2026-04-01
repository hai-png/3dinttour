# 🚀 Quick Start Guide - Availability Manager

## What You Have Now

A complete availability management system integrated into your 3D Tour app with:
- ✅ Firebase Realtime Database integration
- ✅ User authentication (email/password)
- ✅ Realtime status updates across all devices
- ✅ Offline support with auto-sync
- ✅ Works on web, mobile (PWA), and desktop

## 📋 3-Step Setup

### Step 1: Firebase Console Setup (5 minutes)

1. **Open Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `availability-fe35f`
3. **Enable Authentication**:
   - Go to **Authentication** → **Sign-in method**
   - Enable **Email/Password**
   - Click **Save**

4. **Create Admin Users**:
   - Go to **Authentication** → **Users**
   - Click **Add user**
   - Email: `admin@temerproperties.com`
   - Password: (create a secure password)
   - Repeat for other agents

5. **Set Database Rules**:
   - Go to **Realtime Database** → **Rules**
   - Paste this:
   ```json
   {
     "rules": {
       "availability": {
         ".read": true,
         ".write": "auth != null"
       }
     }
   }
   ```
   - Click **Publish**

### Step 2: Add Initial Data (2 minutes)

**Option A - Use Firebase Console (Easiest)**:

1. Go to **Realtime Database** → **Data**
2. Click the three dots (⋮) next to `availability-fe35f`
3. Select **Import JSON**
4. Create a file `sample-data.json` with:
```json
{
  "availability": {
    "unit-101": {
      "name": "Unit 101 - 2BHK",
      "status": "available",
      "notes": "Corner unit with city view",
      "updatedAt": 1712000000000,
      "updatedBy": "system"
    },
    "unit-102": {
      "name": "Unit 102 - 3BHK",
      "status": "reserved",
      "notes": "Reserved until May 2024",
      "updatedAt": 1712000000000,
      "updatedBy": "system"
    },
    "unit-201": {
      "name": "Unit 201 - Penthouse",
      "status": "available",
      "notes": "Top floor with terrace",
      "updatedAt": 1712000000000,
      "updatedBy": "system"
    }
  }
}
```
5. Import the file

**Option B - Use Initialization Script**:

```bash
# Install Firebase Admin SDK
npm install firebase-admin

# Download service account key from Firebase Console
# (Project Settings → Service Accounts → Generate New Private Key)
# Save as: serviceAccountKey.json

# Run initialization
node init-availability.js
```

### Step 3: Test the System (1 minute)

1. **Open your app**: `index.html` in browser
2. **Click Login button** (👤 Login) in header
3. **Enter credentials**:
   - Email: `admin@temerproperties.com`
   - Password: (the one you created)
4. **Click Admin button** (🔐 Admin) that appears
5. **Update a unit**:
   - Change status dropdown
   - Add notes
   - Click 💾 Save
6. **Open another browser tab** - see realtime update!

## 🎯 How to Use

### For Admins/Agents

1. **Login**: Click 👤 Login → Enter credentials
2. **Open Panel**: Click 🔐 Admin button
3. **Update Availability**:
   - Find your unit
   - Select status (Available/Reserved/Sold/Unavailable)
   - Add optional notes
   - Click 💾 Save
4. **Logout**: Click 🚪 Logout when done

### For Regular Users

- View availability status in real-time
- Status badges update automatically
- No login required for viewing

## 📱 Deployment

### Web (Firebase Hosting)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Deploy
firebase deploy --only hosting
```

### PWA (Mobile/Desktop)

Your app is already PWA-ready:
1. Open in Chrome/Safari
2. Click "Add to Home Screen"
3. Works offline with cached data

### Desktop (Electron)

Your existing Electron setup works automatically:
```bash
cd electron
npm install
npm start
```

## 🔧 Configuration

### Change Admin Emails

Edit `availability-manager.js`:
```javascript
config: {
  adminEmails: [
    'admin@temerproperties.com',
    'your-email@temerproperties.com'
  ]
}
```

### Customize Status Options

Edit `availability-manager.js`:
```javascript
statusColors: {
  available: '#22c55e',  // Green
  reserved: '#f59e0b',   // Yellow
  sold: '#ef4444',       // Red
  unavailable: '#8888a0' // Gray
}
```

## 🎨 UI Overview

### Connection Status (Top Right)
- 🟢 **Online** - Connected to Firebase
- 🟡 **Offline** - Working offline

### Admin Panel (Right Side)
- Shows all units with status
- Color-coded badges
- Real-time updates

### Login Modal
- Secure Firebase authentication
- Email/password login

## 🐛 Troubleshooting

**"Login failed"**
- Check email/password in Firebase Console
- Ensure Authentication is enabled

**"Can't save changes"**
- Check database rules allow writes
- Verify you're logged in as admin

**"Not syncing"**
- Check internet connection
- Wait a few seconds for Firebase to connect
- Check browser console for errors

## 📊 Firebase Database Structure

```
availability-fe35f-default-rtdb.firebaseio.com/
└── availability/
    ├── unit-101/
    │   ├── name: "Unit 101"
    │   ├── status: "available"
    │   ├── notes: "..."
    │   ├── updatedAt: 1234567890
    │   └── updatedBy: "admin@email.com"
    └── unit-102/
        └── ...
```

## 🎉 You're Done!

Your availability management system is ready to use. Admins can now:
- ✅ Login securely
- ✅ Update unit availability
- ✅ Add notes for reservations
- ✅ See changes sync in realtime
- ✅ Work offline with auto-sync

## 📚 Additional Resources

- **Full Documentation**: `AVAILABILITY-MANAGER.md`
- **Firebase Console**: https://console.firebase.google.com/
- **Firebase Docs**: https://firebase.google.com/docs

---

**Need Help?**
1. Check browser console (F12) for errors
2. Verify Firebase setup in console
3. Review `AVAILABILITY-MANAGER.md` for detailed docs
