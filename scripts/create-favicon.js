/**
 * Script to create favicon from logo icon
 * Extracts just the icon part (left side) and adds rounded corners
 * Usage: node scripts/create-favicon.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createFavicon() {
  const logoPath = path.join(__dirname, '..', 'public', 'logo.png');
  const iconPath = path.join(__dirname, '..', 'app', 'icon.png');
  const publicIconPath = path.join(__dirname, '..', 'public', 'icon.png');
  const faviconPath = path.join(__dirname, '..', 'app', 'favicon.ico');

  try {
    // Read the logo image to get dimensions
    const logoMetadata = await sharp(logoPath).metadata();
    console.log('Logo dimensions:', logoMetadata.width, 'x', logoMetadata.height);

    // The icon is typically on the left side of the logo
    // We'll extract a square from the left side (assuming icon is roughly square)
    // Adjust these values based on your logo layout
    const iconSize = Math.min(logoMetadata.width, logoMetadata.height);
    const iconWidth = iconSize;
    const iconHeight = iconSize;

    console.log('Extracting icon:', iconWidth, 'x', iconHeight);

    // Extract the icon (left side of logo)
    const iconBuffer = await sharp(logoPath)
      .extract({
        left: 0,
        top: 0,
        width: iconWidth,
        height: iconHeight,
      })
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }, // Transparent background
      })
      .png()
      .toBuffer();

    // Create rounded corners mask (80px radius for smooth corners)
    const roundedMask = Buffer.from(
      `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
        <rect width="512" height="512" rx="80" ry="80" fill="white"/>
      </svg>`
    );

    // Apply rounded corners using the mask
    const finalIcon = await sharp(iconBuffer)
      .composite([
        {
          input: roundedMask,
          blend: 'dest-in',
        },
      ])
      .png()
      .toBuffer();

    // Save as icon.png (Next.js will use this)
    await sharp(finalIcon)
      .resize(512, 512)
      .png()
      .toFile(iconPath);

    // Also save to public for reference
    await sharp(finalIcon)
      .resize(512, 512)
      .png()
      .toFile(publicIconPath);

    // Create favicon.ico (multiple sizes)
    const faviconSizes = [16, 32, 48];
    const faviconImages = await Promise.all(
      faviconSizes.map(size =>
        sharp(finalIcon)
          .resize(size, size)
          .png()
          .toBuffer()
      )
    );

    // For now, save the 32x32 as favicon.ico
    // Note: Creating a proper .ico file requires additional libraries
    // This creates a PNG that works for most browsers
    await sharp(faviconImages[1]) // 32x32
      .toFile(faviconPath.replace('.ico', '.png'));

    // Copy the PNG as favicon.ico (browsers will accept it)
    fs.copyFileSync(
      faviconPath.replace('.ico', '.png'),
      faviconPath
    );

    console.log('✅ Favicon created successfully!');
    console.log('   - app/icon.png (512x512)');
    console.log('   - public/icon.png (512x512)');
    console.log('   - app/favicon.ico (32x32)');
  } catch (error) {
    console.error('❌ Error creating favicon:', error);
    process.exit(1);
  }
}

createFavicon();
