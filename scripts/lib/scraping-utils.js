#!/usr/bin/env node
/**
 * Shared scraping utilities for brand media extraction.
 * Used by both scrape-brands.js and download-media.js to avoid code duplication.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const { URL } = require('url');

const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;       // 5 MB
const MAX_REDIRECTS = 5;

const IMAGE_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/avif'
];

/**
 * Fetch a URL and return its body as a string.
 * Follows redirects up to maxRedirects times and only to https: URLs.
 * Rejects responses whose Content-Length exceeds MAX_RESPONSE_SIZE.
 */
function fetchURL(url, maxRedirects) {
  if (maxRedirects === undefined) maxRedirects = MAX_REDIRECTS;

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        const location = res.headers.location;
        if (maxRedirects <= 0) {
          res.resume();
          return reject(new Error(`Redirect limit exceeded when fetching ${url}`));
        }
        // Protocol validation: only follow redirects to https:
        try {
          const redirectURL = new URL(location, url);
          if (redirectURL.protocol !== 'https:') {
            res.resume();
            return reject(new Error(`Insecure redirect target: ${redirectURL.href} (only https: is allowed)`));
          }
        } catch (e) {
          res.resume();
          return reject(new Error(`Invalid redirect location: ${location}`));
        }
        res.resume();
        return fetchURL(location, maxRedirects - 1).then(resolve, reject);
      }

      // Check Content-Length before accumulating
      const contentLength = parseInt(res.headers['content-length'], 10);
      if (!isNaN(contentLength) && contentLength > MAX_RESPONSE_SIZE) {
        res.resume();
        return reject(new Error(`Response too large (${contentLength} bytes, max ${MAX_RESPONSE_SIZE} bytes) for ${url}`));
      }

      let data = '';
      let byteLength = 0;
      res.on('data', (chunk) => {
        byteLength += chunk.length;
        if (byteLength > MAX_RESPONSE_SIZE) {
          res.destroy();
          reject(new Error(`Response body exceeded ${MAX_RESPONSE_SIZE} bytes while fetching ${url}`));
          return;
        }
        data += chunk;
      });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Download a file from a URL to a local destination.
 * Follows redirects up to maxRedirects times and only to https: URLs.
 * Enforces a file size limit of MAX_FILE_SIZE and validates Content-Type is an image type.
 * Creates the destination directory if it does not exist.
 */
function downloadFile(url, dest, maxRedirects) {
  if (maxRedirects === undefined) maxRedirects = MAX_REDIRECTS;

  return new Promise((resolve, reject) => {
    // Create directory if it doesn't exist
    const dir = require('path').dirname(dest);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);

    protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*'
      }
    }, (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        const location = res.headers.location;
        if (maxRedirects <= 0) {
          res.resume();
          fs.unlink(dest, () => {});
          return reject(new Error(`Redirect limit exceeded when downloading ${url}`));
        }
        // Protocol validation: only follow redirects to https:
        try {
          const redirectURL = new URL(location, url);
          if (redirectURL.protocol !== 'https:') {
            res.resume();
            fs.unlink(dest, () => {});
            return reject(new Error(`Insecure redirect target: ${redirectURL.href} (only https: is allowed)`));
          }
        } catch (e) {
          res.resume();
          fs.unlink(dest, () => {});
          return reject(new Error(`Invalid redirect location: ${location}`));
        }
        res.resume();
        return downloadFile(location, dest, maxRedirects - 1).then(resolve, reject);
      }

      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }

      // Validate Content-Type is an image
      const contentType = (res.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      if (contentType && !IMAGE_CONTENT_TYPES.includes(contentType)) {
        file.close();
        res.resume();
        fs.unlink(dest, () => {});
        return reject(new Error(`Invalid Content-Type "${contentType}" for ${url} (expected image type)`));
      }

      // Enforce file size limit
      const contentLength = parseInt(res.headers['content-length'], 10);
      if (!isNaN(contentLength) && contentLength > MAX_FILE_SIZE) {
        file.close();
        res.resume();
        fs.unlink(dest, () => {});
        return reject(new Error(`File too large (${contentLength} bytes, max ${MAX_FILE_SIZE} bytes) for ${url}`));
      }

      let downloadedBytes = 0;
      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (downloadedBytes > MAX_FILE_SIZE) {
          file.close();
          res.destroy();
          fs.unlink(dest, () => {});
          reject(new Error(`File exceeded ${MAX_FILE_SIZE} bytes while downloading ${url}`));
        }
      });

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

/**
 * Extract a logo URL from HTML content by matching common logo patterns.
 * Resolves relative URLs against the provided baseUrl.
 */
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

module.exports = {
  fetchURL,
  downloadFile,
  extractLogoURL,
  MAX_RESPONSE_SIZE,
  MAX_FILE_SIZE,
  MAX_REDIRECTS,
  IMAGE_CONTENT_TYPES
};
