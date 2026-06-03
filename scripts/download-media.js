#!/usr/bin/env node
/**
 * Download logos and media assets for all brands
 * Usage: node download-media.js
 */

const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { fetchURL, downloadFile, extractLogoURL } = require('./lib/scraping-utils');

const BRANDS = [
  {
    id: 'demahope',
    name: 'Dema Hope Real Estate',
    website: 'https://demahoperealestate.com/',
    logoPath: '_brands/demahope/project/demahope-logo.png'
  },
  {
    id: 'metropolitan',
    name: 'Metropolitan Real Estate',
    website: 'https://metropolitanaddis.com/',
    logoPath: '_brands/metropolitan/project/metropolitan-logo.png'
  },
  {
    id: 'gift',
    name: 'GIFT Real Estate',
    website: 'https://giftrealestate.com.et/',
    logoPath: '_brands/gift/project/gift-logo.png'
  },
  {
    id: 'ayat',
    name: 'Ayat Real Estate',
    website: 'https://ayatrealestate.com/',
    logoPath: '_brands/ayat/project/ayat-logo.png'
  }
];

function extractFavicon(url) {
  return new URL('/favicon.ico', url).href;
}

async function downloadBrandMedia(brand) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Downloading media for: ${brand.name}`);
  console.log('='.repeat(60));

  try {
    // Fetch website HTML
    console.log(`\nFetching ${brand.website}...`);
    const html = await fetchURL(brand.website);
    console.log(`✓ Fetched HTML (${(html.length / 1024).toFixed(1)} KB)`);

    // Extract logo
    const logoURL = extractLogoURL(html, brand.website);
    if (logoURL) {
      console.log(`\nFound logo: ${logoURL}`);
      try {
        await downloadFile(logoURL, brand.logoPath);
        const size = fs.statSync(brand.logoPath).size;
        console.log(`✓ Logo downloaded: ${brand.logoPath} (${(size / 1024).toFixed(1)} KB)`);
      } catch (err) {
        console.error(`✗ Failed to download logo: ${err.message}`);
      }
    } else {
      console.log(`\n⚠ Logo not found, using placeholder`);
    }

    // Try favicon as fallback
    if (!fs.existsSync(brand.logoPath) || fs.statSync(brand.logoPath).size < 1000) {
      const faviconURL = extractFavicon(brand.website);
      console.log(`\nTrying favicon: ${faviconURL}`);
      try {
        const faviconPath = brand.logoPath.replace('.png', '-favicon.png');
        await downloadFile(faviconURL, faviconPath);
        const size = fs.statSync(faviconPath).size;
        console.log(`✓ Favicon downloaded: ${faviconPath} (${(size / 1024).toFixed(1)} KB)`);
      } catch (err) {
        console.log(`✗ Favicon not available`);
      }
    }

    return true;
  } catch (err) {
    console.error(`✗ Error processing ${brand.name}: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('Starting media download for all brands...\n');

  let successCount = 0;

  for (const brand of BRANDS) {
    const success = await downloadBrandMedia(brand);
    if (success) successCount++;

    // Be polite to servers - wait 2 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Media download complete!');
  console.log(`Successfully processed ${successCount}/${BRANDS.length} brands`);
  console.log('='.repeat(60));

  // Check which logos exist
  console.log('\nLogo status:');
  for (const brand of BRANDS) {
    if (fs.existsSync(brand.logoPath)) {
      const size = fs.statSync(brand.logoPath).size;
      console.log(`  ✓ ${brand.id}: ${brand.logoPath} (${(size / 1024).toFixed(1)} KB)`);
    } else {
      console.log(`  ✗ ${brand.id}: Logo not found`);
    }
  }
}

main().catch(console.error);
