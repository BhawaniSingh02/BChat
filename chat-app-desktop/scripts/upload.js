/**
 * upload.js — uploads built installers to Cloudflare R2 via wrangler
 *
 * Usage (called automatically by release:* scripts):
 *   node scripts/upload.js win
 *   node scripts/upload.js mac
 *   node scripts/upload.js linux
 *
 * Requires:
 *   - wrangler installed globally: npm install -g wrangler
 *   - wrangler logged in: wrangler login
 *   - R2 bucket name set in CLOUDFLARE_R2_BUCKET env var (or defaults below)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pkg = require('../package.json');
const VERSION = pkg.version;
const BUCKET = process.env.CLOUDFLARE_R2_BUCKET || 'baaat-releases';
const DIST = path.join(__dirname, '..', 'dist');

// Map of platform → file patterns to upload
const PLATFORM_FILES = {
  win: [
    { pattern: /Baaat Setup.*\.exe$/, dest: `releases/latest/Baaat-Setup-${VERSION}.exe` },
    { pattern: /latest\.yml$/, dest: 'releases/latest/latest.yml' },
  ],
  mac: [
    { pattern: /Baaat.*\.dmg$/, dest: `releases/latest/Baaat-${VERSION}.dmg` },
    { pattern: /latest-mac\.yml$/, dest: 'releases/latest/latest-mac.yml' },
  ],
  linux: [
    { pattern: /Baaat.*\.AppImage$/, dest: `releases/latest/Baaat-${VERSION}.AppImage` },
    { pattern: /latest-linux\.yml$/, dest: 'releases/latest/latest-linux.yml' },
  ],
};

const platform = process.argv[2];
if (!platform || !PLATFORM_FILES[platform]) {
  console.error('Usage: node scripts/upload.js [win|mac|linux]');
  process.exit(1);
}

const files = fs.readdirSync(DIST);
const targets = PLATFORM_FILES[platform];
let uploaded = 0;

for (const { pattern, dest } of targets) {
  const match = files.find(f => pattern.test(f));
  if (!match) {
    console.warn(`  ⚠  No file matching ${pattern} found in dist/ — skipping`);
    continue;
  }

  const src = path.join(DIST, match);
  console.log(`  ↑  Uploading ${match} → r2://${BUCKET}/${dest}`);

  try {
    execSync(
      `wrangler r2 object put "${BUCKET}/${dest}" --file="${src}"`,
      { stdio: 'inherit' }
    );
    uploaded++;
  } catch (err) {
    console.error(`  ✗  Upload failed for ${match}:`, err.message);
    process.exit(1);
  }
}

console.log(`\n  ✓  Uploaded ${uploaded} file(s) to R2`);
console.log(`  ✓  Download URL: https://downloads.baaat.app/releases/latest/`);
