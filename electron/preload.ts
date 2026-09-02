import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  openCustomerDisplay: () => ipcRenderer.invoke('open-customer-display'),
  platform: process.platform,
});
