const fs = require('fs');
const path = require('path');

const baseDir = __dirname;

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function getFilesInDir(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath).filter(file =>
    fs.statSync(path.join(dirPath, file)).isFile()
  );
}

function getDirsInDir(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath).filter(item =>
    fs.statSync(path.join(dirPath, item)).isDirectory()
  );
}

function isImage(f) { return /\.(webp|jpg|jpeg|png|avif|gif)$/i.test(f); }
function isVideo(f) { return /\.(mp4|webm|mov|ogg)$/i.test(f); }
function isModel(f) { return /\.(glb|gltf)$/i.test(f); }
function isHDR(f)   { return /\.(hdr|exr)$/i.test(f); }

// ═══════════════════════════════════════════════
// DIRECTORY SCANNING
// ═══════════════════════════════════════════════

const dirs = {
  unitMedia:       path.join(baseDir, 'unit-image-video'),
  floorPlan2D:     path.join(baseDir, '2d-floor-plan'),
  floorPlan3D:     path.join(baseDir, '3d-floor-plan'),
  panorama:        path.join(baseDir, 'panorama'),
  model:           path.join(baseDir, 'model'),
  hdr:             path.join(baseDir, 'hdr'),
  projectPlans:    path.join(baseDir, 'project', 'floor-plans'),
  projectAmenities:path.join(baseDir, 'project', 'amenities'),
  projectHero:     path.join(baseDir, 'project', 'hero-image-video'),
  projectGallery:  path.join(baseDir, 'project', 'gallery'),
  hotspotMedia:    path.join(baseDir, 'project', 'hotspot-media'),
};

const files = {};
for (const [key, dir] of Object.entries(dirs)) {
  files[key] = getFilesInDir(dir);
}

const devLogo = path.join(baseDir, 'project', 'developers-logo.jpg');
const hasDevLogo = fs.existsSync(devLogo);

// ═══════════════════════════════════════════════
// CONFIGURATION — edit these for your project
// ═══════════════════════════════════════════════

const PROJECT_CONFIG = {
  name: 'Lycee Seken',
  description: 'A landmark residential development in the heart of Addis Ababa (Piyassa area), offering premium apartments with world-class amenities. The building features B+G+19+T construction with 8 thoughtfully designed units per floor, optimal space utilization, cross ventilation, and stunning city views.',
  location: 'Piyassa, Addis Ababa',
  buildingType: 'Residential',
  buildingSize: 'B+G+19+T',
  lotSize: 1110,
  deliveryTime: '30 Months',
  parkingType: 'Private Parking',
  garageSize: '1 car',
  basement: true,
  unitsPerFloor: 8,
  floorRange: { start: 3, end: 17 },
  coordinates: { lat: 9.036278, lng: 38.752639 },

  // Camera defaults — high-angle corner view matching defaultcamera.png
  // Values are ratios: camera offset = building_size * ratio
  defaultCamera: [1, 1, 1],  // Corner view (equal X/Z offset), Y calculated from building height
  defaultTarget: [0, 0.15, 0], // Target 15% up from building base for downward angle

  // Model transform — adjust to fit your GLB
  modelTransform: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],   // degrees
    scale: [1, 1, 1]
  },

  statusColors: {
    Available: '#22c55e',
    Reserved: '#f59e0b',
    Sold: '#ef4444'
  },

  // Building bounding box estimation
  // Each floor's Y range and the unit grid layout
  // Adjust these after inspecting your GLB in a 3D editor
  buildingBBox: {
    floorHeight: 3.2,        // meters per floor
    groundFloorY: 0,         // Y of floor 1 (floor 3 in your numbering)
    // Unit positions on each floor (X, Z pairs for center of each unit slot)
    // 8 units arranged around the building footprint
    unitSlots: [
      { x: -12, z: -6,  w: 6, d: 6 },   // slot 0 → unit 01 (1BR-01)
      { x: -6,  z: -6,  w: 6, d: 6 },   // slot 1 → unit 02 (3BR-02)
      { x:  0,  z: -6,  w: 6, d: 6 },   // slot 2 → unit 03 (3BR-03)
      { x:  6,  z: -6,  w: 6, d: 6 },   // slot 3 → unit 04 (3BR-04)
      { x:  6,  z:  0,  w: 6, d: 6 },   // slot 4 → unit 05 (3BR-05)
      { x:  0,  z:  0,  w: 6, d: 6 },   // slot 5 → unit 06 (3BR-06)
      { x: -6,  z:  0,  w: 6, d: 6 },   // slot 6 → unit 07 (3BR-06)
      { x: -12, z:  0,  w: 6, d: 6 },   // slot 7 → unit 08 (2BR-08)
    ]
  }
};

