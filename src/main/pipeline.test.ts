import * as os from 'os';
import { runPipeline } from './pipeline';

describe('runPipeline', () => {
  it('runs generate -> poll -> download -> process -> publish in order and returns the published path', async () => {
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
      musicTrackPath: '/assets/music.mp3'
    };

    const result = await runPipeline('Hello reels', deps);

    expect(result).toBe('/output/vid_123-final.mp4');
    expect(calls[0]).toBe('generateVideo:Hello reels');
    expect(calls[1]).toBe('pollUntilComplete:vid_123');
    expect(calls[2]).toContain('downloadVideo:https://cdn.heygen.com/vid_123.mp4->');
    expect(calls[3]).toContain('processVideo:');
    expect(calls[4]).toContain('publish:');
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
      processVideo: jest.fn(),
      publisher: { publish: jest.fn() },
      tempDir: os.tmpdir(),
      musicTrackPath: '/assets/music.mp3'
    };

    await expect(runPipeline('Hello reels', deps)).rejects.toThrow('HeyGen rejected the request');
    expect(deps.processVideo).not.toHaveBeenCalled();
    expect(deps.publisher.publish).not.toHaveBeenCalled();
  });
});
