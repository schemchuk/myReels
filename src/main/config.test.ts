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
