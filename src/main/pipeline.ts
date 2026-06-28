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
