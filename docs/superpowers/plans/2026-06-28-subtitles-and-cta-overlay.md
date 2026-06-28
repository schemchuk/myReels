# Subtitles + CTA URL Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Burn approximate, sentence-timed subtitles (derived from the text sent to HeyGen) and a persistent CTA URL bar into every generated Reel.

**Architecture:** A new pure module `subtitles.ts` turns input text + video duration into an `.srt` string; `videoProcessor.ts` gains `getVideoDuration` (via `ffprobe`) and a `prepareSubtitleAssets` function that writes the `.srt` and a CTA text file to disk, then `buildFfmpegArgs` appends a `subtitles=` filter and a `drawtext=...textfile=` filter to the existing 9:16 + music filter chain; `pipeline.ts` wires the new steps in between download and processing.

**Tech Stack:** Same as the existing project — TypeScript, ffmpeg/ffprobe (already required), Jest + ts-jest.

## Global Constraints

- Subtitles are derived from the input text only, split by sentence, evenly timed across the video's total duration — no ASR.
- CTA URL is a single fixed value from `.env` (`REEL_CTA_URL`), visible for the entire video, positioned at the bottom below the subtitles.
- No new runtime dependencies — only the `ffprobe` binary that ships alongside the already-required `ffmpeg`.
- **Git workflow:** commit locally after every task using the exact commit message given in that task's final step, same as before — **except this time, after the final task's tests pass, run `git push`** (the user has asked for the push this time).

---

## File Structure

```
src/main/
  subtitles.ts            (new)
  subtitles.test.ts        (new)
  videoProcessor.ts         (modify: add getVideoDuration, prepareSubtitleAssets, extend buildFfmpegArgs)
  videoProcessor.test.ts     (modify: extend existing tests)
  config.ts                  (modify: add REEL_CTA_URL, SUBTITLE_FONT_PATH)
  config.test.ts              (modify: extend existing tests)
  pipeline.ts                  (modify: wire duration + subtitle prep into runPipeline)
  pipeline.test.ts              (modify: extend mocked deps)
.env.example                   (modify: add new vars)
```

---

### Task 1: Subtitle text segmentation and SRT generation

**Files:**
- Create: `src/main/subtitles.ts`
- Test: `src/main/subtitles.test.ts`

**Interfaces:**
- Produces: `interface SubtitleSegment { text: string; startSec: number; endSec: number; }`; `splitIntoSentences(text: string): string[]`; `buildSubtitleSegments(sentences: string[], durationSec: number): SubtitleSegment[]`; `buildSrt(segments: SubtitleSegment[]): string`. `videoProcessor.ts` (Task 2) imports `buildSrt`'s output as the content it writes to a `.srt` file.

- [ ] **Step 1: Write the failing tests**

`src/main/subtitles.test.ts`:

```ts
import { splitIntoSentences, buildSubtitleSegments, buildSrt } from './subtitles';

describe('splitIntoSentences', () => {
  it('splits on sentence-ending punctuation and trims whitespace', () => {
    const result = splitIntoSentences('Привіт. Як справи? Чудово!');
    expect(result).toEqual(['Привіт.', 'Як справи?', 'Чудово!']);
  });

  it('handles an ellipsis as a sentence boundary', () => {
    const result = splitIntoSentences('Зачекайте... Це працює.');
    expect(result).toEqual(['Зачекайте...', 'Це працює.']);
  });

  it('returns the whole text as one sentence when there is no punctuation', () => {
    const result = splitIntoSentences('просто текст без розділових знаків');
    expect(result).toEqual(['просто текст без розділових знаків']);
  });

  it('drops empty fragments caused by extra whitespace', () => {
    const result = splitIntoSentences('Перше.   Друге.');
    expect(result).toEqual(['Перше.', 'Друге.']);
  });
});

describe('buildSubtitleSegments', () => {
  it('divides the duration evenly across all sentences', () => {
    const segments = buildSubtitleSegments(['Перше.', 'Друге.', 'Третє.'], 9);

    expect(segments).toEqual([
      { text: 'Перше.', startSec: 0, endSec: 3 },
      { text: 'Друге.', startSec: 3, endSec: 6 },
      { text: 'Третє.', startSec: 6, endSec: 9 }
    ]);
  });

  it('returns an empty array when there are no sentences', () => {
    expect(buildSubtitleSegments([], 10)).toEqual([]);
  });
});

describe('buildSrt', () => {
  it('renders segments as a standard .srt file', () => {
    const srt = buildSrt([
      { text: 'Перше.', startSec: 0, endSec: 3 },
      { text: 'Друге.', startSec: 3, endSec: 6.5 }
    ]);

    expect(srt).toBe(
      '1\n00:00:00,000 --> 00:00:03,000\nПерше.\n\n' +
      '2\n00:00:03,000 --> 00:00:06,500\nДруге.\n\n'
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/main/subtitles.test.ts`
Expected: FAIL — `Cannot find module './subtitles'`

