# HeyGen Reels Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop app (Electron + Node/TS) where the user types text, the app generates a HeyGen avatar video, mixes in background music and normalizes it to 9:16, and saves the final Reel locally.

**Architecture:** A thin Electron main process wires together four independent, unit-testable Node modules — `HeyGenClient` (HeyGen API), `videoProcessor` (ffmpeg), `LocalSavePublisher` (implements a `Publisher` interface), and `runPipeline` (orchestrates the four in order) — to a single-page renderer UI (textarea + button + status log) via IPC.

**Tech Stack:** TypeScript, Electron, axios (HeyGen HTTP calls), ffmpeg (external binary, invoked via `child_process.spawn`), Jest + ts-jest + nock (tests), dotenv (`.env` config).

## Global Constraints

- Single active HeyGen profile only, read from `.env` (`HEYGEN_API_KEY`, `HEYGEN_AVATAR_ID`, `HEYGEN_VOICE_ID`, `OUTPUT_DIR`, `MUSIC_TRACK_PATH`). No in-UI multi-profile switching in this iteration.
- No subtitles in this iteration.
- Output saved to a local folder only. The `Publisher` interface must allow adding an `InstagramPublisher` later without changing `runPipeline` or any other module.
- Output video must be 9:16 with a background music track mixed under the HeyGen voice track at low volume.
- `avatar_id`/`voice_id` are scoped to the HeyGen account that created them — switching HeyGen accounts later is a `.env` edit, not a code change, and only works if the persona already exists in that account.
- **Git workflow:** commit locally after every task using the exact commit message given in that task's final step. Do **not** run `git push` — the user reviews and pushes.

---

## File Structure

```
package.json
tsconfig.json
jest.config.js
.env.example
.gitignore
README.md
src/
  main/
    config.ts
    config.test.ts
    heygenClient.ts
    heygenClient.test.ts
    videoProcessor.ts
    videoProcessor.test.ts
    publisher.ts
    publisher.test.ts
    pipeline.ts
    pipeline.test.ts
    index.ts
  renderer/
    preload.ts
    index.html
    renderer.ts
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `jest.config.js`
- Create: `.env.example`
- Create: `.gitignore`

**Interfaces:**
- Produces: npm scripts `build`, `start`, `test`; TypeScript config compiling `src/**` to `dist/**`; Jest configured to run `**/*.test.ts` via ts-jest.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "heygen-reels-generator",
  "version": "0.1.0",
  "private": true,
  "main": "dist/main/index.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "npm run build && electron .",
    "test": "jest"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^20.11.0",
    "electron": "^30.0.0",
    "jest": "^29.7.0",
    "nock": "^13.5.4",
    "ts-jest": "^29.1.2",
    "typescript": "^5.4.5"
  },
  "dependencies": {
    "axios": "^1.6.8",
    "dotenv": "^16.4.5"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `jest.config.js`**

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts']
};
```

- [ ] **Step 4: Create `.env.example`**

```
HEYGEN_API_KEY=your_heygen_api_key
HEYGEN_AVATAR_ID=your_avatar_id
HEYGEN_VOICE_ID=your_voice_id
OUTPUT_DIR=./output
MUSIC_TRACK_PATH=./assets/background-music.mp3
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
dist/
.env
output/
```

- [ ] **Step 6: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json jest.config.js .env.example .gitignore
git commit -m "chore: scaffold Electron/TypeScript project"
```

---

### Task 2: Config loader

**Files:**
- Create: `src/main/config.ts`
- Test: `src/main/config.test.ts`

**Interfaces:**
- Produces: `AppConfig` interface (`heygenApiKey`, `heygenAvatarId`, `heygenVoiceId`, `outputDir`, `musicTrackPath`); `loadConfig(env?: NodeJS.ProcessEnv): AppConfig` — throws `Error` if any required var is missing. Pure function: does not call `dotenv.config()` itself (that happens once in `index.ts`, Task 7).

- [ ] **Step 1: Write the failing test**

`src/main/config.test.ts`:

```ts
import { loadConfig } from './config';

