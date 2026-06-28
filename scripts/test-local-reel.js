const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { prepareSubtitleAssets } = require('../dist/main/videoProcessor');
const { processVideo } = require('../dist/main/videoProcessor');

const outputDir = path.join(__dirname, '..', 'output');
const tempDir = path.join(outputDir, 'test-local-reel-temp');

fs.mkdirSync(tempDir, { recursive: true });

const rawPath = path.join(tempDir, 'raw.mp4');
const finalPath = path.join(outputDir, 'test-local-reel.mp4');
const qrPath = path.join(__dirname, '..', 'landing', 'qr-code.png');

const text = 'Без очей. У 56 років сів вчити Java.';
const duration = 10;
const ctaUrl = 'https://jobs.couchhelp.eu/';

function createRawVideo() {
  return new Promise((resolve, reject) => {
    // Simulate a horizontal HeyGen video that gets padded to 9:16
    const proc = spawn('ffmpeg', [
      '-f', 'lavfi', '-i', `testsrc=duration=${duration}:size=1920x1080:rate=30`,
      '-f', 'lavfi', '-i', `sine=frequency=1000:duration=${duration}`,
      '-pix_fmt', 'yuv420p',
      rawPath,
      '-y'
    ]);
    proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`)));
  });
}

async function main() {
  await createRawVideo();

  const { srtPath, ctaTextPath } = await prepareSubtitleAssets(text, duration, ctaUrl, tempDir);

  console.log('SRT path:', srtPath);
  console.log('SRT content:');
  console.log(fs.readFileSync(srtPath, 'utf-8'));

  await processVideo({
    inputVideoPath: rawPath,
    musicTrackPath: rawPath,
    outputPath: finalPath,
    subtitlesPath: srtPath,
    ctaTextFilePath: ctaTextPath,
    fontPath: 'C:/Windows/Fonts/arial.ttf',
    qrCodePath: qrPath,
    videoDuration: duration,
    targetWidth: 1080,
    targetHeight: 1920
  });

  console.log('\n✅ Test reel created:');
  console.log(finalPath);
  console.log('\nOpen it and check:');
  console.log('- 9:16 format (1080x1920)');
  console.log('- Subtitles at the bottom, not covering the face');
  console.log('- CTA bar at the bottom');
  console.log('- QR code in top-right corner during last 3 seconds');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
