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
