import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('reelsApi', {
  generateReel: (text: string) => ipcRenderer.invoke('generate-reel', text)
});
