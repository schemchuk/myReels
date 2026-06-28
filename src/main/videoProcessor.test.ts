import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { buildFfmpegArgs, runFfmpeg } from './videoProcessor';

jest.mock('child_process');

describe('buildFfmpegArgs', () => {
  it('builds args that scale/pad, mix music, burn subtitles, and draw the CTA bar', () => {
    const args = buildFfmpegArgs({
      inputVideoPath: 'raw.mp4',
      musicTrackPath: 'music.mp3',
      outputPath: 'final.mp4',
      subtitlesPath: 'C:/tmp/subs.srt',
      ctaTextFilePath: 'C:/tmp/cta.txt',
      fontPath: 'C:/Windows/Fonts/arial.ttf'
    });

    expect(args).toEqual([
      '-y',
      '-i', 'raw.mp4',
      '-i', 'music.mp3',
      '-filter_complex',
      "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2," +
        "subtitles='C\\:/tmp/subs.srt':force_style='FontName=Arial,FontSize=36,PrimaryColour=&Hffffff,OutlineColour=&H000000,BorderStyle=3,Alignment=2,MarginV=120,PlayResX=1080,PlayResY=1920'," +
        "drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':textfile='C\\:/tmp/cta.txt':fontcolor=white:fontsize=40:box=1:boxcolor=black@0.6:boxborderw=10:x=(w-text_w)/2:y=h-100[vout];" +
        '[1:a]volume=0.15[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[aout]',
      '-map', '[vout]',
      '-map', '[aout]',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-shortest',
      'final.mp4'
    ]);
  });

  it('respects custom dimensions and music volume while still adding subtitles and CTA', () => {
    const args = buildFfmpegArgs({
      inputVideoPath: 'raw.mp4',
      musicTrackPath: 'music.mp3',
      outputPath: 'final.mp4',
      targetWidth: 1080,
      targetHeight: 1920,
      musicVolume: 0.3,
      subtitlesPath: 'subs.srt',
      ctaTextFilePath: 'cta.txt',
      fontPath: 'arial.ttf'
    });

    const filterComplex = args[args.indexOf('-filter_complex') + 1];
    expect(filterComplex).toContain('scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2');
    expect(filterComplex).toContain("subtitles='subs.srt'");
    expect(filterComplex).toContain("textfile='cta.txt'");
    expect(filterComplex).toContain('[1:a]volume=0.3[bg]');
  });

  it('adds a QR code overlay in the last 3 seconds when qrCodePath and videoDuration are provided', () => {
    const args = buildFfmpegArgs({
      inputVideoPath: 'raw.mp4',
      musicTrackPath: 'music.mp3',
      outputPath: 'final.mp4',
      subtitlesPath: 'subs.srt',
      ctaTextFilePath: 'cta.txt',
      fontPath: 'arial.ttf',
      qrCodePath: 'qr.png',
      videoDuration: 15
    });

    expect(args).toContain('-i');
    expect(args).toContain('qr.png');

    const filterComplex = args[args.indexOf('-filter_complex') + 1];
    expect(filterComplex).toContain('[2:v]');
    expect(filterComplex).toContain("overlay=W-w-24:24:enable='between(t\\,12\\,15)'");
  });
});

describe('runFfmpeg', () => {
  it('resolves when ffmpeg exits with code 0', async () => {
    const fakeProc: any = new EventEmitter();
    fakeProc.stderr = new EventEmitter();
    (spawn as jest.Mock).mockReturnValue(fakeProc);

    const promise = runFfmpeg(['-version']);
    fakeProc.emit('close', 0);

    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects with stderr output when ffmpeg exits with a non-zero code', async () => {
    const fakeProc: any = new EventEmitter();
    fakeProc.stderr = new EventEmitter();
    (spawn as jest.Mock).mockReturnValue(fakeProc);

    const promise = runFfmpeg(['-bad-flag']);
    fakeProc.stderr.emit('data', Buffer.from('unrecognized option'));
    fakeProc.emit('close', 1);

    await expect(promise).rejects.toThrow('ffmpeg exited with code 1: unrecognized option');
  });
});

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getVideoDuration, prepareSubtitleAssets } from './videoProcessor';

describe('getVideoDuration', () => {
  it('parses the duration printed by ffprobe', async () => {
    const fakeProc: any = new EventEmitter();
    fakeProc.stdout = new EventEmitter();
    fakeProc.stderr = new EventEmitter();
    (spawn as jest.Mock).mockReturnValue(fakeProc);

    const promise = getVideoDuration('raw.mp4');
    fakeProc.stdout.emit('data', Buffer.from('12.345000\n'));
    fakeProc.emit('close', 0);

    await expect(promise).resolves.toBeCloseTo(12.345, 3);
  });

  it('rejects when ffprobe exits with a non-zero code', async () => {
    const fakeProc: any = new EventEmitter();
    fakeProc.stdout = new EventEmitter();
    fakeProc.stderr = new EventEmitter();
    (spawn as jest.Mock).mockReturnValue(fakeProc);

    const promise = getVideoDuration('raw.mp4');
    fakeProc.stderr.emit('data', Buffer.from('no such file'));
    fakeProc.emit('close', 1);

    await expect(promise).rejects.toThrow('ffprobe exited with code 1: no such file');
  });
});

describe('prepareSubtitleAssets', () => {
  it('writes an .srt file and a CTA text file into tempDir', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heygen-subs-'));

    const result = await prepareSubtitleAssets(
      'Перше речення. Друге речення.',
      6,
      'https://jobs.couchhelp.eu/',
      tempDir
    );

    expect(fs.existsSync(result.srtPath)).toBe(true);
    expect(fs.existsSync(result.ctaTextPath)).toBe(true);
    expect(fs.readFileSync(result.srtPath, 'utf-8')).toContain('Перше речення.');
    expect(fs.readFileSync(result.ctaTextPath, 'utf-8')).toBe('https://jobs.couchhelp.eu/');
  });
});
