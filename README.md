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
   - `REEL_QR_CODE_PATH` — path to a QR code image for video overlay
     (optional).
3. Install [ffmpeg](https://ffmpeg.org/) and make sure `ffmpeg` is on your
   PATH (`ffmpeg -version` should print a version, not "command not
   found").
4. `npm start`

## Launch from the terminal

A Git Bash / Windows CMD wrapper is included so you can start the app with
a single command.

From the project root:

```bash
# Git Bash
./reels

# Windows CMD
.\reels.cmd
```

To run `reels` from anywhere in Git Bash, add the project folder to your
PATH:

```bash
export PATH="$PATH:/c/Users/shemc/myVSCodeProjects/myReels"
```

To make it permanent, add that line to `~/.bashrc`.

You can also use the npm script:

```bash
npm run reels
```

## Switching HeyGen accounts

`avatar_id` and `voice_id` belong to the HeyGen account that created them.
To use your second paid account with the *same* persona, that persona
must already exist there (re-created Instant/Photo Avatar, or a Studio
Avatar transferred via HeyGen support) — then just update `.env` with the
second account's key and the persona's IDs in that account.

## Tests

`npm test`
