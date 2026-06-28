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