// ═══════════════════════════════════════════════
// UNIT TYPE DEFINITIONS
// ═══════════════════════════════════════════════

// Maps unitType key → folder name in unit-image-video/
const UNIT_FOLDER_MAP = {
  '1BR-01': '1-bed-01',
  '2BR-08': '2-bed-01',
  '3BR-01': '3-bed-01',
  '3BR-02': '3-bed-02',
  '3BR-03': '3-bed-03',
  '3BR-04': '3-bed-04',
  '3BR-05': '3-bed-05',
  '3BR-06': '3-bed-06'
};

// Maps unitType key → 2D floor plan filename
const FLOOR_PLAN_2D_MAP = {
  '1BR-01': '1-bed-01-floor.webp',
  '2BR-08': '2bed-08-floor.webp',
  '3BR-01': '3bed-02-floor.webp',
  '3BR-02': '3bed-02-floor.webp',
  '3BR-03': '3-bed-03-floor.webp',
  '3BR-04': '3bed-04-floor.webp',
  '3BR-05': '3-bed-05-floor.webp',
  '3BR-06': '3-bed-06-floor.webp'
};

// Maps unitType key → panorama filename
const PANORAMA_MAP = {
  '1BR-01': '1-bed-01.webp',
  '2BR-08': '2-bed-01.webp',
  '3BR-01': '3-bed-01.webp',
  '3BR-02': '3-bed-02.webp',
  '3BR-03': '3-bed-03.webp',
  '3BR-04': '3-bed-04.webp',
  '3BR-05': '3-bed-05.webp',
  '3BR-06': '3-bed-06.webp'
};

// Order of unit types per floor (slot 0-7)
const UNIT_TYPE_ORDER = [
  '1BR-01', '3BR-02', '3BR-03', '3BR-04',
  '3BR-05', '3BR-06', '3BR-06', '2BR-08'
];

// Pricing per unit type
const PRICING = {
  '1BR-01': { base: 163985,  increment: 2833 },
  '2BR-08': { base: 222074,  increment: 6871 },
  '3BR-01': { base: null,    increment: 0 },
  '3BR-02': { base: null,    increment: 7913 },
  '3BR-03': { base: 398320,  increment: 5000 },
  '3BR-04': { base: 313186,  increment: 6000 },
  '3BR-05': { base: null,    increment: 0 },
  '3BR-06': { base: null,    increment: 0 }
};