describe('loadConfig', () => {
  it('returns config when all required vars are present', () => {
    const env = {
      HEYGEN_API_KEY: 'key123',
      HEYGEN_AVATAR_ID: 'avatar123',
      HEYGEN_VOICE_ID: 'voice123',
      OUTPUT_DIR: './output',
      MUSIC_TRACK_PATH: './assets/music.mp3'
    } as NodeJS.ProcessEnv;

    const config = loadConfig(env);

    expect(config.heygenApiKey).toBe('key123');
    expect(config.heygenAvatarId).toBe('avatar123');
    expect(config.heygenVoiceId).toBe('voice123');
    expect(config.outputDir.endsWith('output')).toBe(true);
    expect(config.musicTrackPath.endsWith('music.mp3')).toBe(true);
  });

  it('throws when a required var is missing', () => {
    const env = { HEYGEN_API_KEY: 'key123' } as NodeJS.ProcessEnv;

    expect(() => loadConfig(env)).toThrow(/Missing required environment variables/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/main/config.test.ts`
Expected: FAIL — `Cannot find module './config'`

- [ ] **Step 3: Write minimal implementation**

`src/main/config.ts`:

```ts
import * as path from 'path';

export interface AppConfig {
  heygenApiKey: string;
  heygenAvatarId: string;
  heygenVoiceId: string;
  outputDir: string;
  musicTrackPath: string;
}

const REQUIRED_KEYS = [
  'HEYGEN_API_KEY',
  'HEYGEN_AVATAR_ID',
  'HEYGEN_VOICE_ID',
  'OUTPUT_DIR',
  'MUSIC_TRACK_PATH'
] as const;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const missing = REQUIRED_KEYS.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    heygenApiKey: env.HEYGEN_API_KEY as string,
    heygenAvatarId: env.HEYGEN_AVATAR_ID as string,
    heygenVoiceId: env.HEYGEN_VOICE_ID as string,
    outputDir: path.resolve(env.OUTPUT_DIR as string),
    musicTrackPath: path.resolve(env.MUSIC_TRACK_PATH as string)
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/main/config.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/main/config.ts src/main/config.test.ts
git commit -m "feat: add env-based config loader"
```

---

### Task 3: HeyGenClient

**Files:**
- Create: `src/main/heygenClient.ts`
- Test: `src/main/heygenClient.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `HeyGenCredentials` (`apiKey`, `avatarId`, `voiceId`); `class HeyGenClient` with `generateVideo(text: string): Promise<string>` (returns `video_id`), `checkStatus(videoId: string): Promise<HeyGenStatusResult>`, `pollUntilComplete(videoId: string, options?: { intervalMs?: number; timeoutMs?: number }): Promise<string>` (returns video URL), `downloadVideo(videoUrl: string, destinationPath: string): Promise<void>`. These exact method names/signatures are used by `pipeline.ts` in Task 6.

- [ ] **Step 1: Write the failing tests**

`src/main/heygenClient.test.ts`:

```ts
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
      .post('/v2/video/generate')
      .reply(200, { data: { video_id: 'vid_123' } });

    const client = new HeyGenClient(credentials);
    const videoId = await client.generateVideo('Hello world');

    expect(videoId).toBe('vid_123');
  });

  it('checkStatus returns parsed status fields', async () => {
    nock(BASE_URL)
      .get('/v1/video_status.get')
      .query({ video_id: 'vid_123' })
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
      .get('/v1/video_status.get')
      .query({ video_id: 'vid_123' })
      .reply(200, { data: { status: 'processing' } })
      .get('/v1/video_status.get')
      .query({ video_id: 'vid_123' })
      .reply(200, { data: { status: 'completed', video_url: 'https://cdn.heygen.com/vid_123.mp4' } });

    const client = new HeyGenClient(credentials);
    const videoUrl = await client.pollUntilComplete('vid_123', { intervalMs: 10, timeoutMs: 5000 });

    expect(videoUrl).toBe('https://cdn.heygen.com/vid_123.mp4');
  });

  it('pollUntilComplete throws when HeyGen reports failed status', async () => {
    nock(BASE_URL)
      .get('/v1/video_status.get')
      .query({ video_id: 'vid_123' })
      .reply(200, { data: { status: 'failed', error: 'avatar render error' } });

    const client = new HeyGenClient(credentials);

    await expect(
      client.pollUntilComplete('vid_123', { intervalMs: 10, timeoutMs: 5000 })
    ).rejects.toThrow('HeyGen video generation failed: avatar render error');
  });

  it('pollUntilComplete throws after the timeout elapses', async () => {
    nock(BASE_URL)
      .get('/v1/video_status.get')
      .query({ video_id: 'vid_123' })
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/main/heygenClient.test.ts`
Expected: FAIL — `Cannot find module './heygenClient'`

- [ ] **Step 3: Write minimal implementation**

`src/main/heygenClient.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/main/heygenClient.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/main/heygenClient.ts src/main/heygenClient.test.ts
git commit -m "feat: add HeyGenClient for video generation, polling, and download"
```

---

### Task 4: VideoProcessor

**Files:**
- Create: `src/main/videoProcessor.ts`
- Test: `src/main/videoProcessor.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `VideoProcessingOptions` (`inputVideoPath`, `musicTrackPath`, `outputPath`, optional `targetWidth`, `targetHeight`, `musicVolume`); `buildFfmpegArgs(options): string[]`; `runFfmpeg(args: string[], ffmpegPath?: string): Promise<void>`; `processVideo(options: VideoProcessingOptions, ffmpegPath?: string): Promise<void>`. `processVideo` is the function `pipeline.ts` (Task 6) calls.

- [ ] **Step 1: Write the failing tests**

`src/main/videoProcessor.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/main/videoProcessor.test.ts`
Expected: FAIL — `Cannot find module './videoProcessor'`

- [ ] **Step 3: Write minimal implementation**

`src/main/videoProcessor.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/main/videoProcessor.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/main/videoProcessor.ts src/main/videoProcessor.test.ts
git commit -m "feat: add ffmpeg-based 9:16 + background music video processor"
```

---

### Task 5: Publisher

**Files:**
- Create: `src/main/publisher.ts`
- Test: `src/main/publisher.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `interface Publisher { publish(finalVideoPath: string): Promise<string>; }`; `class LocalSavePublisher implements Publisher` with constructor `(outputDir: string)`. Any future `InstagramPublisher` must implement the same `Publisher` interface. `pipeline.ts` (Task 6) depends only on the `publish` method.

- [ ] **Step 1: Write the failing test**

`src/main/publisher.test.ts`:

```ts
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LocalSavePublisher } from './publisher';

describe('LocalSavePublisher', () => {
  it('copies the final video into the configured output directory and returns the new path', async () => {
    const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heygen-src-'));
    const outputDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'heygen-out-')), 'reels');
    const sourcePath = path.join(sourceDir, 'reel.mp4');
    fs.writeFileSync(sourcePath, 'fake video bytes');

    const publisher = new LocalSavePublisher(outputDir);
    const destination = await publisher.publish(sourcePath);

    expect(destination).toBe(path.join(outputDir, 'reel.mp4'));
    expect(fs.readFileSync(destination, 'utf-8')).toBe('fake video bytes');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/main/publisher.test.ts`
Expected: FAIL — `Cannot find module './publisher'`

- [ ] **Step 3: Write minimal implementation**

`src/main/publisher.ts`:

```ts
import * as fs from 'fs';
import * as path from 'path';

export interface Publisher {
  publish(finalVideoPath: string): Promise<string>;
}

export class LocalSavePublisher implements Publisher {
  constructor(private outputDir: string) {}

  async publish(finalVideoPath: string): Promise<string> {
    fs.mkdirSync(this.outputDir, { recursive: true });
    const destination = path.join(this.outputDir, path.basename(finalVideoPath));
    fs.copyFileSync(finalVideoPath, destination);
    return destination;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/main/publisher.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/main/publisher.ts src/main/publisher.test.ts
git commit -m "feat: add Publisher interface with LocalSavePublisher implementation"
```

---

### Task 6: Pipeline orchestrator

**Files:**
- Create: `src/main/pipeline.ts`
- Test: `src/main/pipeline.test.ts`

**Interfaces:**
- Consumes: `HeyGenClient` methods `generateVideo`, `pollUntilComplete`, `downloadVideo` (Task 3); `processVideo` (Task 4); `Publisher.publish` (Task 5) — via an injected `PipelineDeps` object, not concrete classes, so it stays unit-testable.
- Produces: `runPipeline(text: string, deps: PipelineDeps): Promise<string>` — used by `index.ts` (Task 7).

- [ ] **Step 1: Write the failing tests**

`src/main/pipeline.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/main/pipeline.test.ts`
Expected: FAIL — `Cannot find module './pipeline'`

- [ ] **Step 3: Write minimal implementation**

`src/main/pipeline.ts`:

```ts
import * as path from 'path';

export interface PipelineDeps {
  heygenClient: {
    generateVideo(text: string): Promise<string>;
    pollUntilComplete(videoId: string): Promise<string>;
    downloadVideo(url: string, destinationPath: string): Promise<void>;
  };
  processVideo(options: {
    inputVideoPath: string;
    musicTrackPath: string;
    outputPath: string;
  }): Promise<void>;
  publisher: {
    publish(finalVideoPath: string): Promise<string>;
  };
  tempDir: string;
  musicTrackPath: string;
}

export async function runPipeline(text: string, deps: PipelineDeps): Promise<string> {
  const videoId = await deps.heygenClient.generateVideo(text);
  const videoUrl = await deps.heygenClient.pollUntilComplete(videoId);

  const rawPath = path.join(deps.tempDir, `${videoId}-raw.mp4`);
  await deps.heygenClient.downloadVideo(videoUrl, rawPath);

  const processedPath = path.join(deps.tempDir, `${videoId}-final.mp4`);
  await deps.processVideo({
    inputVideoPath: rawPath,
    musicTrackPath: deps.musicTrackPath,
    outputPath: processedPath
  });

  return deps.publisher.publish(processedPath);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/main/pipeline.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/main/pipeline.ts src/main/pipeline.test.ts
git commit -m "feat: add pipeline orchestrator wiring HeyGen, ffmpeg, and publisher"
```

---

### Task 7: Electron main process + renderer UI

**Files:**
- Create: `src/main/index.ts`
- Create: `src/renderer/preload.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/renderer.ts`

**Interfaces:**
- Consumes: `loadConfig` (Task 2), `HeyGenClient` (Task 3), `processVideo` (Task 4), `LocalSavePublisher` (Task 5), `runPipeline` (Task 6).
- Produces: IPC channel `generate-reel` (renderer → main, `string` in, `Promise<string>` out) exposed to the renderer as `window.reelsApi.generateReel(text)`.

This task has no automated test — Electron's runtime can't be exercised by Jest in this setup. It is verified manually in Task 8.

- [ ] **Step 1: Write `src/main/index.ts`**

```ts
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { loadConfig } from './config';
import { HeyGenClient } from './heygenClient';
import { processVideo } from './videoProcessor';
import { LocalSavePublisher } from './publisher';
import { runPipeline } from './pipeline';

dotenv.config();

function createWindow(): void {
  const win = new BrowserWindow({
    width: 480,
    height: 640,
    webPreferences: {
      preload: path.join(__dirname, '../renderer/preload.js'),
      contextIsolation: true
    }
  });
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('generate-reel', async (_event, text: string) => {
    const config = loadConfig();
    const heygenClient = new HeyGenClient({
      apiKey: config.heygenApiKey,
      avatarId: config.heygenAvatarId,
      voiceId: config.heygenVoiceId
    });
    const publisher = new LocalSavePublisher(config.outputDir);

    return runPipeline(text, {
      heygenClient,
      processVideo,
      publisher,
      tempDir: app.getPath('temp'),
      musicTrackPath: config.musicTrackPath
    });
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
```

- [ ] **Step 2: Write `src/renderer/preload.ts`**

```ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('reelsApi', {
  generateReel: (text: string) => ipcRenderer.invoke('generate-reel', text)
});
```

- [ ] **Step 3: Write `src/renderer/index.html`**

```html
<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <title>HeyGen Reels Generator</title>
  <style>
    body { font-family: sans-serif; padding: 16px; }
    textarea { width: 100%; height: 160px; }
    #status { margin-top: 12px; white-space: pre-wrap; }
    button { margin-top: 8px; padding: 8px 16px; }
  </style>
</head>
<body>
  <h1>HeyGen Reels Generator</h1>
  <textarea id="text-input" placeholder="Введіть текст для аватара..."></textarea>
  <br />
  <button id="generate-button">Створити рілс</button>
  <div id="status"></div>
  <script src="renderer.js"></script>
</body>
</html>
```

- [ ] **Step 4: Write `src/renderer/renderer.ts`**

```ts
declare global {
  interface Window {
    reelsApi: {
      generateReel(text: string): Promise<string>;
    };
  }
}

const textInput = document.getElementById('text-input') as HTMLTextAreaElement;
const generateButton = document.getElementById('generate-button') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;

generateButton.addEventListener('click', () => {
  const text = textInput.value.trim();
  if (!text) {
    statusEl.textContent = 'Введіть текст перед генерацією.';
    return;
  }

  generateButton.disabled = true;
  statusEl.textContent = 'Генерація відео через HeyGen...';

  window.reelsApi
    .generateReel(text)
    .then((finalPath) => {
      statusEl.textContent = `Готово! Рілс збережено: ${finalPath}`;
    })
    .catch((error: Error) => {
      statusEl.textContent = `Помилка: ${error.message}`;
    })
    .finally(() => {
      generateButton.disabled = false;
    });
});
```

- [ ] **Step 5: Build and check for compile errors**

Run: `npm run build`
Expected: exits 0, `dist/main/index.js`, `dist/renderer/preload.js`, `dist/renderer/renderer.js` exist; `dist/renderer/index.html` is present (copy it manually into `dist/renderer/` if `tsc` doesn't copy non-`.ts` files — see Task 8 README note on adding a copy step if needed).

- [ ] **Step 6: Commit**

```bash
git add src/main/index.ts src/renderer/preload.ts src/renderer/index.html src/renderer/renderer.ts
git commit -m "feat: wire Electron main process and renderer UI to the pipeline"
```

---

### Task 8: README and manual end-to-end verification

**Files:**
- Create: `README.md`

**Interfaces:**
- None — this task documents setup and runs the full app once by hand.

- [ ] **Step 1: Write `README.md`**

```markdown
# HeyGen Reels Generator

Desktop app: paste text in, get a 9:16 Reel with your HeyGen avatar voice
and background music out.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `HEYGEN_API_KEY`, `HEYGEN_AVATAR_ID`, `HEYGEN_VOICE_ID` — from your
     HeyGen account.
   - `OUTPUT_DIR` — folder where finished Reels are saved.
   - `MUSIC_TRACK_PATH` — path to a background music file (mp3/wav).
3. Install [ffmpeg](https://ffmpeg.org/) and make sure `ffmpeg` is on your
   PATH (`ffmpeg -version` should print a version, not "command not
   found").
4. `npm start`

## Switching HeyGen accounts

`avatar_id` and `voice_id` belong to the HeyGen account that created them.
To use your second paid account with the *same* persona, that persona
must already exist there (re-created Instant/Photo Avatar, or a Studio
Avatar transferred via HeyGen support) — then just update `.env` with the
second account's key and the persona's IDs in that account.

## Tests

`npm test`
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all suites from Tasks 2–6 pass (config, heygenClient, videoProcessor, publisher, pipeline).

- [ ] **Step 3: Manual end-to-end run**

1. Run `npm start`.
2. Type a short sentence (one or two sentences) into the textarea.
3. Click "Створити рілс".
4. Confirm the status line progresses to "Готово! Рілс збережено: ...".
5. Open the path shown and confirm: video is 9:16, avatar speaks the
   typed text, background music is audible under the voice at low
   volume.
6. If step 3–5 fails, check the status line's error message first — it
   surfaces the failing stage (HeyGen API error, ffmpeg error, or file
   I/O error) directly.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add setup, account-switching, and test instructions"
```
