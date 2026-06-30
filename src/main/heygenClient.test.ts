import nock from 'nock';
import { HeyGenClient } from './heygenClient';

const credentials = { apiKey: 'key123', avatarId: 'avatar123', voiceId: 'voice123' };
const BASE_URL = 'https://api.heygen.com';

describe('HeyGenClient', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('generateVideo returns the video_id from the response', async () => {
    nock(BASE_URL)
      .post('/v3/videos')
      .reply(200, { data: { video_id: 'vid_123' } });

    const client = new HeyGenClient(credentials);
    const videoId = await client.generateVideo('Hello world');

    expect(videoId).toBe('vid_123');
  });

  it('checkStatus returns parsed status fields', async () => {
    nock(BASE_URL)
      .get('/v3/videos/vid_123')
      .reply(200, { data: { status: 'completed', video_url: 'https://cdn.heygen.com/vid_123.mp4' } });

    const client = new HeyGenClient(credentials);
    const result = await client.checkStatus('vid_123');

    expect(result).toEqual({
      status: 'completed',
      videoUrl: 'https://cdn.heygen.com/vid_123.mp4',
      error: undefined
    });
  });

  it('pollUntilComplete resolves with the video URL once status is completed', async () => {
    nock(BASE_URL)
      .get('/v3/videos/vid_123')
      .reply(200, { data: { status: 'processing' } })
      .get('/v3/videos/vid_123')
      .reply(200, { data: { status: 'completed', video_url: 'https://cdn.heygen.com/vid_123.mp4' } });

    const client = new HeyGenClient(credentials);
    const videoUrl = await client.pollUntilComplete('vid_123', { intervalMs: 10, timeoutMs: 5000 });

    expect(videoUrl).toBe('https://cdn.heygen.com/vid_123.mp4');
  });

  it('pollUntilComplete throws when HeyGen reports failed status', async () => {
    nock(BASE_URL)
      .get('/v3/videos/vid_123')
      .reply(200, { data: { status: 'failed', failure_message: 'avatar render error' } });

    const client = new HeyGenClient(credentials);

    await expect(
      client.pollUntilComplete('vid_123', { intervalMs: 10, timeoutMs: 5000 })
    ).rejects.toThrow('HeyGen video generation failed: avatar render error');
  });

  it('pollUntilComplete throws after the timeout elapses', async () => {
    nock(BASE_URL)
      .get('/v3/videos/vid_123')
      .times(5)
      .reply(200, { data: { status: 'processing' } });

    const client = new HeyGenClient(credentials);

    await expect(
      client.pollUntilComplete('vid_123', { intervalMs: 10, timeoutMs: 30 })
    ).rejects.toThrow(/Timed out waiting for HeyGen video/);
  });

  it('downloadVideo writes the response stream to the destination path', async () => {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const destinationPath = path.join(os.tmpdir(), `heygen-test-${Date.now()}.mp4`);

    nock('https://cdn.heygen.com')
      .get('/vid_123.mp4')
      .reply(200, 'fake video bytes');

    const client = new HeyGenClient(credentials);
    await client.downloadVideo('https://cdn.heygen.com/vid_123.mp4', destinationPath);

    expect(fs.readFileSync(destinationPath, 'utf-8')).toBe('fake video bytes');
    fs.unlinkSync(destinationPath);
  });
});
