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
