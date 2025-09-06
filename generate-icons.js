// Icon Generation Script for Bradley's Travel Planner
// This script generates PNG icons from the SVG source

const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const iconSizes = [
    16, 32, 57, 60, 72, 76, 96, 114, 120, 128, 144, 152, 180, 192, 384, 512
];

// SVG template for generating icons
const svgTemplate = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="plane" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f8f9fa;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="256" cy="256" r="240" fill="url(#bg)" stroke="#ffffff" stroke-width="8"/>
  
  <!-- Plane body -->
  <ellipse cx="256" cy="256" rx="120" ry="40" fill="url(#plane)" transform="rotate(-15 256 256)"/>
  
  <!-- Plane wings -->
  <ellipse cx="200" cy="240" rx="80" ry="20" fill="url(#plane)" transform="rotate(-15 200 240)"/>
  <ellipse cx="312" cy="240" rx="80" ry="20" fill="url(#plane)" transform="rotate(-15 312 240)"/>
  
  <!-- Plane tail -->
  <ellipse cx="180" cy="200" rx="30" ry="60" fill="url(#plane)" transform="rotate(-15 180 200)"/>
  
  <!-- Plane nose -->
  <ellipse cx="320" cy="256" rx="25" ry="15" fill="url(#plane)" transform="rotate(-15 320 256)"/>
  
  <!-- Windows -->
  <circle cx="220" cy="250" r="8" fill="#667eea" opacity="0.7"/>
  <circle cx="250" cy="250" r="8" fill="#667eea" opacity="0.7"/>
  <circle cx="280" cy="250" r="8" fill="#667eea" opacity="0.7"/>
  
  <!-- Cloud 1 -->
  <ellipse cx="150" cy="150" rx="30" ry="15" fill="rgba(255,255,255,0.3)"/>
  <ellipse cx="170" cy="150" rx="25" ry="12" fill="rgba(255,255,255,0.3)"/>
  <ellipse cx="130" cy="150" rx="20" ry="10" fill="rgba(255,255,255,0.3)"/>
  
  <!-- Cloud 2 -->
  <ellipse cx="350" cy="350" rx="25" ry="12" fill="rgba(255,255,255,0.3)"/>
  <ellipse cx="370" cy="350" rx="20" ry="10" fill="rgba(255,255,255,0.3)"/>
  <ellipse cx="330" cy="350" rx="15" ry="8" fill="rgba(255,255,255,0.3)"/>
  
  <!-- Compass needle -->
  <circle cx="256" cy="256" r="15" fill="#ffffff" opacity="0.9"/>
  <line x1="256" y1="240" x2="256" y2="272" stroke="#667eea" stroke-width="3" stroke-linecap="round"/>
  <line x1="240" y1="256" x2="272" y2="256" stroke="#667eea" stroke-width="3" stroke-linecap="round"/>
  <circle cx="256" cy="256" r="3" fill="#667eea"/>
</svg>
`;

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG files for each size
console.log('🎨 Generating app icons...');

iconSizes.forEach(size => {
    const svgContent = svgTemplate(size);
    const filename = `icon-${size}x${size}.svg`;
    const filepath = path.join(iconsDir, filename);
    
    fs.writeFileSync(filepath, svgContent);
    console.log(`✅ Generated ${filename}`);
});

// Create a simple PNG placeholder (base64 encoded 1x1 transparent pixel)
const pngPlaceholder = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// Generate PNG placeholders
iconSizes.forEach(size => {
    const filename = `icon-${size}x${size}.png`;
    const filepath = path.join(iconsDir, filename);
    
    // For now, create a simple text file indicating the PNG should be generated
    fs.writeFileSync(filepath + '.txt', `PNG icon ${size}x${size} - Convert from icon-${size}x${size}.svg`);
    console.log(`📝 Placeholder created for ${filename}`);
});

// Create shortcut icons
const shortcutIcons = [
    { name: 'shortcut-new-trip', icon: 'fas fa-plus' },
    { name: 'shortcut-calendar', icon: 'fas fa-calendar-alt' },
    { name: 'shortcut-budget', icon: 'fas fa-calculator' }
];

shortcutIcons.forEach(shortcut => {
    const svgContent = `
<svg width="96" height="96" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <circle cx="256" cy="256" r="240" fill="url(#bg)"/>
  
  <text x="256" y="300" text-anchor="middle" font-family="FontAwesome" font-size="48" fill="white">
    ${shortcut.icon}
  </text>
</svg>
`;
    
    const filename = `${shortcut.name}.svg`;
    const filepath = path.join(iconsDir, filename);
    
    fs.writeFileSync(filepath, svgContent);
    console.log(`✅ Generated ${filename}`);
});

console.log('🎉 Icon generation complete!');
console.log('📝 Note: SVG files have been created. For production, convert them to PNG using a tool like ImageMagick or online converters.');
console.log('💡 Command to convert: magick icon-512x512.svg icon-512x512.png');
