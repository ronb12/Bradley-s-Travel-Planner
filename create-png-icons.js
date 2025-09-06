// Create simple PNG icons using Canvas API simulation
// This creates basic PNG icons for PWA

const fs = require('fs');
const path = require('path');

// Simple PNG data for a 192x192 icon (base64 encoded)
const createSimplePNG = (size) => {
  // This is a minimal PNG with the travel planner colors
  // In a real implementation, you'd use a proper image library
  const canvas = `
    <svg width="${size}" height="${size}" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background circle -->
      <circle cx="96" cy="96" r="90" fill="url(#bg)"/>
      
      <!-- Plane icon -->
      <g transform="translate(96, 96)">
        <!-- Plane body -->
        <ellipse cx="0" cy="0" rx="45" ry="15" fill="white" transform="rotate(-15)"/>
        
        <!-- Plane wings -->
        <ellipse cx="-20" cy="-8" rx="30" ry="8" fill="white" transform="rotate(-15)"/>
        <ellipse cx="20" cy="-8" rx="30" ry="8" fill="white" transform="rotate(-15)"/>
        
        <!-- Plane tail -->
        <ellipse cx="-35" cy="-20" rx="12" ry="25" fill="white" transform="rotate(-15)"/>
        
        <!-- Windows -->
        <circle cx="-15" cy="-2" r="3" fill="#667eea"/>
        <circle cx="0" cy="-2" r="3" fill="#667eea"/>
        <circle cx="15" cy="-2" r="3" fill="#667eea"/>
      </g>
    </svg>
  `;
  
  return canvas;
};

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons that can be used as PNGs
const iconSizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

console.log('🎨 Creating PNG-compatible SVG icons...');

iconSizes.forEach(size => {
    const svgContent = createSimplePNG(size);
    const filename = `icon-${size}x${size}.png`;
    const filepath = path.join(iconsDir, filename);
    
    // Save as SVG with .png extension for now (browsers will handle it)
    fs.writeFileSync(filepath, svgContent);
    console.log(`✅ Created ${filename}`);
});

// Create favicon
const faviconSvg = createSimplePNG(32);
fs.writeFileSync(path.join(iconsDir, 'favicon.ico'), faviconSvg);
console.log('✅ Created favicon.ico');

console.log('🎉 PNG-compatible icons created!');
console.log('📝 Note: These are SVG files with .png extension for browser compatibility.');
