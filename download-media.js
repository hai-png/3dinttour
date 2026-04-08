#!/usr/bin/env node
/**
 * Download logos and media assets for all brands
 * Usage: node download-media.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

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

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    // Create directory if it doesn't exist
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const file = fs.createWriteStream(dest);
    protocol.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*'
      } 
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return downloadFile(res.headers.location, dest).then(resolve, reject);
      }
      
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) {
        fs.unlink(dest, () => {});
      }
      reject(err);
    });
  });
}

async function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } 
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchURL(res.headers.location).then(resolve, reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractLogoURL(html, baseUrl) {
  const patterns = [
    /<img[^>]+class=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i,
    /<img[^>]+id=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i,
    /<a[^>]+class=["'][^"']*logo[^"']*["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i,
    /class=["'][^"']*site-logo[^"']*["'][^>]*src=["']([^"']+)["']/i,
    /class=["'][^"']*custom-logo-link[^"']*["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i,
    /<img[^>]+src=["']([^"']*logo[^"']*)["']/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      let src = match[1];
      if (src.startsWith('//')) {
        return 'https:' + src;
      } else if (src.startsWith('/')) {
        const url = new URL(baseUrl);
        return url.origin + src;
      } else if (!src.startsWith('http')) {
        const url = new URL(baseUrl);
        return url.origin + '/' + src;
      }
      return src;
    }
  }
  return null;
}

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
