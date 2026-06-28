const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { processVideo } = require('../dist/main/videoProcessor');

const outputDir = path.join(__dirname, '..', 'output');
const tempDir = path.join(outputDir, 'test-qr-temp');

fs.mkdirSync(tempDir, { recursive: true });

const rawPath = path.join(tempDir, 'raw.mp4');
const srtPath = path.join(tempDir, 'subtitles.srt');
const ctaPath = path.join(tempDir, 'cta.txt');
const finalPath = path.join(outputDir, 'test-qr-overlay.mp4');
const qrPath = path.join(__dirname, '..', 'landing', 'qr-code.png');

function createRawVideo() {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', [
      '-f', 'lavfi', '-i', 'testsrc=duration=5:size=720x1280:rate=30',
      '-f', 'lavfi', '-i', 'sine=frequency=1000:duration=5',
      '-pix_fmt', 'yuv420p',
      rawPath,
      '-y'
    ]);
    proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`)));
  });
}

async function main() {
  await createRawVideo();

  fs.writeFileSync(srtPath, '1\n00:00:00,000 --> 00:00:03,000\nTest subtitle\n\n');
  fs.writeFileSync(ctaPath, 'https://jobs.couchhelp.eu/');

  await processVideo({
    inputVideoPath: rawPath,
    musicTrackPath: rawPath,
    outputPath: finalPath,
    subtitlesPath: srtPath,
    ctaTextFilePath: ctaPath,
    fontPath: 'C:/Windows/Fonts/arial.ttf',
    qrCodePath: qrPath,
    videoDuration: 5
  });

  console.log('\n✅ Test video created:');
  console.log(finalPath);
  console.log('\nOpen it in a video player and check the QR code in the top-right corner during the last 3 seconds.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
