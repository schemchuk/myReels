# Subtitles + CTA URL Overlay — Design

## Purpose

The original HeyGen Reels Generator design explicitly excluded subtitles
("no subtitles in this iteration"). This spec supersedes that constraint:
the user now wants every generated Reel to carry burned-in subtitles
derived from the same text sent to HeyGen, plus a persistent on-screen
call-to-action overlay pointing viewers to `https://jobs.couchhelp.eu/`
(the user's other product, SofaSearch/CoachHelp), so social posts can
drive measurable signups.

## Scope

- Subtitles are generated from the **input text**, not from audio
  transcription (no ASR/Whisper). Timing is therefore approximate: the
  text is split into sentences, and each sentence is given an equal share
  of the video's total duration. This was confirmed acceptable by the
  user for short Reels.
- The CTA URL is shown for the **entire video**, at the bottom, below the
  subtitles. The URL value is a single fixed value read from `.env`
  (`REEL_CTA_URL`), matching the existing single-profile-via-`.env`
  pattern — no per-video override in this iteration.
- Both features are burned into the video by ffmpeg in the same
  processing step that already handles 9:16 framing and background music
  — no new external dependencies; the existing ffmpeg build already
  includes `libass` (subtitle rendering) and `libfreetype`/`libharfbuzz`
  (Cyrillic-capable text shaping), confirmed via `ffmpeg -version`.

## Architecture

### New module: `src/main/subtitles.ts` (pure, no I/O)

- `splitIntoSentences(text: string): string[]` — splits on `.`, `!`, `?`,
  or `…` followed by whitespace or end-of-string; trims and drops empty
  results.
- `buildSubtitleSegments(sentences: string[], durationSec: number): SubtitleSegment[]`
  where `SubtitleSegment = { text: string; startSec: number; endSec: number }`
  — divides `durationSec` into `sentences.length` equal slices.
- `buildSrt(segments: SubtitleSegment[]): string` — renders the segments
  as a standard `.srt` file (sequence number, `HH:MM:SS,mmm --> HH:MM:SS,mmm`,
  text, blank line).

### Extended `src/main/videoProcessor.ts`

- `getVideoDuration(inputPath: string, ffprobePath?: string): Promise<number>` —
  spawns `ffprobe -v error -show_entries format=duration -of csv=p=0 <inputPath>`
  and parses the printed seconds value.
- `VideoProcessingOptions` gains `subtitlesPath: string` (path to a `.srt`
  file) and `ctaTextFilePath: string` (path to a one-line `.txt` file
  containing the CTA URL) and `fontPath: string`.
- `buildFfmpegArgs` appends to the existing video filter chain (after
  `scale`/`pad`, before the `[vout]` label):
  - `subtitles='<escaped subtitlesPath>':force_style='FontName=Arial,FontSize=20,PrimaryColour=&Hffffff,OutlineColour=&H000000,BorderStyle=3,Alignment=2,MarginV=160'`
    — bottom-center, raised enough to leave room for the CTA bar below.
  - `,drawtext=fontfile='<escaped fontPath>':textfile='<escaped ctaTextFilePath>':fontcolor=white:fontsize=28:box=1:boxcolor=black@0.6:boxborderw=10:x=(w-text_w)/2:y=h-70`
    — persistent CTA bar near the bottom edge, visible for the whole clip
    (no `enable=` clause).
  - Paths are escaped per ffmpeg filter syntax (colons and backslashes
    escaped) since Windows paths contain both.
- `prepareSubtitleAssets(text: string, durationSec: number, ctaUrl: string, tempDir: string): Promise<{ srtPath: string; ctaTextPath: string }>` —
  builds the segments/SRT via `subtitles.ts`, writes the `.srt` and the
  CTA `.txt` into `tempDir`, returns their paths. This is the only new
  function with file I/O; everything it delegates to is pure.

### Extended `src/main/config.ts`

- New required key: `REEL_CTA_URL`.
- New optional key: `SUBTITLE_FONT_PATH`, defaulting to
  `C:/Windows/Fonts/arial.ttf` (Arial covers Cyrillic).

### Extended `src/main/pipeline.ts`

After `downloadVideo` and before `processVideo`, `runPipeline` now:
1. Calls `getVideoDuration(rawPath)`.
2. Calls `prepareSubtitleAssets(text, duration, ctaUrl, tempDir)`.
3. Passes `subtitlesPath`, `ctaTextFilePath`, and `fontPath` into the
   `processVideo` call alongside the existing `inputVideoPath`,
   `musicTrackPath`, `outputPath`.

## Data flow

```
text → HeyGen → raw.mp4
  → getVideoDuration(raw.mp4) → durationSec
  → splitIntoSentences(text) → buildSubtitleSegments(_, durationSec) → buildSrt
  → write subtitles.srt + cta.txt (prepareSubtitleAssets)
  → ffmpeg: scale/pad to 9:16 + subtitles filter + CTA drawtext + background music mix
  → final.mp4 → publish
```

## Error handling

- Missing `REEL_CTA_URL` in `.env` throws at config load time, identical
  to the other required HeyGen variables.
- `ffprobe` not found or failing surfaces the same way `ffmpeg` failures
  already do — a rejected promise with the process's stderr, caught and
  shown in the renderer's status line.
- If `text` contains no sentence-ending punctuation at all,
  `splitIntoSentences` returns the whole text as a single sentence (no
  special-casing needed) rather than an empty array.

## Testing

- `subtitles.test.ts`: `splitIntoSentences` (multiple sentences, trailing
  punctuation, ellipsis, single sentence with no punctuation);
  `buildSubtitleSegments` (even division across a given duration);
  `buildSrt` (correct `.srt` timestamp formatting for known input).
- `videoProcessor.test.ts`: extend `buildFfmpegArgs` tests to assert the
  filter string contains the `subtitles=` and `drawtext=...textfile=`
  clauses with the expected (escaped) paths; new `getVideoDuration` tests
  against a mocked `spawn` that prints a known duration to stdout.
- `pipeline.test.ts`: update the mocked `deps` to include
  `getVideoDuration` and `prepareSubtitleAssets`, and assert they're
  called in order between `downloadVideo` and `processVideo`, with their
  results passed through correctly.
