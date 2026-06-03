#!/usr/bin/env node
/**
 * Scrape real estate websites and update brand data
 * Usage: node scrape-brands.js
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
    primaryColor: '#1a472a',
    existingFolder: '_brands/demahope'
  },
  {
    id: 'metropolitan',
    name: 'Metropolitan Real Estate PLC',
    website: 'https://metropolitanaddis.com/',
    primaryColor: '#2c3e50',
    existingFolder: '_brands/metropolitan'
  },
  {
    id: 'gift',
    name: 'GIFT Real Estate',
    website: 'https://giftrealestate.com.et/',
    primaryColor: '#c0392b',
    existingFolder: '_brands/gift'
  },
  {
    id: 'ayat',
    name: 'Ayat Real Estate',
    website: 'https://ayatrealestate.com/',
    primaryColor: '#8e44ad',
    existingFolder: '_brands/ayat'
  }
];

function extractImages(html, baseUrl) {
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  const images = [];
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    let src = match[1];
    if (src.startsWith('//')) {
      src = 'https:' + src;
    } else if (src.startsWith('/')) {
      const url = new URL(baseUrl);
      src = url.origin + src;
    } else if (!src.startsWith('http')) {
      const url = new URL(baseUrl);
      src = url.origin + '/' + src;
    }
    images.push(src);
  }
  return images;
}

function extractMetaImage(html) {
  const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return match ? match[1] : null;
}

async function scrapeBrand(brand) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Scraping: ${brand.name}`);
  console.log(`Website: ${brand.website}`);
  console.log('='.repeat(60));

  try {
    const html = await fetchURL(brand.website);

    // Extract images
    const images = extractImages(html, brand.website);
    const metaImage = extractMetaImage(html);
    const logo = extractLogoURL(html, brand.website);

    console.log(`\n✓ Fetched HTML (${html.length} bytes)`);
    console.log(`Found ${images.length} images`);
    if (metaImage) console.log(`Meta image: ${metaImage}`);
    if (logo) console.log(`Logo: ${logo}`);

    // Create temp directory for this brand
    const tempDir = path.join('temp-scrapes', brand.id);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Download logo if found
    if (logo) {
      const logoPath = path.join(tempDir, 'logo.png');
      console.log(`\nDownloading logo: ${logo}`);
      try {
        await downloadFile(logo, logoPath);
        console.log(`✓ Logo downloaded: ${logoPath}`);
      } catch (err) {
        console.error(`✗ Failed to download logo: ${err.message}`);
      }
    }

    // Download first few project images
    const projectImages = images.slice(0, 10);
    for (let i = 0; i < projectImages.length; i++) {
      const imgUrl = projectImages[i];
      const ext = path.extname(new URL(imgUrl).pathname) || '.jpg';
      const imgPath = path.join(tempDir, `project-image-${i}${ext}`);
      try {
        await downloadFile(imgUrl, imgPath);
        console.log(`✓ Downloaded image ${i + 1}: ${imgPath}`);
      } catch (err) {
        console.error(`✗ Failed to download image ${i + 1}: ${err.message}`);
      }
    }

    return { html, images, logo, metaImage };
  } catch (err) {
    console.error(`✗ Failed to scrape ${brand.name}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('Starting brand scraping...\n');

  const results = {};

  for (const brand of BRANDS) {
    const result = await scrapeBrand(brand);
    if (result) {
      results[brand.id] = result;
    }
    // Be polite to servers
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Scraping complete!');
  console.log(`Successfully scraped ${Object.keys(results).length} brands`);
  console.log('='.repeat(60));

  // Summary
  for (const [id, data] of Object.entries(results)) {
    console.log(`\n${id}:`);
    console.log(`  - Logo: ${data.logo || 'Not found'}`);
    console.log(`  - Images: ${data.images.length}`);
    console.log(`  - Meta image: ${data.metaImage || 'Not found'}`);
  }
}

main().catch(console.error);