- [ ] **Step 3: Write minimal implementation**

`src/main/subtitles.ts`:

```ts
export interface SubtitleSegment {
  text: string;
  startSec: number;
  endSec: number;
}

export function splitIntoSentences(text: string): string[] {
  const matches = text.match(/[^.!?…]+[.!?…]+/g);
  if (!matches) {
    const trimmed = text.trim();
    return trimmed ? [trimmed] : [];
  }
  return matches.map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 0);
}

export function buildSubtitleSegments(
  sentences: string[],
  durationSec: number
): SubtitleSegment[] {
  if (sentences.length === 0) {
    return [];
  }

  const slice = durationSec / sentences.length;
  return sentences.map((text, index) => ({
    text,
    startSec: index * slice,
    endSec: (index + 1) * slice
  }));
}

function formatTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);

  const pad2 = (n: number) => String(n).padStart(2, '0');
  const pad3 = (n: number) => String(n).padStart(3, '0');

  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)},${pad3(milliseconds)}`;
}

export function buildSrt(segments: SubtitleSegment[]): string {
  return segments
    .map((segment, index) => {
      const start = formatTimestamp(segment.startSec);
      const end = formatTimestamp(segment.endSec);
      return `${index + 1}\n${start} --> ${end}\n${segment.text}\n\n`;
    })
    .join('');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/main/subtitles.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/main/subtitles.ts src/main/subtitles.test.ts
git commit -m "feat: add sentence-based subtitle segmentation and SRT generation"
```

---

### Task 2: Video duration probing and subtitle asset writing

**Files:**
- Modify: `src/main/videoProcessor.ts`
- Modify: `src/main/videoProcessor.test.ts`

**Interfaces:**
- Consumes: `buildSubtitleSegments`, `buildSrt` from `subtitles.ts` (Task 1).
- Produces: `getVideoDuration(inputPath: string, ffprobePath?: string): Promise<number>`; `prepareSubtitleAssets(text: string, durationSec: number, ctaUrl: string, tempDir: string): Promise<{ srtPath: string; ctaTextPath: string }>`. `pipeline.ts` (Task 4) calls both of these.

- [ ] **Step 1: Write the failing tests**

Add to `src/main/videoProcessor.test.ts` (keep the existing `buildFfmpegArgs`/`runFfmpeg` describe blocks above these, and add the `jest.mock('fs')`-free imports needed below — `fs`/`os`/`path` are used directly, not mocked):

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/main/videoProcessor.test.ts`
Expected: FAIL — `getVideoDuration`/`prepareSubtitleAssets` are not exported

- [ ] **Step 3: Write minimal implementation**

Add to the top of `src/main/videoProcessor.ts` (alongside the existing `import { spawn } from 'child_process';`):

```ts
import * as fs from 'fs';
import * as path from 'path';
import { splitIntoSentences, buildSubtitleSegments, buildSrt } from './subtitles';
```

Add these functions to `src/main/videoProcessor.ts` (after `processVideo`):

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/main/videoProcessor.test.ts`
Expected: PASS (all previous tests plus the 3 new ones)

- [ ] **Step 5: Commit**

```bash
git add src/main/videoProcessor.ts src/main/videoProcessor.test.ts
git commit -m "feat: add ffprobe duration check and subtitle/CTA asset writer"
```

---

### Task 3: Burn subtitles and CTA bar into the ffmpeg filter chain

**Files:**
- Modify: `src/main/videoProcessor.ts`
- Modify: `src/main/videoProcessor.test.ts`

**Interfaces:**
- Consumes: nothing new from earlier tasks (this task only changes `buildFfmpegArgs`'s signature and body).
- Produces: `VideoProcessingOptions` gains `subtitlesPath: string`, `ctaTextFilePath: string`, `fontPath: string` (all required — every Reel gets subtitles and a CTA now). `pipeline.ts` (Task 4) must pass these three fields on every `processVideo` call.

- [ ] **Step 1: Update the failing test**

Replace the two existing `buildFfmpegArgs` tests in `src/main/videoProcessor.test.ts` with:

```ts
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
      "[0:v]scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2," +
        "subtitles='C\\:/tmp/subs.srt':force_style='FontName=Arial,FontSize=20,PrimaryColour=&Hffffff,OutlineColour=&H000000,BorderStyle=3,Alignment=2,MarginV=160'," +
        "drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':textfile='C\\:/tmp/cta.txt':fontcolor=white:fontsize=28:box=1:boxcolor=black@0.6:boxborderw=10:x=(w-text_w)/2:y=h-70[vout];" +
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/main/videoProcessor.test.ts`
Expected: FAIL — actual filter string lacks `subtitles=`/`drawtext=` clauses, and TypeScript will also complain that the test is missing required `VideoProcessingOptions` fields once Step 3 below changes the interface (expected at this point: the *old* `buildFfmpegArgs` body still runs and produces a mismatched string, so the `toEqual`/`toContain` assertions fail).

- [ ] **Step 3: Write minimal implementation**

Replace the `VideoProcessingOptions` interface and `buildFfmpegArgs` function in `src/main/videoProcessor.ts` with:

```ts
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
}