// Unit type detailed definitions
const UNIT_TYPES = {
  '1BR-01': {
    label: '1 Bedroom - Type 01',
    type: '1BR',
    bedrooms: 1,
    bathrooms: 1,
    area: { net: 43, common: 20, total: 63 },
    functionalAreas: [
      { name: 'Living & Dining', area: 25.95 },
      { name: 'Master Bed Room', area: 12.87 },
      { name: 'Common Bath Room', area: 4.34 }
    ],
    features: ['1 Bed', '1 Bath', '1 Kitchen', 'Living & Dining'],
    description: 'Experience contemporary urban living in this thoughtfully designed one-bedroom unit. Perfectly suited for professionals, singles, or couples seeking modern city life with optimal comfort.'
  },
  '2BR-08': {
    label: '2 Bedroom - Type 08',
    type: '2BR',
    bedrooms: 2,
    bathrooms: 2,
    area: { net: 64, common: 22, total: 86 },
    functionalAreas: [
      { name: 'Living & Dining', area: 16 },
      { name: 'Kitchen', area: 7.48 },
      { name: 'Master Bed Room', area: 15.14 },
      { name: 'Master Bath Room', area: 4.38 },
      { name: 'Bedroom 1', area: 7.48 },
      { name: 'Common Bath Room', area: 5.09 },
      { name: 'Corridor', area: 4.84 }
    ],
    features: ['2 Beds', '2 Baths', '1 Kitchen', 'Master Suite', 'Corridor'],
    description: 'This sophisticated two-bedroom residence combines elegance with practicality. Featuring a master suite with en-suite bathroom, perfect for couples or small families seeking premium urban living.'
  },
  '3BR-01': {
    label: '3 Bedroom - Type 01',
    type: '3BR',
    bedrooms: 3,
    bathrooms: 2,
    area: { net: 106, common: 26, total: 132 },
    functionalAreas: [
      { name: 'Living & Dining', area: 32.1 },
      { name: 'Kitchen', area: 12.3 },
      { name: 'Master Bed Room', area: 15.95 },
      { name: 'Master Bath Room', area: 5.01 },
      { name: 'Bedroom 1', area: 9.21 },
      { name: 'Bedroom 2', area: 9.63 },
      { name: 'Common Bath Room', area: 5.41 },
      { name: 'Corridor', area: 4.87 },
      { name: 'Store', area: 4.3 },
      { name: 'Balcony', area: 6.55 }
    ],
    features: ['3 Beds', '2 Baths', '1 Store', '1 Balcony', '1 Kitchen'],
    description: 'Spacious three-bedroom home designed for modern family living with premium finishes, generous storage, and a private balcony.'
  },
  '3BR-02': {
    label: '3 Bedroom - Type 02',
    type: '3BR',
    bedrooms: 3,
    bathrooms: 2,
    area: { net: 106, common: 26, total: 132 },
    functionalAreas: [
      { name: 'Living & Dining', area: 32.1 },
      { name: 'Kitchen', area: 12.3 },
      { name: 'Master Bed Room', area: 15.95 },
      { name: 'Master Bath Room', area: 5.01 },
      { name: 'Bedroom 1', area: 9.21 },
      { name: 'Bedroom 2', area: 9.63 },
      { name: 'Common Bath Room', area: 5.41 },
      { name: 'Corridor', area: 4.87 },
      { name: 'Store', area: 4.3 },
      { name: 'Balcony', area: 6.55 }
    ],
    features: ['3 Beds', '2 Baths', '1 Store', '1 Balcony', '1 Kitchen'],
    description: 'Spacious three-bedroom home designed for modern family living with premium finishes and thoughtful layout.'
  },
  '3BR-03': {
    label: '3 Bedroom - Type 03',
    type: '3BR',
    bedrooms: 3,
    bathrooms: 2,
    area: { net: 117, common: 29, total: 146 },
    functionalAreas: [
      { name: 'Living & Dining', area: 28.81 },
      { name: 'Kitchen', area: 19.9 },
      { name: 'Master Bed Room', area: 16.98 },
      { name: 'Master Bath Room', area: 5.13 },
      { name: 'Bedroom 1', area: 10.61 },
      { name: 'Bedroom 2', area: 9.39 },
      { name: 'Common Bath Room', area: 4.38 },
      { name: 'Corridor', area: 6.03 },
      { name: 'Store', area: 3.75 },
      { name: 'Balcony', area: 12.07 }
    ],
    features: ['3 Beds', '2 Baths', '1 Store', '1 Large Balcony', '1 Kitchen'],
    description: 'Spacious three-bedroom with an expansive 12m² balcony and generous kitchen, ideal for families who love entertaining.'
  },
  '3BR-04': {
    label: '3 Bedroom - Type 04',
    type: '3BR',
    bedrooms: 3,
    bathrooms: 2,
    area: { net: 95, common: 24, total: 119 },
    functionalAreas: [
      { name: 'Living & Dining', area: 26.15 },
      { name: 'Kitchen', area: 13.05 },
      { name: 'Master Bed Room', area: 17.31 },
      { name: 'Master Bath Room', area: 4.05 },
      { name: 'Bedroom 1', area: 13.59 },
      { name: 'Bedroom 2', area: 8.97 },
      { name: 'Common Bath Room', area: 4.89 },
      { name: 'Corridor', area: 2.45 },
      { name: 'Balcony', area: 4.59 }
    ],
    features: ['3 Beds', '2 Baths', '1 Balcony', '1 Kitchen'],
    description: 'Efficiently designed three-bedroom with a large master suite and generous secondary bedroom, perfect for growing families.'
  },
  '3BR-05': {
    label: '3 Bedroom - Type 05',
    type: '3BR',
    bedrooms: 3,
    bathrooms: 2,
    area: { net: 90, common: 24, total: 114 },
    functionalAreas: [
      { name: 'Living & Dining', area: 23.94 },
      { name: 'Kitchen', area: 9.66 },
      { name: 'Master Bed Room', area: 17.72 },
      { name: 'Master Bath Room', area: 4.02 },
      { name: 'Bedroom 1', area: 8.91 },
      { name: 'Bedroom 2', area: 11.74 },
      { name: 'Common Bath Room', area: 5.23 },
      { name: 'Corridor', area: 6.81 },
      { name: 'Balcony', area: 4.18 }
    ],
    features: ['3 Beds', '2 Baths', '1 Balcony', '1 Kitchen'],
    description: 'Compact yet comfortable three-bedroom with excellent room proportions and a private balcony retreat.'
  },
  '3BR-06': {
    label: '3 Bedroom - Type 06',
    type: '3BR',
    bedrooms: 3,
    bathrooms: 2,
    area: { net: 116, common: 29, total: 145 },
    functionalAreas: [
      { name: 'Living & Dining', area: 30.73 },
      { name: 'Kitchen', area: 18.95 },
      { name: 'Master Bed Room', area: 16.26 },
      { name: 'Master Bath Room', area: 4.43 },
      { name: 'Bedroom 1', area: 10.22 },
      { name: 'Bedroom 2', area: 10.23 },
      { name: 'Common Bath Room', area: 4.12 },
      { name: 'Corridor', area: 5 },
      { name: 'Store', area: 4.26 },
      { name: 'Balcony', area: 5.55 }
    ],
    features: ['3 Beds', '2 Baths', '1 Store', '1 Balcony', '1 Kitchen'],
    description: 'Premium three-bedroom with spacious open-plan living, a large kitchen, and dedicated storage. The perfect family home.'
  }
};

