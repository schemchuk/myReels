# HeyGen Reels Generator — Design

## Purpose

A desktop app where the user pastes/types text into a window, clicks generate,
and gets back a finished vertical (9:16) video with background music,
ready to post as an Instagram/TikTok Reel — generated via HeyGen's avatar +
voice API using a persona the user already owns (API key, `avatar_id`,
`voice_id`).

## Scope (this iteration)

- Single active HeyGen profile (one API key / avatar / voice) via `.env`.
  Switching to the user's second HeyGen account later just means editing
  `.env` values — no multi-profile UI in this iteration.
- No subtitles in this iteration.
- Output is saved to a local folder; no auto-publish in this iteration.
- Future direction (not built now, but the design should not block it):
  - The app may grow into a web/SaaS product — UI and service code should
    be reusable as a web frontend + API later.
  - Auto-publish to Instagram (user has done this manually with the
    Instagram Graph API before) should be addable via the `Publisher`
    interface without touching the rest of the pipeline.
  - Multiple HeyGen profiles with in-UI switching (relevant since the user
    holds two paid HeyGen accounts) may be added later behind the same
    config loading interface.

## Stack

Electron + Node.js/TypeScript. Chosen over a Python/PySide MVP because the
user wants a path to a future web/SaaS version: an Electron renderer is
already an HTML/CSS/JS web UI, and the main-process service layer
(HeyGen client, video processor, publisher) is plain Node code that can be
lifted into an Express/Fastify API later with minimal rework.

## Architecture

### Components

1. **Renderer (UI)** — Electron window: textarea for input text, "Create
   Reel" button, output folder display, status log (generating →
   downloading → processing → done/error).
2. **Config** — loads `.env`: `HEYGEN_API_KEY`, `HEYGEN_AVATAR_ID`,
   `HEYGEN_VOICE_ID`, `OUTPUT_DIR`, `MUSIC_TRACK_PATH`.
3. **HeyGenClient**
   - `generateVideo(text)` — POST to HeyGen video generation endpoint with
     `avatar_id`, `voice_id`, and the input text. Returns `video_id`.
   - `pollStatus(video_id)` — polls until status is `completed` or
     `failed`, with an overall timeout (~5 minutes).
   - `downloadVideo(url)` — downloads the raw result to a temp file.
4. **VideoProcessor** (ffmpeg-based)
   - Normalizes output to 9:16 (pad/crop) if HeyGen's output isn't already
     in that aspect ratio.
   - Mixes in a background music track under the avatar's voice track at
     a low volume.
   - Renders the final `.mp4`.
5. **Publisher** (interface, single implementation for now)
   - `LocalSavePublisher` — writes the final file into `OUTPUT_DIR`.
   - Interface is defined so a future `InstagramPublisher` (Graph API) can
     be added later without changing the rest of the pipeline.

### Data flow

```
Text (UI) → HeyGenClient.generateVideo → pollStatus → downloadVideo (raw .mp4)
  → VideoProcessor (9:16 + background music) → final .mp4
  → Publisher.publish() [LocalSavePublisher] → path shown in UI
```

### Error handling

- HeyGen API errors (bad key, rate limit, `failed` status) and polling
  timeouts surface in the UI with a clear message; the pipeline stops
  without producing a partial output file.
- ffmpeg failures are logged and stop the pipeline before any file is
  moved into `OUTPUT_DIR`.

### Avatar/account portability note

`avatar_id` and `voice_id` are scoped to the HeyGen account they were
created in. The user's second paid API key (different account) can only
generate videos with the same persona if that persona was also created in
that second account (re-uploaded Instant/Photo Avatar, or a Studio Avatar
manually transferred via HeyGen support) — it will then have its own
`avatar_id`. Switching `.env` to the second key only works as-is if the
persona already exists there.

## Testing

- Unit tests for `HeyGenClient` against mocked HTTP responses
  (success / failed / timeout).
- Unit tests for `VideoProcessor`'s ffmpeg command construction.
- One manual end-to-end run with a short real text before first use.

## Project structure

```
src/
  main/
    config.ts
    heygenClient.ts
    videoProcessor.ts
    publisher.ts
    index.ts        (Electron main process, wires the pipeline)
  renderer/
    index.html
    renderer.ts
.env.example
```
