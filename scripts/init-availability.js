/**
 * Initialize Firebase Availability Data
 * 
 * This script helps you populate your Firebase Realtime Database
 * with initial availability data based on your existing tour-data.json
 * 
 * Usage:
 * 1. Install Firebase Admin SDK: npm install firebase-admin
 * 2. Download service account key from Firebase Console
 * 3. Run: node init-availability.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCtjYMbznVZ1-x2Yqu5wQ_zz9PU92UYxRE",
  authDomain: "availability-fe35f.firebaseapp.com",
  projectId: "availability-fe35f",
  storageBucket: "availability-fe35f.firebasestorage.app",
  messagingSenderId: "1031392756810",
  appId: "1:1031392756810:web:7c3dfdf4e40307589992b3",
  measurementId: "G-5QSYX7XDM2",
  databaseURL: "https://availability-fe35f-default-rtdb.firebaseio.com/"
};

// Path to your service account key (download from Firebase Console)
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');

// Path to tour data
const TOUR_DATA_PATH = path.join(__dirname, 'tour-data.json');

/**
 * Initialize availability data in Firebase
 */
async function initializeAvailability() {
  console.log('🚀 Initializing Firebase Availability Data...\n');

  // Check if service account key exists
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error('❌ Service account key not found!');
    console.error('\n📋 Setup Instructions:');
    console.error('1. Go to Firebase Console: https://console.firebase.google.com/');
    console.error('2. Select project: availability-fe35f');
    console.error('3. Go to Project Settings → Service Accounts');
    console.error('4. Click "Generate New Private Key"');
    console.error('5. Save the downloaded JSON as: serviceAccountKey.json');
    console.error('\nAlternatively, use the web interface to add data manually.');
    return;
  }

  // Initialize Firebase Admin
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: firebaseConfig.databaseURL
    });

    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    return;
  }

  // Load tour data
  let tourData;
  try {
    const tourDataContent = fs.readFileSync(TOUR_DATA_PATH, 'utf8');
    tourData = JSON.parse(tourDataContent);
    console.log('✅ Loaded tour data:', TOUR_DATA_PATH);
  } catch (error) {
    console.error('❌ Failed to load tour data:', error.message);
    console.log('\n⚠️  Continuing with manual unit creation...');
    tourData = { units: [] };
  }

  const db = admin.database();
  const availabilityRef = db.ref('availability');

  // Get existing units from tour data
  const units = tourData.units || [];
  
  if (units.length === 0) {
    console.log('\n⚠️  No units found in tour-data.json');
    console.log('\n💡 You can add units manually or update tour-data.json');
  } else {
    console.log(`\n📊 Found ${units.length} units in tour data`);
  }

  // Example: Create sample units if none exist
  const sampleUnits = [
    { id: 'unit-101', name: 'Unit 101 - 2BHK', type: 'Apartment' },
    { id: 'unit-102', name: 'Unit 102 - 3BHK', type: 'Apartment' },
    { id: 'unit-201', name: 'Unit 201 - Penthouse', type: 'Penthouse' },
    { id: 'unit-301', name: 'Unit 301 - Studio', type: 'Studio' },
    { id: 'unit-401', name: 'Unit 401 - 2BHK', type: 'Apartment' }
  ];

  const unitsToProcess = units.length > 0 ? units : sampleUnits;

  console.log('\n📝 Processing units...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const unit of unitsToProcess) {
    const unitId = unit.id || unit.unit_id || `unit-${Math.random().toString(36).substr(2, 9)}`;
    const unitName = unit.name || unit.unit_name || unitId;
    
    const availabilityData = {
      name: unitName,
      status: 'available', // available, reserved, sold, unavailable
      notes: '',
      type: unit.type || 'Apartment',
      floor: unit.floor || null,
      bedrooms: unit.bedrooms || null,
      area: unit.area || null,
      price: unit.price || null,
      updatedAt: Date.now(),
      updatedBy: 'system',
      initializedAt: Date.now()
    };

    try {
      await availabilityRef.child(unitId).set(availabilityData);
      console.log(`✅ ${unitName} - Initialized as AVAILABLE`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${unitName} - Error: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log('='.repeat(50));

  if (successCount > 0) {
    console.log('\n🎉 Initialization complete!');
    console.log('\n📱 Next Steps:');
    console.log('1. Open your app and login as admin');
    console.log('2. Click the Admin button to view availability manager');
    console.log('3. Update unit statuses as needed');
    console.log('\n🔗 Firebase Database URL:');
    console.log(`   ${firebaseConfig.databaseURL}`);
  }

  process.exit(0);
}

/**
 * Alternative: Manual setup instructions
 */
function showManualSetupInstructions() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 MANUAL SETUP INSTRUCTIONS');
  console.log('='.repeat(60));
  console.log('\nIf you prefer not to use the Admin SDK, you can:');
  console.log('\n1️⃣  Use Firebase Console:');
  console.log('   → https://console.firebase.google.com/');
  console.log('   → Select project: availability-fe35f');
  console.log('   → Go to Realtime Database');
  console.log('   → Manually add units under "availability" node');
  console.log('\n2️⃣  Use Firebase CLI:');
  console.log('   → npm install -g firebase-tools');
  console.log('   → firebase login');
  console.log('   → firebase database:set /availability < data.json');
  console.log('\n3️⃣  Example data structure:');
  console.log(`
{
  "availability": {
    "unit-101": {
      "name": "Unit 101",
      "status": "available",
      "notes": "",
      "updatedAt": ${Date.now()},
      "updatedBy": "admin"
    },
    "unit-102": {
      "name": "Unit 102",
      "status": "reserved",
      "notes": "Reserved until May 2024",
      "updatedAt": ${Date.now()},
      "updatedBy": "agent"
    }
  }
}
  `);
  console.log('='.repeat(60));
}

// Run initialization
if (require.main === module) {
  initializeAvailability().catch(error => {
    console.error('❌ Initialization failed:', error.message);
    showManualSetupInstructions();
    process.exit(1);
  });
}

module.exports = { initializeAvailability };