// ═══════════════════════════════════════════════
// ASSET RESOLUTION
// ═══════════════════════════════════════════════

function resolveUnitTypeAssets(typeKey) {
  const folderName = UNIT_FOLDER_MAP[typeKey];
  if (!folderName) return { images: [], videos: [], heroImage: null, floorPlan2D: null, floorPlan3D: null, panorama: null };

  const folderPath = path.join(dirs.unitMedia, folderName);
  const mediaFiles = getFilesInDir(folderPath);
  const images = mediaFiles.filter(isImage).map(f => `unit-image-video/${folderName}/${f}`);
  const videos = mediaFiles.filter(isVideo).map(f => `unit-image-video/${folderName}/${f}`);

  // Hero image = first image
  const heroImage = images.length > 0 ? images[0] : null;

  // 2D floor plan
  let floorPlan2D = null;
  const fpFile = FLOOR_PLAN_2D_MAP[typeKey];
  if (fpFile && files.floorPlan2D.includes(fpFile)) {
    floorPlan2D = `2d-floor-plan/${fpFile}`;
  } else {
    // Fallback: fuzzy match
    const match = files.floorPlan2D.find(f =>
      f.toLowerCase().includes(typeKey.replace('BR', 'bed').toLowerCase().replace('-', ''))
    );
    if (match) floorPlan2D = `2d-floor-plan/${match}`;
  }

  // 3D floor plan
  let floorPlan3D = null;
  const fp3dFolder = UNIT_FOLDER_MAP[typeKey];
  if (fp3dFolder) {
    const match3d = files.floorPlan3D.find(f =>
      f.toLowerCase().includes(fp3dFolder.toLowerCase().replace(/-/g, ''))
      || f.toLowerCase().includes(typeKey.toLowerCase().replace('br', 'bed').replace('-', ''))
    );
    if (match3d) floorPlan3D = `3d-floor-plan/${match3d}`;
  }
  // Fallback by bedroom count
  if (!floorPlan3D) {
    if (typeKey.includes('1BR')) {
      const m = files.floorPlan3D.find(f => f.includes('1-bed') || f.includes('1bed'));
      if (m) floorPlan3D = `3d-floor-plan/${m}`;
    } else if (typeKey.includes('2BR')) {
      const m = files.floorPlan3D.find(f => f.includes('2-bed') || f.includes('2bed'));
      if (m) floorPlan3D = `3d-floor-plan/${m}`;
    } else {
      const m = files.floorPlan3D.find(f => f.includes('3') && f.includes('bed'));
      if (m) floorPlan3D = `3d-floor-plan/${m}`;
    }
  }

  // Panorama
  let panorama = null;
  const panoFile = PANORAMA_MAP[typeKey];
  if (panoFile && files.panorama.includes(panoFile)) {
    panorama = `panorama/${panoFile}`;
  }

  return { images, videos, heroImage, floorPlan2D, floorPlan3D, panorama };
}

// ═══════════════════════════════════════════════
// BBOX GENERATION
// ═══════════════════════════════════════════════

function computeUnitBBox(floor, slotIndex) {
  const bb = PROJECT_CONFIG.buildingBBox;
  const slot = bb.unitSlots[slotIndex];
  if (!slot) return null;

  const floorOffset = floor - PROJECT_CONFIG.floorRange.start;
  const yMin = bb.groundFloorY + (floorOffset * bb.floorHeight);
  const yMax = yMin + bb.floorHeight;

  return {
    min: [slot.x, yMin, slot.z],
    max: [slot.x + slot.w, yMax, slot.z + slot.d]
  };
}

