import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LocalSavePublisher } from './publisher';

describe('LocalSavePublisher', () => {
  it('copies the final video into the configured output directory and returns the new path', async () => {
    const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heygen-src-'));
    const outputDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'heygen-out-')), 'reels');
    const sourcePath = path.join(sourceDir, 'reel.mp4');
    fs.writeFileSync(sourcePath, 'fake video bytes');

    const publisher = new LocalSavePublisher(outputDir);
    const destination = await publisher.publish(sourcePath);

    expect(destination).toBe(path.join(outputDir, 'reel.mp4'));
    expect(fs.readFileSync(destination, 'utf-8')).toBe('fake video bytes');
  });
});
