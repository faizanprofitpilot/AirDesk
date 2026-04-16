/**
 * Script to create favicon from newfavicon.png with rounded corners
 * Usage: node scripts/create-favicon-from-new.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createFavicon() {
  // Check both locations
  const publicPath = path.join(__dirname, '..', 'public', 'newfavicon.png');
  const appPath = path.join(__dirname, '..', 'app', 'newfavicon.png');
  
  let sourcePath;
  if (fs.existsSync(publicPath)) {
    sourcePath = publicPath;
  } else if (fs.existsSync(appPath)) {
    sourcePath = appPath;
  } else {
    throw new Error('newfavicon.png not found in public/ or app/ directory');
  }
  
  const iconPath = path.join(__dirname, '..', 'app', 'icon.png');
  const faviconPath = path.join(__dirname, '..', 'app', 'favicon.png');
  const publicIconPath = path.join(__dirname, '..', 'public', 'icon.png');

  try {
    // Read the source image
    const sourceMetadata = await sharp(sourcePath).metadata();
    console.log('Source image found at:', sourcePath);
    console.log('Source image dimensions:', sourceMetadata.width, 'x', sourceMetadata.height);

    // Create rounded corners mask (80px radius for smooth corners)
    const size = 512; // Standard icon size
    const radius = 80; // Smooth rounded corners
    
    const roundedMask = Buffer.from(
      `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/>
      </svg>`
    );

    // Process the image: resize to 512x512, apply rounded corners
    const processedIcon = await sharp(sourcePath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }, // Transparent background
      })
      .composite([
        {
          input: roundedMask,
          blend: 'dest-in',
        },
      ])
      .png()
      .toBuffer();

    // Save as icon.png (Next.js will use this)
    await sharp(processedIcon)
      .png()
      .toFile(iconPath);

    // Save as favicon.png
    await sharp(processedIcon)
      .png()
      .toFile(faviconPath);

    // Also save to public for reference
    await sharp(processedIcon)
      .png()
      .toFile(publicIconPath);

    console.log('✅ Favicon created successfully with smooth rounded corners!');
    console.log('   - app/icon.png (512x512, rounded)');
    console.log('   - app/favicon.png (512x512, rounded)');
    console.log('   - public/icon.png (512x512, rounded)');
  } catch (error) {
    console.error('❌ Error creating favicon:', error);
    process.exit(1);
  }
}

createFavicon();
