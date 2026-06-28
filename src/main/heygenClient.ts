import axios from 'axios';
import * as fs from 'fs';

export interface HeyGenCredentials {
  apiKey: string;
  avatarId: string;
  voiceId: string;
}

export type HeyGenVideoStatus = 'processing' | 'completed' | 'failed';

export interface HeyGenStatusResult {
  status: HeyGenVideoStatus;
  videoUrl?: string;
  error?: string;
}

const BASE_URL = 'https://api.heygen.com';

export class HeyGenClient {
  constructor(private credentials: HeyGenCredentials) {}

  async generateVideo(text: string): Promise<string> {
    const response = await axios.post(
      `${BASE_URL}/v2/video/generate`,
      {
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: this.credentials.avatarId,
              avatar_style: 'normal'
            },
            voice: {
              type: 'text',
              input_text: text,
              voice_id: this.credentials.voiceId
            }
          }
        ],
        dimension: { width: 720, height: 1280 }
      },
      { headers: { 'X-Api-Key': this.credentials.apiKey } }
    );
    return response.data.data.video_id;
  }

  async checkStatus(videoId: string): Promise<HeyGenStatusResult> {
    const response = await axios.get(`${BASE_URL}/v1/video_status.get`, {
      params: { video_id: videoId },
      headers: { 'X-Api-Key': this.credentials.apiKey }
    });
    const data = response.data.data;
    return {
      status: data.status,
      videoUrl: data.video_url,
      error: data.error
    };
  }

  async pollUntilComplete(
    videoId: string,
    options: { intervalMs?: number; timeoutMs?: number } = {}
  ): Promise<string> {
    const intervalMs = options.intervalMs ?? 5000;
    const timeoutMs = options.timeoutMs ?? 5 * 60 * 1000;
    const startedAt = Date.now();

    while (true) {
      const result = await this.checkStatus(videoId);

      if (result.status === 'completed') {
        if (!result.videoUrl) {
          throw new Error('HeyGen reported completed status without a video URL');
        }
        return result.videoUrl;
      }

      if (result.status === 'failed') {
        throw new Error(`HeyGen video generation failed: ${result.error ?? 'unknown error'}`);
      }

      if (Date.now() - startedAt > timeoutMs) {
        throw new Error(`Timed out waiting for HeyGen video ${videoId} after ${timeoutMs}ms`);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  async downloadVideo(videoUrl: string, destinationPath: string): Promise<void> {
    const response = await axios.get(videoUrl, { responseType: 'stream' });
    await new Promise<void>((resolve, reject) => {
      const writer = fs.createWriteStream(destinationPath);
      response.data.pipe(writer);
      writer.on('finish', () => resolve());
      writer.on('error', reject);
    });
  }
}