function escapeFfmpegPath(rawPath: string): string {
  return rawPath.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
}

export function buildFfmpegArgs(options: VideoProcessingOptions): string[] {
  const width = options.targetWidth ?? 720;
  const height = options.targetHeight ?? 1280;
  const musicVolume = options.musicVolume ?? 0.15;

  const scalePad = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
  const subtitles = `subtitles='${escapeFfmpegPath(options.subtitlesPath)}':force_style='FontName=Arial,FontSize=20,PrimaryColour=&Hffffff,OutlineColour=&H000000,BorderStyle=3,Alignment=2,MarginV=160'`;
  const ctaDrawtext = `drawtext=fontfile='${escapeFfmpegPath(options.fontPath)}':textfile='${escapeFfmpegPath(options.ctaTextFilePath)}':fontcolor=white:fontsize=28:box=1:boxcolor=black@0.6:boxborderw=10:x=(w-text_w)/2:y=h-70`;
  const videoFilter = `${scalePad},${subtitles},${ctaDrawtext}`;
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/main/videoProcessor.test.ts`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Commit**

```bash
git add src/main/videoProcessor.ts src/main/videoProcessor.test.ts
git commit -m "feat: burn subtitles and CTA bar into the ffmpeg filter chain"
```

---

### Task 4: Config support for CTA URL and font path

**Files:**
- Modify: `src/main/config.ts`
- Modify: `src/main/config.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `AppConfig` gains `reelCtaUrl: string` and `subtitleFontPath: string`. `pipeline.ts`/`index.ts` (Task 5) read these off the loaded config.

- [ ] **Step 1: Update the failing tests**

Replace the contents of `src/main/config.test.ts` with:

```ts
import { loadConfig } from './config';

describe('loadConfig', () => {
  it('returns config when all required vars are present', () => {
    const env = {
      HEYGEN_API_KEY: 'key123',
      HEYGEN_AVATAR_ID: 'avatar123',
      HEYGEN_VOICE_ID: 'voice123',
      OUTPUT_DIR: './output',
      MUSIC_TRACK_PATH: './assets/music.mp3',
      REEL_CTA_URL: 'https://jobs.couchhelp.eu/'
    } as NodeJS.ProcessEnv;

    const config = loadConfig(env);

    expect(config.heygenApiKey).toBe('key123');
    expect(config.heygenAvatarId).toBe('avatar123');
    expect(config.heygenVoiceId).toBe('voice123');
    expect(config.outputDir.endsWith('output')).toBe(true);
    expect(config.musicTrackPath.endsWith('music.mp3')).toBe(true);
    expect(config.reelCtaUrl).toBe('https://jobs.couchhelp.eu/');
    expect(config.subtitleFontPath).toBe('C:/Windows/Fonts/arial.ttf');
  });

  it('uses a custom SUBTITLE_FONT_PATH when provided', () => {
    const env = {
      HEYGEN_API_KEY: 'key123',
      HEYGEN_AVATAR_ID: 'avatar123',
      HEYGEN_VOICE_ID: 'voice123',
      OUTPUT_DIR: './output',
      MUSIC_TRACK_PATH: './assets/music.mp3',
      REEL_CTA_URL: 'https://jobs.couchhelp.eu/',
      SUBTITLE_FONT_PATH: 'C:/MyFonts/custom.ttf'
    } as NodeJS.ProcessEnv;

    const config = loadConfig(env);

    expect(config.subtitleFontPath).toBe('C:/MyFonts/custom.ttf');
  });

  it('throws when a required var is missing', () => {
    const env = { HEYGEN_API_KEY: 'key123' } as NodeJS.ProcessEnv;

    expect(() => loadConfig(env)).toThrow(/Missing required environment variables/);
  });

  it('throws when REEL_CTA_URL specifically is missing', () => {
    const env = {
      HEYGEN_API_KEY: 'key123',
      HEYGEN_AVATAR_ID: 'avatar123',
      HEYGEN_VOICE_ID: 'voice123',
      OUTPUT_DIR: './output',
      MUSIC_TRACK_PATH: './assets/music.mp3'
    } as NodeJS.ProcessEnv;

    expect(() => loadConfig(env)).toThrow(/REEL_CTA_URL/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/main/config.test.ts`
Expected: FAIL — `reelCtaUrl`/`subtitleFontPath` are `undefined`, and the missing-`REEL_CTA_URL` test fails since it's not yet required

- [ ] **Step 3: Write minimal implementation**

Replace `src/main/config.ts` with:

```ts
import * as path from 'path';

export interface AppConfig {
  heygenApiKey: string;
  heygenAvatarId: string;
  heygenVoiceId: string;
  outputDir: string;
  musicTrackPath: string;
  reelCtaUrl: string;
  subtitleFontPath: string;
}

const REQUIRED_KEYS = [
  'HEYGEN_API_KEY',
  'HEYGEN_AVATAR_ID',
  'HEYGEN_VOICE_ID',
  'OUTPUT_DIR',
  'MUSIC_TRACK_PATH',
  'REEL_CTA_URL'
] as const;

const DEFAULT_SUBTITLE_FONT_PATH = 'C:/Windows/Fonts/arial.ttf';

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
    musicTrackPath: path.resolve(env.MUSIC_TRACK_PATH as string),
    reelCtaUrl: env.REEL_CTA_URL as string,
    subtitleFontPath: env.SUBTITLE_FONT_PATH ?? DEFAULT_SUBTITLE_FONT_PATH
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/main/config.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Update `.env.example`**

Replace the contents of `.env.example` with:

```
HEYGEN_API_KEY=your_heygen_api_key
HEYGEN_AVATAR_ID=your_avatar_id
HEYGEN_VOICE_ID=your_voice_id
OUTPUT_DIR=./output
MUSIC_TRACK_PATH=./assets/background-music.mp3
REEL_CTA_URL=https://jobs.couchhelp.eu/
SUBTITLE_FONT_PATH=C:/Windows/Fonts/arial.ttf
```

- [ ] **Step 6: Commit**

```bash
git add src/main/config.ts src/main/config.test.ts .env.example
git commit -m "feat: add REEL_CTA_URL and SUBTITLE_FONT_PATH to config"
```

---

### Task 5: Wire duration probing and subtitle prep into the pipeline

**Files:**
- Modify: `src/main/pipeline.ts`
- Modify: `src/main/pipeline.test.ts`
- Modify: `src/main/index.ts`

**Interfaces:**
- Consumes: `getVideoDuration`, `prepareSubtitleAssets` (Task 2), `VideoProcessingOptions`'s new required fields (Task 3), `AppConfig.reelCtaUrl`/`subtitleFontPath` (Task 4).
- Produces: `PipelineDeps` gains `getVideoDuration` and `prepareSubtitleAssets` function fields, plus `reelCtaUrl` and `fontPath` string fields. `runPipeline`'s public signature (`runPipeline(text, deps): Promise<string>`) is unchanged.

- [ ] **Step 1: Write the failing test**

Replace the contents of `src/main/pipeline.test.ts` with:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/main/pipeline.test.ts`
Expected: FAIL — current `runPipeline` never calls `getVideoDuration`/`prepareSubtitleAssets`, so `calls` is missing entries and `processVideoCallArgs` lacks the new fields

- [ ] **Step 3: Write minimal implementation**

Replace `src/main/pipeline.ts` with:

```ts
import * as path from 'path';

export interface PipelineDeps {
  heygenClient: {
    generateVideo(text: string): Promise<string>;
    pollUntilComplete(videoId: string): Promise<string>;
    downloadVideo(url: string, destinationPath: string): Promise<void>;
  };
  getVideoDuration(inputPath: string): Promise<number>;
  prepareSubtitleAssets(
    text: string,
    durationSec: number,
    ctaUrl: string,
    tempDir: string
  ): Promise<{ srtPath: string; ctaTextPath: string }>;
  processVideo(options: {
    inputVideoPath: string;
    musicTrackPath: string;
    outputPath: string;
    subtitlesPath: string;
    ctaTextFilePath: string;
    fontPath: string;
  }): Promise<void>;
  publisher: {
    publish(finalVideoPath: string): Promise<string>;
  };
  tempDir: string;
  musicTrackPath: string;
  reelCtaUrl: string;
  fontPath: string;
}

export async function runPipeline(text: string, deps: PipelineDeps): Promise<string> {
  const videoId = await deps.heygenClient.generateVideo(text);
  const videoUrl = await deps.heygenClient.pollUntilComplete(videoId);

  const rawPath = path.join(deps.tempDir, `${videoId}-raw.mp4`);
  await deps.heygenClient.downloadVideo(videoUrl, rawPath);

  const duration = await deps.getVideoDuration(rawPath);
  const { srtPath, ctaTextPath } = await deps.prepareSubtitleAssets(
    text,
    duration,
    deps.reelCtaUrl,
    deps.tempDir
  );

  const processedPath = path.join(deps.tempDir, `${videoId}-final.mp4`);
  await deps.processVideo({
    inputVideoPath: rawPath,
    musicTrackPath: deps.musicTrackPath,
    outputPath: processedPath,
    subtitlesPath: srtPath,
    ctaTextFilePath: ctaTextPath,
    fontPath: deps.fontPath
  });

  return deps.publisher.publish(processedPath);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/main/pipeline.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Wire the new deps into `index.ts`**

In `src/main/index.ts`, change the import line:

```ts
import { processVideo } from './videoProcessor';
```

to:

```ts
import { processVideo, getVideoDuration, prepareSubtitleAssets } from './videoProcessor';
```

Then replace the `runPipeline(text, { ... })` call inside the `ipcMain.handle('generate-reel', ...)` handler with:

```ts
    return runPipeline(text, {
      heygenClient,
      getVideoDuration,
      prepareSubtitleAssets,
      processVideo,
      publisher,
      tempDir: app.getPath('temp'),
      musicTrackPath: config.musicTrackPath,
      reelCtaUrl: config.reelCtaUrl,
      fontPath: config.subtitleFontPath
    });
```

- [ ] **Step 6: Build to confirm no type errors**

Run: `npm run build`
Expected: exits 0

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: all suites pass (config, heygenClient, publisher, videoProcessor, subtitles, pipeline)

- [ ] **Step 8: Commit, then push**

```bash
git add src/main/pipeline.ts src/main/pipeline.test.ts src/main/index.ts
git commit -m "feat: wire subtitle generation and CTA overlay into the pipeline"
git push
```