// Compute center of a bbox for camera targets
function bboxCenter(bbox) {
  return [
    (bbox.min[0] + bbox.max[0]) / 2,
    (bbox.min[1] + bbox.max[1]) / 2,
    (bbox.min[2] + bbox.max[2]) / 2
  ];
}

// ═══════════════════════════════════════════════
// GALLERY RESOLUTION
// ═══════════════════════════════════════════════

function buildGallery() {
  const gallery = [];

  // Project hero images/videos
  files.projectHero.forEach(f => {
    gallery.push({
      url: `project/hero-image-video/${f}`,
      type: isVideo(f) ? 'video' : 'image',
      label: 'Project Overview',
      category: 'hero'
    });
  });

  // Amenity images
  files.projectAmenities.forEach(f => {
    if (isImage(f) || isVideo(f)) {
      gallery.push({
        url: `project/amenities/${f}`,
        type: isVideo(f) ? 'video' : 'image',
        label: f.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        category: 'amenity'
      });
    }
  });

  // Project gallery folder
  if (files.projectGallery) {
    files.projectGallery.forEach(f => {
      if (isImage(f) || isVideo(f)) {
        gallery.push({
          url: `project/gallery/${f}`,
          type: isVideo(f) ? 'video' : 'image',
          label: f.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          category: 'gallery'
        });
      }
    });
  }

  // Project floor plans as gallery items
  files.projectPlans.forEach(f => {
    if (isImage(f)) {
      gallery.push({
        url: `project/floor-plans/${f}`,
        type: 'image',
        label: 'Floor Plan - ' + f.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        category: 'floorplan'
      });
    }
  });

  return gallery;
}

// ═══════════════════════════════════════════════
// HOTSPOT MEDIA
// ═══════════════════════════════════════════════

function resolveHotspotMedia(hotspotId) {
  const hsDir = path.join(dirs.hotspotMedia, hotspotId);
  if (!fs.existsSync(hsDir)) return { images: [], videos: [] };
  const hsFiles = getFilesInDir(hsDir);
  return {
    images: hsFiles.filter(isImage).map(f => `project/hotspot-media/${hotspotId}/${f}`),
    videos: hsFiles.filter(isVideo).map(f => `project/hotspot-media/${hotspotId}/${f}`)
  };
}

// ═══════════════════════════════════════════════
// UNIT GENERATION
// ═══════════════════════════════════════════════

function generateUnits() {
  const units = [];
  let idx = 1;
  const { start, end } = PROJECT_CONFIG.floorRange;

  for (let floor = start; floor <= end; floor++) {
    for (let slot = 0; slot < 8; slot++) {
      const typeKey = UNIT_TYPE_ORDER[slot];
      const typeDef = UNIT_TYPES[typeKey];
      const assets = resolveUnitTypeAssets(typeKey);
      const pricing = PRICING[typeKey];

      // Unit number: floor + slot (01-08)
      const slotNum = (slot + 1).toString().padStart(2, '0');
      const unitNumber = `${floor}${slotNum}`;

      // Price calculation
      let price = null;
      if (pricing && pricing.base !== null) {
        price = Math.round(pricing.base + (pricing.increment * (floor - start)));
      }

      // Status assignment (deterministic based on unit number for consistency)
      let status;
      if (price === null) {
        status = 'Available';
      } else {
        // Use hash of unitNumber for deterministic but varied statuses
        const hash = unitNumber.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const roll = (hash * 7 + floor * 13 + slot * 31) % 100;
        status = roll < 65 ? 'Sold' : (roll < 88 ? 'Reserved' : 'Available');
      }

      // Compute bounding box
      const bbox = computeUnitBBox(floor, slot);

      // Build the unit name for GLB mesh matching
      // Convention: the mesh in the GLB should be named matching unitNumber
      // e.g. "301", "302", ... "1901", "1908"
      const meshName = unitNumber;

      units.push({
        id: `u${String(idx).padStart(3, '0')}`,
        unitNumber: unitNumber,
        name: `Unit ${unitNumber}`,
        meshName: meshName,
        unitType: typeKey,
        type: typeDef.type,
        floor: floor,
        area: typeDef.area.total,
        areaBreakdown: {
          net: typeDef.area.net,
          common: typeDef.area.common,
          total: typeDef.area.total
        },
        bedrooms: typeDef.bedrooms,
        bathrooms: typeDef.bathrooms,
        price: price,
        priceFormatted: price ? `ETB ${price.toLocaleString()}` : 'Contact Us',
        status: status,
        description: typeDef.description,
        features: typeDef.features,
        functionalAreas: typeDef.functionalAreas,

        // Bounding box for 3D selection
        bbox: bbox,

        // Media — resolved from unit type assets
        image: assets.heroImage,
        images: assets.images,
        videos: assets.videos,
        panorama: assets.panorama,
        floorPlan: assets.floorPlan2D,
        floorPlan3D: assets.floorPlan3D,
      });

      idx++;
    }
  }

  return units;
}

