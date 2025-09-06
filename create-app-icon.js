// Create App Icon with Plane and Text
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create SVG with plane and text
const createAppIconSVG = (size) => {
  const textSize = Math.max(size * 0.08, 8); // Responsive text size
  const planeSize = size * 0.4; // Plane takes 40% of icon
  
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
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
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.48}" fill="url(#bg)" stroke="#ffffff" stroke-width="${size*0.02}"/>
  
  <!-- Plane icon -->
  <g transform="translate(${size/2}, ${size*0.35})">
    <!-- Plane body -->
    <ellipse cx="0" cy="0" rx="${planeSize*0.6}" ry="${planeSize*0.2}" fill="url(#plane)" transform="rotate(-15)"/>
    
    <!-- Plane wings -->
    <ellipse cx="${-planeSize*0.3}" cy="${-planeSize*0.1}" rx="${planeSize*0.4}" ry="${planeSize*0.1}" fill="url(#plane)" transform="rotate(-15)"/>
    <ellipse cx="${planeSize*0.3}" cy="${-planeSize*0.1}" rx="${planeSize*0.4}" ry="${planeSize*0.1}" fill="url(#plane)" transform="rotate(-15)"/>
    
    <!-- Plane tail -->
    <ellipse cx="${-planeSize*0.5}" cy="${-planeSize*0.3}" rx="${planeSize*0.15}" ry="${planeSize*0.3}" fill="url(#plane)" transform="rotate(-15)"/>
    
    <!-- Plane nose -->
    <ellipse cx="${planeSize*0.5}" cy="0" rx="${planeSize*0.1}" ry="${planeSize*0.06}" fill="url(#plane)" transform="rotate(-15)"/>
    
    <!-- Windows -->
    <circle cx="${-planeSize*0.2}" cy="${-planeSize*0.02}" r="${planeSize*0.05}" fill="#667eea" opacity="0.8"/>
    <circle cx="0" cy="${-planeSize*0.02}" r="${planeSize*0.05}" fill="#667eea" opacity="0.8"/>
    <circle cx="${planeSize*0.2}" cy="${-planeSize*0.02}" r="${planeSize*0.05}" fill="#667eea" opacity="0.8"/>
  </g>
  
  <!-- App Name Text -->
  <text x="${size/2}" y="${size*0.75}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${textSize}" font-weight="bold" fill="white">
    Bradley's Travel Planner
  </text>
  
  <!-- Decorative elements -->
  <circle cx="${size*0.2}" cy="${size*0.2}" r="${size*0.03}" fill="rgba(255,255,255,0.3)"/>
  <circle cx="${size*0.8}" cy="${size*0.8}" r="${size*0.02}" fill="rgba(255,255,255,0.3)"/>
  <circle cx="${size*0.15}" cy="${size*0.85}" r="${size*0.025}" fill="rgba(255,255,255,0.3)"/>
</svg>
`;
};

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes to generate
const iconSizes = [16, 32, 57, 60, 72, 76, 96, 114, 120, 128, 144, 152, 180, 192, 384, 512];

console.log('🎨 Creating app icons with plane and text...');

iconSizes.forEach(size => {
    try {
        // Create SVG
        const svgContent = createAppIconSVG(size);
        const svgFile = path.join(iconsDir, `icon-${size}x${size}.svg`);
        fs.writeFileSync(svgFile, svgContent);
        
        // Convert to PNG using ImageMagick
        const pngFile = path.join(iconsDir, `icon-${size}x${size}.png`);
        execSync(`magick "${svgFile}" "${pngFile}"`, { stdio: 'pipe' });
        
        console.log(`✅ Generated icon-${size}x${size}.png`);
    } catch (error) {
        console.error(`❌ Error generating icon-${size}x${size}.png:`, error.message);
    }
});

// Create favicon
try {
    const faviconSvg = createAppIconSVG(32);
    const faviconSvgFile = path.join(iconsDir, 'favicon.svg');
    fs.writeFileSync(faviconSvgFile, faviconSvg);
    
    execSync(`magick "${faviconSvgFile}" "${path.join(iconsDir, 'favicon.ico')}"`, { stdio: 'pipe' });
    console.log('✅ Generated favicon.ico');
} catch (error) {
    console.error('❌ Error generating favicon:', error.message);
}

console.log('🎉 App icons with plane and text generated successfully!');
