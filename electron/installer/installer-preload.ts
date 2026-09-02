import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getDefaultPath: () => ipcRenderer.invoke('get-default-path'),
  selectDirectory: (curPath: string) => ipcRenderer.invoke('select-directory', curPath),
  startInstall: (opts: any) => ipcRenderer.invoke('start-install', opts),
  onInstallProgress: (cb: (data: { percent: number; message: string }) => void) => {
    ipcRenderer.on('install-progress', (_, data) => cb(data));
  },
  launchApp: (targetDir: string) => ipcRenderer.invoke('launch-app', targetDir),
  openFolder: (targetDir: string) => ipcRenderer.invoke('open-folder', targetDir),
  minimize: () => ipcRenderer.invoke('win-minimize'),
  close: () => ipcRenderer.invoke('win-close'),
});