// ═══════════════════════════════════════════════
// HOTSPOT DEFINITIONS — PRESERVE EXISTING
// ═══════════════════════════════════════════════

// Try to load existing tour-data.json to preserve hotspots and other custom data
let existingData = null;
const existingDataPath = path.join(baseDir, 'tour-data.json');
if (fs.existsSync(existingDataPath)) {
  try {
    existingData = JSON.parse(fs.readFileSync(existingDataPath, 'utf8'));
    console.log('✓ Found existing tour-data.json — preserving hotspots and custom data');
  } catch (e) {
    console.log('⚠ Could not parse existing tour-data.json — using defaults');
  }
}

// Default hotspots (only used if no existing data)
const DEFAULT_HOTSPOTS = [
  {
    id: 'h1',
    label: 'EV Charging Station',
    description: 'Eco-friendly electric vehicle charging stations available for residents. Conveniently located with fast-charging capability for all EV models.',
    position: [12, -2, 8],
    navTarget: [15, 0, 12],
    color: '#10b981',
    icon: '🔌',
    type: 'amenity',
    images: ['project/amenities/ev-charging-station.jpg'],
    videos: []
  },
  {
    id: 'h2',
    label: 'Green Terrace',
    description: 'Landscaped rooftop terrace with seating areas, walking paths, and city views. A peaceful retreat above the city.',
    position: [0, 62, 0],
    navTarget: [5, 65, 10],
    color: '#22c55e',
    icon: '🌱',
    type: 'amenity',
    images: ['project/amenities/green-terrace.jpg'],
    videos: []
  }
];

// Use existing hotspots if available, otherwise use defaults
const HOTSPOTS = existingData?.hotspots || DEFAULT_HOTSPOTS;

// Resolve hotspot media for default hotspots only (existing ones already have media)
if (!existingData) {
  HOTSPOTS.forEach(h => {
    const media = resolveHotspotMedia(h.id);
    if (media.images.length > 0) h.images = media.images;
    if (media.videos.length > 0) h.videos = media.videos;
  });
}

// ═══════════════════════════════════════════════
// BUILD UNIT TYPES WITH RESOLVED ASSETS
// ═══════════════════════════════════════════════

const unitTypesOutput = {};
for (const [key, def] of Object.entries(UNIT_TYPES)) {
  const assets = resolveUnitTypeAssets(key);
  unitTypesOutput[key] = {
    ...def,
    assets: {
      images: assets.images,
      videos: assets.videos,
      heroImage: assets.heroImage,
      floorPlan2D: assets.floorPlan2D,
      floorPlan3D: assets.floorPlan3D,
      panorama: assets.panorama
    }
  };
}

// ═══════════════════════════════════════════════
// ENVIRONMENT & MODEL RESOLUTION
// ═══════════════════════════════════════════════

const hdriFile = files.hdr.find(isHDR);
const buildingModel = files.model.find(isModel);

// ═══════════════════════════════════════════════
// ASSEMBLE FINAL JSON — PRESERVE EXISTING DATA
// ═══════════════════════════════════════════════

