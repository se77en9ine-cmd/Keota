import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';
import net from 'net';
import { initInstaller } from './installer/installer-main';
import { initUninstaller } from './uninstaller/uninstaller-main';

const APP_NAME = '39POS Enterprise';
const APP_VERSION = '1.0.0';
const SERVER_PORT = 5000;
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let customerWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let tray: Tray | null = null;

const isUninstaller =
  process.argv.some((a) => a.toLowerCase().includes('uninstall')) ||
  path.basename(process.execPath).toLowerCase().includes('uninstall');

const isInstaller =
  process.argv.some((a) => a.toLowerCase().includes('installer') || a.toLowerCase().includes('setup')) ||
  path.basename(process.execPath).toLowerCase().includes('setup');

if (isUninstaller) {
  initUninstaller();
} else if (isInstaller) {
  initInstaller();
} else {
  runMainApp();
}

function runMainApp() {
// ─── Ensure single instance ───
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  return;
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// ─── Set userData path for database/storage in production ───
if (!isDev) {
  const userDataPath = path.join(app.getPath('appData'), '39POS-Enterprise');
  app.setPath('userData', userDataPath);
}

function getIconPath(): string {
  const iconFile = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  if (isDev) {
    return path.join(__dirname, '..', 'resources', iconFile);
  }
  return path.join(process.resourcesPath, 'resources', iconFile);
}

let activeServerPort = 5000;

function getAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(getAvailablePort(startPort + 1));
    });
  });
}

// ─── Start embedded Express server ───
async function startServer(): Promise<void> {
  activeServerPort = await getAvailablePort(SERVER_PORT);
  console.log(`[Electron] Using server port: ${activeServerPort}`);

  return new Promise((resolve, reject) => {
    const serverEntry = isDev
      ? path.join(__dirname, '..', '..', 'server', 'dist', 'server.js')
      : path.join(process.resourcesPath, 'server', 'server.js');

    const clientDist = isDev
      ? path.join(__dirname, '..', '..', 'client', 'dist')
      : path.join(process.resourcesPath, 'client-dist');

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      NODE_ENV: 'production',
      PORT: String(activeServerPort),
      ELECTRON_RUN_AS_NODE: '1',
      CLIENT_DIST_PATH: clientDist,
      ELECTRON_USER_DATA: app.getPath('userData'),
      ELECTRON_APP_PATH: isDev ? path.join(__dirname, '..', '..') : process.resourcesPath,
    };

    console.log(`[Electron] Starting server: ${serverEntry}`);
    console.log(`[Electron] Client dist path: ${clientDist}`);
    serverProcess = spawn(process.execPath, [serverEntry], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: isDev ? path.join(__dirname, '..', '..') : process.resourcesPath,
    });

    serverProcess.stdout?.on('data', (data) => {
      console.log(`[Server] ${data.toString().trim()}`);
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error(`[Server ERR] ${data.toString().trim()}`);
    });

    serverProcess.on('error', (err) => {
      console.error('[Electron] Failed to start server:', err);
      reject(err);
    });

    serverProcess.on('exit', (code) => {
      console.log(`[Electron] Server exited with code ${code}`);
    });

    // Poll for server readiness
    let attempts = 0;
    const maxAttempts = 60; // 30 seconds
    const poll = setInterval(() => {
      attempts++;
      http
        .get(`http://localhost:${activeServerPort}/api/health`, (res) => {
          if (res.statusCode === 200) {
            clearInterval(poll);
            console.log('[Electron] Server is ready.');
            resolve();
          }
        })
        .on('error', () => {
          if (attempts >= maxAttempts) {
            clearInterval(poll);
            reject(new Error('Server failed to start within 30 seconds'));
          }
        });
    }, 500);
  });
}

// ─── Create main application window ───
function createWindow() {
  const iconPath = getIconPath();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: APP_NAME,
    icon: iconPath,
    show: false,
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://localhost:${activeServerPort}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.on('close', (e) => {
    if (tray && !(app as any).isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (!isDev) {
    mainWindow.setMenuBarVisibility(false);
  }
}

// ─── System tray ───
function createTray() {
  const iconPath = getIconPath();
  let icon: Electron.NativeImage;

  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      icon = nativeImage.createEmpty();
    }
  } catch {
    icon = nativeImage.createEmpty();
  }

  try {
    tray = new Tray(icon.resize({ width: 16, height: 16 }));

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `${APP_NAME} v${APP_VERSION}`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Open POS',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          } else {
            createWindow();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          (app as any).isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setToolTip(`${APP_NAME} v${APP_VERSION}`);
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (trayErr) {
    console.warn('[Electron] Could not create system tray:', trayErr);
  }
}

// ─── IPC: Customer display ───
ipcMain.handle('open-customer-display', async () => {
  if (customerWindow) {
    customerWindow.focus();
    return;
  }

  customerWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    title: '39POS Customer Display',
    icon: getIconPath(),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  customerWindow.loadURL(`http://localhost:${SERVER_PORT}/display`);

  customerWindow.on('closed', () => {
    customerWindow = null;
  });
});

ipcMain.handle('get-app-info', () => ({
  version: APP_VERSION,
  name: APP_NAME,
  platform: process.platform,
  userData: app.getPath('userData'),
}));

// ─── App lifecycle ───
app.on('ready', async () => {
  try {
    await startServer();
    createTray();
    createWindow();
  } catch (err) {
    console.error('[Electron] Fatal: Could not start server.', err);
    try {
      const { dialog } = require('electron');
      dialog.showErrorBox(
        'Startup Error',
        `Failed to start ${APP_NAME} server.\n\n${err}\n\nThe application will now exit.`
      );
    } catch (_) {}
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') {
    // keep alive
  } else if (!tray) {
    app.quit();
  }
});

app.on('activate', () => {
  if (!mainWindow) {
    createWindow();
  }
});

app.on('before-quit', () => {
  (app as any).isQuitting = true;

  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
    }, 3000);
  }
});
}

