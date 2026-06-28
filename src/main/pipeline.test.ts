import * as os from 'os';
import { runPipeline } from './pipeline';

describe('runPipeline', () => {
  it('runs generate -> poll -> download -> duration -> subtitles -> process -> publish in order', async () => {
    const calls: string[] = [];
    const deps = {
      heygenClient: {
        generateVideo: jest.fn(async (text: string) => {
          calls.push(`generateVideo:${text}`);
          return 'vid_123';
        }),
        pollUntilComplete: jest.fn(async (videoId: string) => {
          calls.push(`pollUntilComplete:${videoId}`);
          return 'https://cdn.heygen.com/vid_123.mp4';
        }),
        downloadVideo: jest.fn(async (url: string, dest: string) => {
          calls.push(`downloadVideo:${url}->${dest}`);
        })
      },
      getVideoDuration: jest.fn(async (inputPath: string) => {
        calls.push(`getVideoDuration:${inputPath}`);
        return 8;
      }),
      prepareSubtitleAssets: jest.fn(async (text: string, duration: number) => {
        calls.push(`prepareSubtitleAssets:${text}:${duration}`);
        return { srtPath: '/tmp/subs.srt', ctaTextPath: '/tmp/cta.txt' };
      }),
      processVideo: jest.fn(async (options: any) => {
        calls.push(`processVideo:${options.inputVideoPath}->${options.outputPath}`);
      }),
      publisher: {
        publish: jest.fn(async (path: string) => {
          calls.push(`publish:${path}`);
          return '/output/vid_123-final.mp4';
        })
      },
      tempDir: os.tmpdir(),
      musicTrackPath: '/assets/music.mp3',
      reelCtaUrl: 'https://jobs.couchhelp.eu/',
      fontPath: 'C:/Windows/Fonts/arial.ttf'
    };

    const result = await runPipeline('Hello reels', deps);

    expect(result).toBe('/output/vid_123-final.mp4');
    expect(calls[0]).toBe('generateVideo:Hello reels');
    expect(calls[1]).toBe('pollUntilComplete:vid_123');
    expect(calls[2]).toContain('downloadVideo:https://cdn.heygen.com/vid_123.mp4->');
    expect(calls[3]).toContain('getVideoDuration:');
    expect(calls[4]).toBe('prepareSubtitleAssets:Hello reels:8');
    expect(calls[5]).toContain('processVideo:');
    expect(calls[6]).toContain('publish:');

    const processVideoCallArgs = deps.processVideo.mock.calls[0][0];
    expect(processVideoCallArgs.subtitlesPath).toBe('/tmp/subs.srt');
    expect(processVideoCallArgs.ctaTextFilePath).toBe('/tmp/cta.txt');
    expect(processVideoCallArgs.fontPath).toBe('C:/Windows/Fonts/arial.ttf');
  });

  it('propagates errors from any pipeline step without calling subsequent steps', async () => {
    const deps = {
      heygenClient: {
        generateVideo: jest.fn(async () => {
          throw new Error('HeyGen rejected the request');
        }),
        pollUntilComplete: jest.fn(),
        downloadVideo: jest.fn()
      },
      getVideoDuration: jest.fn(),
      prepareSubtitleAssets: jest.fn(),
      processVideo: jest.fn(),
      publisher: { publish: jest.fn() },
      tempDir: os.tmpdir(),
      musicTrackPath: '/assets/music.mp3',
      reelCtaUrl: 'https://jobs.couchhelp.eu/',
      fontPath: 'C:/Windows/Fonts/arial.ttf'
    };

    await expect(runPipeline('Hello reels', deps)).rejects.toThrow('HeyGen rejected the request');
    expect(deps.getVideoDuration).not.toHaveBeenCalled();
    expect(deps.prepareSubtitleAssets).not.toHaveBeenCalled();
    expect(deps.processVideo).not.toHaveBeenCalled();
    expect(deps.publisher.publish).not.toHaveBeenCalled();
  });
});