const tourData = {
  version: 4,

  // ── Project info ──
  projectName: PROJECT_CONFIG.name,
  projectDescription: PROJECT_CONFIG.description,

  projectDetails: {
    location: PROJECT_CONFIG.location,
    buildingType: PROJECT_CONFIG.buildingType,
    buildingSize: PROJECT_CONFIG.buildingSize,
    lotSize: PROJECT_CONFIG.lotSize,
    deliveryTime: PROJECT_CONFIG.deliveryTime,
    parkingType: PROJECT_CONFIG.parkingType,
    garageSize: PROJECT_CONFIG.garageSize,
    basement: PROJECT_CONFIG.basement,
    unitsPerFloor: PROJECT_CONFIG.unitsPerFloor,
    totalFloors: PROJECT_CONFIG.floorRange.end - PROJECT_CONFIG.floorRange.start + 1,
    totalUnits: (PROJECT_CONFIG.floorRange.end - PROJECT_CONFIG.floorRange.start + 1) * PROJECT_CONFIG.unitsPerFloor,
  },

  coordinates: PROJECT_CONFIG.coordinates,

  // ── 3D config ──
  defaultCamera: PROJECT_CONFIG.defaultCamera,
  defaultTarget: PROJECT_CONFIG.defaultTarget,
  modelFile: buildingModel ? `model/${buildingModel}` : null,
  modelTransform: PROJECT_CONFIG.modelTransform,
  hdri: hdriFile ? `hdr/${hdriFile}` : null,
  statusColors: PROJECT_CONFIG.statusColors,

  // ── Media ──
  media: {
    developerLogo: hasDevLogo ? 'project/developers-logo.jpg' : null,
    heroImage: files.projectHero.find(isImage) ? `project/hero-image-video/${files.projectHero.find(isImage)}` : null,
    heroVideo: files.projectHero.find(isVideo) ? `project/hero-image-video/${files.projectHero.find(isVideo)}` : null,
    projectFloorPlan: files.projectPlans.length > 0 ? `project/floor-plans/${files.projectPlans[0]}` : null,
    amenityImages: files.projectAmenities.filter(isImage).map(f => `project/amenities/${f}`),
    amenityVideos: files.projectAmenities.filter(isVideo).map(f => `project/amenities/${f}`),
    environmentMaps: files.hdr.map(f => `hdr/${f}`),
    buildingModel: buildingModel ? `model/${buildingModel}` : null
  },

  // ── Preserve existing data fields ──
  // These are preserved from existing tour-data.json if it exists
  nearbyAttractions: existingData?.nearbyAttractions || [
    { name: 'Bole International Airport', distance: '26min (8.8km)', type: 'Airport', icon: '✈️' },
    { name: 'Lycee G/Mariam International School', distance: '3min walk (260m)', type: 'School', icon: '🏫' },
    { name: 'Hyatt Regency', distance: '13min (3.2km)', type: 'Hotel', icon: '🏨' },
    { name: 'Sheraton Addis Hotel', distance: '6min (2.1km)', type: 'Hotel', icon: '🏨' },
    { name: 'Hilton Hotel', distance: '5min (2.2km)', type: 'Hotel', icon: '🏨' },
    { name: 'Radisson Blu Hotel', distance: '7min (2.1km)', type: 'Hotel', icon: '🏨' },
    { name: 'Intercontinental Hotel', distance: '8min (2.5km)', type: 'Hotel', icon: '🏨' },
    { name: 'Eliana Hotel', distance: '4min (800m)', type: 'Hotel', icon: '🏨' },
    { name: 'Abrehot Library', distance: '6min (1.70km)', type: 'Library', icon: '📚' },
    { name: 'National Museum of Ethiopia', distance: '9min (2.7km)', type: 'Museum', icon: '🏛️' },
    { name: 'Friendship Park', distance: '4min (1.4km)', type: 'Park', icon: '🌳' },
    { name: 'Addis Abeba Golf Club', distance: '22min (7.1km)', type: 'Recreation', icon: '⛳' }
  ],

  publicFacilities: existingData?.publicFacilities || [
    { name: 'International Hospitals', category: 'Healthcare', icon: '🏥' },
    { name: 'Universities, Colleges & Schools', category: 'Education', icon: '🎓' },
    { name: 'Utilities & Services (Maintenance & Gas stations)', category: 'Services', icon: '⛽' },
    { name: 'Hotels & Cultural Restaurants', category: 'Hospitality', icon: '🍽️' },
    { name: 'Sport Facilities, Malls & Commercial', category: 'Commercial', icon: '🏬' },
    { name: 'Parks, Zoo and Amusement Park', category: 'Recreation', icon: '🎡' },
    { name: 'Religious Places', category: 'Religious', icon: '⛪' }
  ],

  amenities: existingData?.amenities || [
    { name: 'Elevator', icon: '🛗', category: 'Building' },
    { name: 'WiFi', icon: '📶', category: 'Utilities' },
    { name: 'Central Air', icon: '❄️', category: 'Utilities' },
    { name: 'Electricity', icon: '⚡', category: 'Utilities' },
    { name: 'Equipped Kitchen', icon: '🍳', category: 'Interior' },
    { name: 'Fireplace', icon: '🔥', category: 'Interior' },
    { name: 'Back Yard', icon: '🌿', category: 'Outdoor' },
    { name: 'Garage Attached', icon: '🚗', category: 'Outdoor' },
    { name: 'Water Supply', icon: '💧', category: 'Outdoor' },
    { name: 'CCTV Surveillance', icon: '📹', category: 'Security' },
    { name: 'EV Charging Station', icon: '🔌', category: 'Utilities' },
    { name: 'Underground Water', icon: '🚰', category: 'Utilities' },
    { name: 'Green Terrace', icon: '🌱', category: 'Outdoor' }
  ],

  features: existingData?.features || [
    { icon: '🏊', text: 'Swimming Pool' },
    { icon: '💪', text: 'Fitness Center' },
    { icon: '🌳', text: 'Green Terrace' },
    { icon: '🅿️', text: 'Private Parking' },
    { icon: '🔒', text: '24/7 Security' },
    { icon: '🛗', text: 'High-Speed Elevator' },
    { icon: '🔌', text: 'EV Charging' },
    { icon: '🚰', text: 'Underground Water' }
  ],

  // ── Data ──
  hotspots: HOTSPOTS,
  unitTypes: unitTypesOutput,
  units: generateUnits(),
  gallery: buildGallery(),
};

