import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';

let win: BrowserWindow | null = null;

export function initUninstaller() {
  function createWindow() {
    win = new BrowserWindow({
      width: 600,
      height: 480,
      resizable: false,
      maximizable: false,
      frame: false,
      transparent: false,
      show: false,
      backgroundColor: '#f1f3f7',
      webPreferences: {
        preload: path.join(__dirname, 'uninstaller-preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const uiPath = path.join(__dirname, 'ui', 'index.html');
    win.loadFile(uiPath);

    win.once('ready-to-show', () => {
      win?.show();
      win?.focus();
    });
  }

  function getInstalledDir(): string {
    const currentExeDir = path.dirname(process.execPath);
    if (fs.existsSync(path.join(currentExeDir, '39POS Enterprise.exe'))) {
      return currentExeDir;
    }
    const defaultLocal = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Programs', '39POS Enterprise');
    return defaultLocal;
  }

  ipcMain.handle('get-install-path', () => {
    return getInstalledDir();
  });

  ipcMain.handle('start-uninstall', async (event, opts) => {
    const { keepDatabase, removeShortcuts } = opts;
    const targetDir = getInstalledDir();

    event.sender.send('uninstall-progress', { percent: 15, message: 'Stopping running 39POS Enterprise processes...' });
    exec('taskkill /F /IM "39POS Enterprise.exe" /T', () => {});
    await new Promise((r) => setTimeout(r, 600));

    event.sender.send('uninstall-progress', { percent: 35, message: 'Removing shortcuts and shell integrations...' });
    if (removeShortcuts) {
      const desktopLnk = path.join(os.homedir(), 'Desktop', '39POS Enterprise.lnk');
      if (fs.existsSync(desktopLnk)) fs.unlinkSync(desktopLnk);

      const startMenuFolder = path.join(
        process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
        'Microsoft',
        'Windows',
        'Start Menu',
        'Programs',
        '39POS Enterprise'
      );
      if (fs.existsSync(startMenuFolder)) {
        try {
          fs.rmSync(startMenuFolder, { recursive: true, force: true });
        } catch (_) {}
      }
    }

    event.sender.send('uninstall-progress', { percent: 60, message: 'Deregistering Windows Registry entries...' });
    const regKey = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\39POS-Enterprise`;
    exec(`reg delete "${regKey}" /f`, () => {});
    const runKey = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run`;
    exec(`reg delete "${runKey}" /v "39POSEnterprise" /f`, () => {});

    event.sender.send('uninstall-progress', { percent: 80, message: 'Cleaning up program files...' });

    if (!keepDatabase) {
      const userData = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), '39POS-Enterprise');
      if (fs.existsSync(userData)) {
        try {
          fs.rmSync(userData, { recursive: true, force: true });
        } catch (_) {}
      }
    }

    if (fs.existsSync(targetDir)) {
      try {
        const items = fs.readdirSync(targetDir);
        for (const item of items) {
          if (item.toLowerCase() === 'uninstall.exe') continue;
          const itemPath = path.join(targetDir, item);
          try {
            fs.rmSync(itemPath, { recursive: true, force: true });
          } catch (_) {}
        }
      } catch (_) {}
    }

    await new Promise((r) => setTimeout(r, 400));
    event.sender.send('uninstall-progress', { percent: 100, message: 'Uninstallation complete!' });
  });

  ipcMain.handle('finish-and-self-delete', () => {
    const targetDir = getInstalledDir();
    const cleanupScript = `timeout /t 2 /nobreak > NUL & rmdir /s /q "${targetDir}"`;
    exec(`cmd.exe /c "${cleanupScript}"`, { windowsHide: true });
    app.quit();
  });

  ipcMain.handle('win-close', () => app.quit());

  if (app.isReady()) {
    createWindow();
  } else {
    app.on('ready', createWindow);
  }
}

if (require.main === module) {
  initUninstaller();
}
