import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { splitIntoSentences, buildSubtitleSegments, buildSrt } from './subtitles';

export interface VideoProcessingOptions {
  inputVideoPath: string;
  musicTrackPath: string;
  outputPath: string;
  subtitlesPath: string;
  ctaTextFilePath: string;
  fontPath: string;
  targetWidth?: number;
  targetHeight?: number;
  musicVolume?: number;
  qrCodePath?: string;
  videoDuration?: number;
}

function escapeFfmpegPath(rawPath: string): string {
  return rawPath.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
}

export function buildFfmpegArgs(options: VideoProcessingOptions): string[] {
  const width = options.targetWidth ?? 1080;
  const height = options.targetHeight ?? 1920;
  const musicVolume = options.musicVolume ?? 0.15;

  const scalePad = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
  const subtitles = `subtitles='${escapeFfmpegPath(options.subtitlesPath)}':force_style='FontName=Arial,FontSize=36,PrimaryColour=&Hffffff,OutlineColour=&H000000,BorderStyle=3,Alignment=2,MarginV=120,PlayResX=${width},PlayResY=${height}'`;
  const ctaDrawtext = `drawtext=fontfile='${escapeFfmpegPath(options.fontPath)}':textfile='${escapeFfmpegPath(options.ctaTextFilePath)}':fontcolor=white:fontsize=40:box=1:boxcolor=black@0.6:boxborderw=10:x=(w-text_w)/2:y=h-100`;
  const videoFilter = `${scalePad},${subtitles},${ctaDrawtext}`;
  const audioFilter = `[1:a]volume=${musicVolume}[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[aout]`;

  const hasQr = options.qrCodePath && options.videoDuration && options.videoDuration > 0;
  let videoChain: string;
  if (hasQr) {
    const start = Math.max(0, options.videoDuration! - 3);
    const end = options.videoDuration!;
    videoChain = `${videoFilter}[base];[2:v]format=rgba,scale=120:120[qr];[base][qr]overlay=W-w-24:24:enable='between(t\\,${start}\\,${end})'[vout]`;
  } else {
    videoChain = `${videoFilter}[vout]`;
  }

  return [
    '-y',
    '-i', options.inputVideoPath,
    '-i', options.musicTrackPath,
    ...(hasQr ? ['-i', options.qrCodePath!] : []),
    '-filter_complex', `[0:v]${videoChain};${audioFilter}`,
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

export function getVideoDuration(inputPath: string, ffprobePath = 'ffprobe'): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffprobePath, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      inputPath
    ]);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(parseFloat(stdout.trim()));
      } else {
        reject(new Error(`ffprobe exited with code ${code}: ${stderr}`));
      }
    });
  });
}

export async function prepareSubtitleAssets(
  text: string,
  durationSec: number,
  ctaUrl: string,
  tempDir: string
): Promise<{ srtPath: string; ctaTextPath: string }> {
  const sentences = splitIntoSentences(text);
  const segments = buildSubtitleSegments(sentences, durationSec);
  const srt = buildSrt(segments);

  const srtPath = path.join(tempDir, `subtitles-${Date.now()}.srt`);
  const ctaTextPath = path.join(tempDir, `cta-${Date.now()}.txt`);

  fs.writeFileSync(srtPath, srt, 'utf-8');
  fs.writeFileSync(ctaTextPath, ctaUrl, 'utf-8');

  return { srtPath, ctaTextPath };
}
