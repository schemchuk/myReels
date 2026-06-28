import { spawn } from 'child_process';

export interface VideoProcessingOptions {
  inputVideoPath: string;
  musicTrackPath: string;
  outputPath: string;
  targetWidth?: number;
  targetHeight?: number;
  musicVolume?: number;
}

export function buildFfmpegArgs(options: VideoProcessingOptions): string[] {
  const width = options.targetWidth ?? 720;
  const height = options.targetHeight ?? 1280;
  const musicVolume = options.musicVolume ?? 0.15;

  const videoFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
  const audioFilter = `[1:a]volume=${musicVolume}[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[aout]`;

  return [
    '-y',
    '-i', options.inputVideoPath,
    '-i', options.musicTrackPath,
    '-filter_complex', `[0:v]${videoFilter}[vout];${audioFilter}`,
    '-map', '[vout]',
    '-map', '[aout]',
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-shortest',
    options.outputPath
  ];
}

export function runFfmpeg(args: string[], ffmpegPath = 'ffmpeg'): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args);
    let stderr = '';

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
      }
    });
  });
}

export async function processVideo(
  options: VideoProcessingOptions,
  ffmpegPath = 'ffmpeg'
): Promise<void> {
  const args = buildFfmpegArgs(options);
  await runFfmpeg(args, ffmpegPath);
}
