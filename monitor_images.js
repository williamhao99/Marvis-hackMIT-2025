#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const IMAGE_DIR = process.env.IMAGE_STORAGE_PATH || './captured_images';

console.log(`📸 Monitoring images in: ${IMAGE_DIR}\n`);

// Create directory if it doesn't exist
if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  console.log(`Created directory: ${IMAGE_DIR}\n`);
}

// Function to list all images
function listImages() {
  const files = fs.readdirSync(IMAGE_DIR);
  const imageFiles = files.filter(f => f.match(/\.(jpg|jpeg|png|gif|webp)$/i));
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  console.log(`\n📊 Current Status:`);
  console.log(`   Total images: ${imageFiles.length}`);
  console.log(`   Metadata files: ${jsonFiles.length}`);

  if (imageFiles.length > 0) {
    console.log(`\n📷 Recent Images:`);
    imageFiles.slice(-5).forEach(file => {
      const stats = fs.statSync(path.join(IMAGE_DIR, file));
      const jsonFile = file.replace(/\.[^.]+$/, '.json');
      const hasMetadata = jsonFiles.includes(jsonFile);

      console.log(`   - ${file} (${Math.round(stats.size / 1024)}KB) ${hasMetadata ? '✅ has metadata' : '⚠️ no metadata'}`);

      if (hasMetadata) {
        try {
          const metadata = JSON.parse(fs.readFileSync(path.join(IMAGE_DIR, jsonFile), 'utf8'));
          if (metadata.barcodeData) {
            console.log(`     🔍 Barcode: ${metadata.barcodeType} - ${metadata.barcodeData}`);
          }
          if (metadata.textDescription) {
            console.log(`     📝 Description: ${metadata.textDescription.substring(0, 100)}...`);
          }
        } catch (e) {
          console.log(`     ⚠️ Could not parse metadata`);
        }
      }
    });
  }
}

// Initial list
listImages();

// Watch for changes
console.log(`\n👀 Watching for new images... (Press Ctrl+C to stop)\n`);

fs.watch(IMAGE_DIR, (eventType, filename) => {
  if (filename && (filename.endsWith('.jpg') || filename.endsWith('.png') || filename.endsWith('.json'))) {
    console.log(`\n🆕 New file detected: ${filename}`);
    setTimeout(listImages, 500); // Small delay to ensure file is fully written
  }
});

// Handle exit
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping monitor...');
  process.exit(0);
});