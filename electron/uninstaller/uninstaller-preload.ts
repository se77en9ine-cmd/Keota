import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getInstallPath: () => ipcRenderer.invoke('get-install-path'),
  startUninstall: (opts: any) => ipcRenderer.invoke('start-uninstall', opts),
  onProgress: (cb: (data: { percent: number; message: string }) => void) => {
    ipcRenderer.on('uninstall-progress', (_, data) => cb(data));
  },
  finishAndSelfDelete: () => ipcRenderer.invoke('finish-and-self-delete'),
  close: () => ipcRenderer.invoke('win-close'),
});
