import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { loadConfig } from './config';
import { HeyGenClient } from './heygenClient';
import { processVideo } from './videoProcessor';
import { LocalSavePublisher } from './publisher';
import { runPipeline } from './pipeline';

dotenv.config();

function createWindow(): void {
  const win = new BrowserWindow({
    width: 480,
    height: 640,
    webPreferences: {
      preload: path.join(__dirname, '../renderer/preload.js'),
      contextIsolation: true
    }
  });
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
  win.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('generate-reel', async (_event, text: string) => {
    const config = loadConfig();
    const heygenClient = new HeyGenClient({
      apiKey: config.heygenApiKey,
      avatarId: config.heygenAvatarId,
      voiceId: config.heygenVoiceId
    });
    const publisher = new LocalSavePublisher(config.outputDir);

    return runPipeline(text, {
      heygenClient,
      processVideo,
      publisher,
      tempDir: app.getPath('temp'),
      musicTrackPath: config.musicTrackPath
    });
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
