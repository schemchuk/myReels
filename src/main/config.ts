import * as path from 'path';

export interface AppConfig {
  heygenApiKey: string;
  heygenAvatarId: string;
  heygenVoiceId: string;
  outputDir: string;
  musicTrackPath: string;
  reelCtaUrl: string;
  subtitleFontPath: string;
  reelQrCodePath?: string;
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
    subtitleFontPath: env.SUBTITLE_FONT_PATH ?? DEFAULT_SUBTITLE_FONT_PATH,
    reelQrCodePath: env.REEL_QR_CODE_PATH
  };
}