// ═══════════════════════════════════════════════
// WRITE OUTPUT
// ═══════════════════════════════════════════════

const outputPath = path.join(baseDir, 'tour-data.json');
fs.writeFileSync(outputPath, JSON.stringify(tourData, null, 2));

// ═══════════════════════════════════════════════
// REPORT
// ═══════════════════════════════════════════════

console.log('\n╔════════════════════════════════════════════╗');
console.log('║   Tour Data Generator — Build Report       ║');
console.log('╚════════════════════════════════════════════╝\n');

console.log(`Project:        ${tourData.projectName}`);
console.log(`Version:        ${tourData.version}`);
console.log(`Output:         ${outputPath}`);
console.log(`File size:      ${(Buffer.byteLength(JSON.stringify(tourData)) / 1024).toFixed(1)} KB\n`);

console.log('── Assets Found ──');
console.log(`  HDRI:           ${hdriFile || '✗ none (will use fallback gradient)'}`);
console.log(`  Building GLB:   ${buildingModel || '✗ none (will use fallback geometry)'}`);
console.log(`  Dev Logo:       ${hasDevLogo ? '✓' : '✗'}`);
console.log(`  Hero Image:     ${tourData.media.heroImage || '✗'}`);
console.log(`  Hero Video:     ${tourData.media.heroVideo || '✗'}`);
console.log(`  Gallery Items:  ${tourData.gallery.length}`);
console.log(`  Hotspots:       ${tourData.hotspots.length}\n`);

console.log('── Unit Types ──');
for (const [key, data] of Object.entries(unitTypesOutput)) {
  const a = data.assets;
  console.log(`  ${key.padEnd(8)} │ ${data.type.padEnd(4)} │ ${data.area.total}m² │ imgs:${a.images.length} vid:${a.videos.length > 0 ? '✓' : '✗'} pano:${a.panorama ? '✓' : '✗'} fp2d:${a.floorPlan2D ? '✓' : '✗'} fp3d:${a.floorPlan3D ? '✓' : '✗'}`);
}

console.log(`\n── Units Generated ──`);
console.log(`  Total:          ${tourData.units.length}`);
console.log(`  Floors:         ${PROJECT_CONFIG.floorRange.start}–${PROJECT_CONFIG.floorRange.end}`);
console.log(`  Per floor:      ${PROJECT_CONFIG.unitsPerFloor}`);

const statusCounts = { Available: 0, Reserved: 0, Sold: 0 };
tourData.units.forEach(u => statusCounts[u.status]++);
console.log(`  Available:      ${statusCounts.Available}`);
console.log(`  Reserved:       ${statusCounts.Reserved}`);
console.log(`  Sold:           ${statusCounts.Sold}`);

const withPrice = tourData.units.filter(u => u.price !== null);
console.log(`  With pricing:   ${withPrice.length}`);
console.log(`  Price range:    ETB ${Math.min(...withPrice.map(u=>u.price)).toLocaleString()} – ${Math.max(...withPrice.map(u=>u.price)).toLocaleString()}`);
console.log(`  With bbox:      ${tourData.units.filter(u => u.bbox).length}`);
console.log(`  With panorama:  ${tourData.units.filter(u => u.panorama).length}`);

console.log('\n── Mesh Name Convention ──');
console.log('  GLB meshes should be named to match unit numbers:');
console.log('  e.g. "301", "302", ... "1901", "1908"');
console.log('  Or match unit names: "Unit 301", "Unit 302", etc.');
console.log('  The viewer auto-tags meshes by comparing names.\n');

console.log('✓ tour-data.json generated successfully!\n');
