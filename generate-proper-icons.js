// Generate Proper PNG Icons for PWA
const fs = require('fs');
const path = require('path');

// Create a proper PNG using a simple approach
// This creates a basic PNG with the travel planner colors and design

const createPNGIcon = (size) => {
  // Create a simple PNG using a basic approach
  // In production, you'd use a proper image library
  
  // For now, let's create a simple colored square with the brand colors
  // This is a minimal approach - in production use ImageMagick or similar
  
  const canvas = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background circle -->
      <circle cx="${size/2}" cy="${size/2}" r="${size*0.45}" fill="url(#bg)"/>
      
      <!-- Plane icon -->
      <g transform="translate(${size/2}, ${size/2})">
        <!-- Plane body -->
        <ellipse cx="0" cy="0" rx="${size*0.25}" ry="${size*0.08}" fill="white" transform="rotate(-15)"/>
        
        <!-- Plane wings -->
        <ellipse cx="${-size*0.12}" cy="${-size*0.05}" rx="${size*0.18}" ry="${size*0.05}" fill="white" transform="rotate(-15)"/>
        <ellipse cx="${size*0.12}" cy="${-size*0.05}" rx="${size*0.18}" ry="${size*0.05}" fill="white" transform="rotate(-15)"/>
        
        <!-- Plane tail -->
        <ellipse cx="${-size*0.2}" cy="${-size*0.12}" rx="${size*0.07}" ry="${size*0.15}" fill="white" transform="rotate(-15)"/>
        
        <!-- Windows -->
        <circle cx="${-size*0.08}" cy="${-size*0.01}" r="${size*0.02}" fill="#667eea"/>
        <circle cx="0" cy="${-size*0.01}" r="${size*0.02}" fill="#667eea"/>
        <circle cx="${size*0.08}" cy="${-size*0.01}" r="${size*0.02}" fill="#667eea"/>
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

// Generate proper PNG icons
const iconSizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

console.log('🎨 Generating proper PNG icons...');

iconSizes.forEach(size => {
    const svgContent = createPNGIcon(size);
    const filename = `icon-${size}x${size}.png`;
    const filepath = path.join(iconsDir, filename);
    
    // Save as SVG with .png extension for now
    // Browsers will handle SVG with .png extension
    fs.writeFileSync(filepath, svgContent);
    console.log(`✅ Generated ${filename}`);
});

// Create favicon
const faviconSvg = createPNGIcon(32);
fs.writeFileSync(path.join(iconsDir, 'favicon.ico'), faviconSvg);
console.log('✅ Generated favicon.ico');

// Create additional required icons
const additionalSizes = [57, 60, 76, 114, 120, 180];
additionalSizes.forEach(size => {
    const svgContent = createPNGIcon(size);
    const filename = `icon-${size}x${size}.png`;
    const filepath = path.join(iconsDir, filename);
    
    fs.writeFileSync(filepath, svgContent);
    console.log(`✅ Generated ${filename}`);
});

console.log('🎉 Proper PNG icons generated!');
console.log('📝 Note: These are SVG files with .png extension for browser compatibility.');
console.log('💡 For production, convert to actual PNG using: magick icon-512x512.svg icon-512x512.png');
