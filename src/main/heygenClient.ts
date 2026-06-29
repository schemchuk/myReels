import axios, { AxiosError } from 'axios';
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

function formatHeyGenError(responseBody: unknown): string {
  if (responseBody && typeof responseBody === 'object') {
    const err = responseBody as { code?: string; message?: string };
    if (err.code === 'MOVIO_PAYMENT_INSUFFICIENT_CREDIT') {
      return 'Insufficient HeyGen credits. Top up your account at https://app.heygen.com/';
    }
    if (err.code === 'invalid_parameter') {
      return `Invalid HeyGen parameter: ${err.message ?? JSON.stringify(responseBody, null, 2)}`;
    }
    return JSON.stringify(responseBody, null, 2);
  }
  return String(responseBody ?? 'unknown error');
}

export class HeyGenClient {
  constructor(private credentials: HeyGenCredentials) {}

  async generateVideo(text: string): Promise<string> {
    try {
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
    } catch (error) {
      const axiosError = error as AxiosError;
      const responseBody = axiosError.response?.data;
      throw new Error(`HeyGen video generation failed: ${formatHeyGenError(responseBody ?? axiosError.message)}`);
    }
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
        throw new Error(`HeyGen video generation failed: ${formatHeyGenError(result.error)}`);
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
