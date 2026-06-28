import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { buildFfmpegArgs, runFfmpeg } from './videoProcessor';

jest.mock('child_process');

describe('buildFfmpegArgs', () => {
  it('builds args that scale/pad to the target dimensions and mix in background music', () => {
    const args = buildFfmpegArgs({
      inputVideoPath: 'raw.mp4',
      musicTrackPath: 'music.mp3',
      outputPath: 'final.mp4'
    });

    expect(args).toEqual([
      '-y',
      '-i', 'raw.mp4',
      '-i', 'music.mp3',
      '-filter_complex',
      '[0:v]scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2[vout];[1:a]volume=0.15[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[aout]',
      '-map', '[vout]',
      '-map', '[aout]',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-shortest',
      'final.mp4'
    ]);
  });

  it('respects custom dimensions and music volume', () => {
    const args = buildFfmpegArgs({
      inputVideoPath: 'raw.mp4',
      musicTrackPath: 'music.mp3',
      outputPath: 'final.mp4',
      targetWidth: 1080,
      targetHeight: 1920,
      musicVolume: 0.3
    });

    expect(args).toContain(
      '[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2[vout];[1:a]volume=0.3[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[aout]'
    );
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
