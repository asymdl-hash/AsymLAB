const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = path.join(__dirname, '../public/icons/icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

// Criar SVG com fundo sólido (PNG não suporta SVG fonts bem)
const createIconSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#0f172a"/>
  <text x="256" y="340" font-family="Arial, sans-serif" font-size="220" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">AL</text>
</svg>
`;

async function generateIcons() {
    console.log('🎨 Generating PWA icons...\n');

    for (const size of sizes) {
        try {
            const svgBuffer = Buffer.from(createIconSVG(size));
            const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

            await sharp(svgBuffer)
                .resize(size, size)
                .png()
                .toFile(outputPath);

            console.log(`✅ Generated: icon-${size}x${size}.png`);
        } catch (error) {
            console.error(`❌ Error generating icon-${size}x${size}.png:`, error.message);
        }
    }

    console.log('\n🎉 All icons generated successfully!');
}

generateIcons().catch(console.error);
