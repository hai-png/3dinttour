/**
 * Copy all files to www folder for builds
 */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const WWW_DIR = path.join(ROOT_DIR, 'www');

// Files to exclude from build
const EXCLUDE = [
  'node_modules',
  'dist',
  'android',
  'ios',
  '.git',
  'scripts',
  'electron',
  'build',
  '.qwen',
  'www',  // Prevent recursive copying
  'package.json',  // Don't copy dev package.json
  'package-lock.json'
];

function copyFileSync(source, target) {
  const targetDir = path.dirname(target);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.copyFileSync(source, target);
}

function copyDirRecursive(sourceDir, targetDir, baseDir = sourceDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const files = fs.readdirSync(sourceDir);

  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    const relativePath = path.relative(baseDir, sourcePath);

    // Check if should exclude
    if (EXCLUDE.some(ex => relativePath === ex || relativePath.startsWith(ex + '/') || relativePath.includes('/' + ex + '/'))) {
      continue;
    }

    const stat = fs.statSync(sourcePath);

    if (stat.isDirectory()) {
      copyDirRecursive(sourcePath, targetPath, baseDir);
    } else {
      copyFileSync(sourcePath, targetPath);
    }
  }
}

async function main() {
  console.log('📦 Copying files to www/...\n');

  // Clean www directory
  if (fs.existsSync(WWW_DIR)) {
    fs.rmSync(WWW_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(WWW_DIR, { recursive: true });

  // Copy all files
  copyDirRecursive(ROOT_DIR, WWW_DIR);

  console.log('✅ www/ folder ready for deployment\n');
  const stats = fs.readdirSync(WWW_DIR);
  console.log('Files and folders in www/:', stats.length);
}

main().catch(console.error);
