const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function createZip(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`Created ${outputPath} (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function buildExtensions() {
  const distDir = path.resolve(__dirname, '../dist');
  const chromeDir = path.resolve(__dirname, '../dist-chrome');
  const firefoxDir = path.resolve(__dirname, '../dist-firefox');
  
  // Clean up previous builds
  if (fs.existsSync(chromeDir)) {
    fs.rmSync(chromeDir, { recursive: true });
  }
  if (fs.existsSync(firefoxDir)) {
    fs.rmSync(firefoxDir, { recursive: true });
  }

  // Create directories
  fs.mkdirSync(chromeDir, { recursive: true });
  fs.mkdirSync(firefoxDir, { recursive: true });

  // Copy dist to both directories
  fs.cpSync(distDir, chromeDir, { recursive: true });
  fs.cpSync(distDir, firefoxDir, { recursive: true });

  // Use appropriate manifest for each browser
  // Chrome: use the default manifest.json (already copied by webpack)
  
  // Firefox: use the firefox manifest
  const firefoxManifest = path.join(firefoxDir, 'manifest-firefox.json');
  const firefoxTarget = path.join(firefoxDir, 'manifest.json');
  
  if (fs.existsSync(firefoxManifest)) {
    fs.copyFileSync(firefoxManifest, firefoxTarget);
    fs.unlinkSync(firefoxManifest); // Remove the firefox-specific file
  }
  
  // Remove chrome-specific manifest from firefox build
  const chromeManifestInFirefox = path.join(chromeDir, 'manifest-firefox.json');
  if (fs.existsSync(chromeManifestInFirefox)) {
    fs.unlinkSync(chromeManifestInFirefox);
  }

  // Create zip packages
  await createZip(chromeDir, path.resolve(__dirname, '../wakatime-shadertoy-chrome.zip'));
  await createZip(firefoxDir, path.resolve(__dirname, '../wakatime-shadertoy-firefox.zip'));

  console.log('Extension packages created successfully!');
}

buildExtensions().catch(console.error);
