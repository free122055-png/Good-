const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SOURCE_LOGO = path.resolve(__dirname, '../public/almayadin_logo.jpg');

if (!fs.existsSync(SOURCE_LOGO)) {
  console.error('Source logo not found at:', SOURCE_LOGO);
  process.exit(1);
}

console.log('Generating AL MAYADIN BAZAAR official branding assets from:', SOURCE_LOGO);

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (err) {
    console.error('Command failed:', cmd, err);
    throw err;
  }
}

// 1. Generate master PNG icons
run(`convert "${SOURCE_LOGO}" -resize 512x512 "${path.resolve(__dirname, '../public/app_icon.png')}"`);
run(`convert "${SOURCE_LOGO}" -resize 1024x1024 "${path.resolve(__dirname, '../public/app_icon.jpg')}"`);

// 2. Mipmap standard and round launcher icons
const mipmaps = [
  { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
  { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
  { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
  { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
  { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
];

mipmaps.forEach(({ dir, size, fgSize }) => {
  const targetDir = path.resolve(__dirname, `../android/app/src/main/res/${dir}`);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Standard icon
  const iconPath = path.join(targetDir, 'ic_launcher.png');
  run(`convert "${SOURCE_LOGO}" -resize ${size}x${size} "${iconPath}"`);

  // Round icon (circle masked)
  const roundIconPath = path.join(targetDir, 'ic_launcher_round.png');
  const half = size / 2;
  run(`convert \\( -size ${size}x${size} xc:none -fill white -draw "circle ${half},${half} ${half},1" \\) \\( "${SOURCE_LOGO}" -resize ${size}x${size}^ -gravity center -extent ${size}x${size} \\) -compose SrcIn -composite "${roundIconPath}"`);

  // Adaptive foreground icon (centered logo with safe zone margins inside 108dp)
  const fgIconPath = path.join(targetDir, 'ic_launcher_foreground.png');
  const innerLogo = Math.round(fgSize * 0.68);
  run(`convert -size ${fgSize}x${fgSize} xc:none \\( "${SOURCE_LOGO}" -resize ${innerLogo}x${innerLogo} \\) -gravity center -composite "${fgIconPath}"`);
});

// 3. Splash Screen assets on clean white background
const splashScreens = [
  // Portrait
  { dir: 'drawable-port-mdpi', w: 320, h: 480 },
  { dir: 'drawable-port-hdpi', w: 480, h: 800 },
  { dir: 'drawable-port-xhdpi', w: 720, h: 1280 },
  { dir: 'drawable-port-xxhdpi', w: 960, h: 1600 },
  { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920 },
  // Landscape
  { dir: 'drawable-land-mdpi', w: 480, h: 320 },
  { dir: 'drawable-land-hdpi', w: 800, h: 480 },
  { dir: 'drawable-land-xhdpi', w: 1280, h: 720 },
  { dir: 'drawable-land-xxhdpi', w: 1600, h: 960 },
  { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280 },
  // Universal drawable
  { dir: 'drawable', w: 1080, h: 1920 },
];

splashScreens.forEach(({ dir, w, h }) => {
  const targetDir = path.resolve(__dirname, `../android/app/src/main/res/${dir}`);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const splashPath = path.join(targetDir, 'splash.png');
  // Sized cleanly (approx 45% of width in portrait, 45% of height in landscape)
  const logoDimension = Math.round(Math.min(w * 0.45, h * 0.35));
  run(`convert -size ${w}x${h} xc:white \\( "${SOURCE_LOGO}" -resize ${logoDimension}x${logoDimension} \\) -gravity center -composite "${splashPath}"`);
});

// 4. Android 12+ Splash Animated Icon
const splashLogoDir = path.resolve(__dirname, '../android/app/src/main/res/drawable');
const splashLogoPath = path.join(splashLogoDir, 'splash_logo.png');
run(`convert -size 512x512 xc:white \\( "${SOURCE_LOGO}" -resize 360x360 \\) -gravity center -composite "${splashLogoPath}"`);

console.log('Successfully generated all AL MAYADIN BAZAAR branding and splash assets!');
