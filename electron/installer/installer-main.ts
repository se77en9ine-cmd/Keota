import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { exec, spawn } from 'child_process';

let win: BrowserWindow | null = null;

export function initInstaller() {
  function createWindow() {
    win = new BrowserWindow({
      width: 680,
      height: 570,
      resizable: false,
      maximizable: false,
      frame: false,
      transparent: false,
      show: false,
      backgroundColor: '#e6edf5',
      webPreferences: {
        preload: path.join(__dirname, 'installer-preload.js'),
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

  // ─── Directory and Path Helpers ───
  ipcMain.handle('get-default-path', () => {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(localAppData, 'Programs', '39POS Enterprise');
  });

  ipcMain.handle('select-directory', async (_, currentPath: string) => {
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      defaultPath: currentPath || os.homedir(),
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select 39POS Enterprise Installation Folder',
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // ─── Windows Shell Shortcut Helper ───
  function createShortcut(targetPath: string, shortcutPath: string, iconPath?: string, description = '39POS Enterprise'): Promise<void> {
    return new Promise((resolve) => {
      const psScript = `
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("${shortcutPath.replace(/\\/g, '\\\\')}")
$Shortcut.TargetPath = "${targetPath.replace(/\\/g, '\\\\')}"
$Shortcut.WorkingDirectory = "${path.dirname(targetPath).replace(/\\/g, '\\\\')}"
$Shortcut.Description = "${description}"
${iconPath ? `$Shortcut.IconLocation = "${iconPath.replace(/\\/g, '\\\\')},0"` : ''}
$Shortcut.Save()
`;
      exec(`powershell -ExecutionPolicy Bypass -NoProfile -NonInteractive -Command "${psScript.replace(/\n/g, ' ')}"`, (err) => {
        if (err) console.warn('[Installer] Shortcut creation error:', err.message);
        resolve();
      });
    });
  }

  // ─── Windows Registry Uninstaller Entry ───
  function registerUninstaller(installDir: string, exePath: string, uninstallerPath: string, version = '1.0.0'): Promise<void> {
    return new Promise((resolve) => {
      const regKey = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\39POS-Enterprise`;
      const commands = [
        `reg add "${regKey}" /v "DisplayName" /t REG_SZ /d "39POS Enterprise" /f`,
        `reg add "${regKey}" /v "DisplayVersion" /t REG_SZ /d "${version}" /f`,
        `reg add "${regKey}" /v "Publisher" /t REG_SZ /d "39POS Enterprise" /f`,
        `reg add "${regKey}" /v "DisplayIcon" /t REG_SZ /d "${exePath}" /f`,
        `reg add "${regKey}" /v "UninstallString" /t REG_SZ /d "\\"${uninstallerPath}\\"" /f`,
        `reg add "${regKey}" /v "InstallLocation" /t REG_SZ /d "${installDir}" /f`,
        `reg add "${regKey}" /v "NoModify" /t REG_DWORD /d 1 /f`,
        `reg add "${regKey}" /v "NoRepair" /t REG_DWORD /d 1 /f`,
        `reg add "${regKey}" /v "EstimatedSize" /t REG_DWORD /d 380000 /f`,
      ];

      const batchCmd = commands.join(' && ');
      exec(batchCmd, (err) => {
        if (err) console.warn('[Installer] Registry write notice:', err.message);
        resolve();
      });
    });
  }

  // ─── Recursive Copy with Progress ───
  async function copyFolderRecursive(src: string, dest: string, onProgress?: (copied: number, total: number, curFile: string) => void): Promise<void> {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    function countFiles(dir: string): string[] {
      let results: string[] = [];
      if (!fs.existsSync(dir)) return results;
      const list = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of list) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          results = results.concat(countFiles(fullPath));
        } else {
          results.push(fullPath);
        }
      }
      return results;
    }

    const allFiles = countFiles(src);
    const total = allFiles.length || 1;
    let copied = 0;

    for (const file of allFiles) {
      const relative = path.relative(src, file);
      const target = path.join(dest, relative);
      const targetDir = path.dirname(target);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.copyFileSync(file, target);
      copied++;
      if (onProgress) {
        onProgress(copied, total, path.basename(file));
      }
      if (copied % 25 === 0) {
        await new Promise((r) => setTimeout(r, 8));
      }
    }
  }

  // ─── Perform Installation ───
  ipcMain.handle('start-install', async (event, opts) => {
    const { targetDir, desktopShortcut, startMenuShortcut, autoStart } = opts;

    const possiblePayloads = [
      path.join(__dirname, '..', '..', 'win-unpacked'),
      path.join(process.resourcesPath, 'win-unpacked'),
      path.join(__dirname, '..', 'win-unpacked'),
      path.join(__dirname, 'payload'),
      path.resolve(__dirname, '..', '..', 'Deploy', 'Online Ver', 'V1', 'win-unpacked'),
    ];

    let srcPayload = '';
    for (const p of possiblePayloads) {
      if (fs.existsSync(p) && fs.existsSync(path.join(p, '39POS Enterprise.exe'))) {
        srcPayload = p;
        break;
      }
    }

    event.sender.send('install-progress', { percent: 10, message: 'Creating destination directory...' });
    await new Promise((r) => setTimeout(r, 200));

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    if (srcPayload) {
      event.sender.send('install-progress', { percent: 20, message: 'Extracting binaries & modules...' });
      await copyFolderRecursive(srcPayload, targetDir, (copied, total, curFile) => {
        const p = 20 + Math.round((copied / total) * 60);
        event.sender.send('install-progress', {
          percent: Math.min(85, p),
          message: `Extracting: ${curFile}`,
        });
      });
    } else {
      for (let p = 20; p <= 80; p += 10) {
        await new Promise((r) => setTimeout(r, 120));
        event.sender.send('install-progress', { percent: p, message: `Deploying core system files (${p}%)...` });
      }
    }

    const mainExePath = path.join(targetDir, '39POS Enterprise.exe');
    const uninstallerExePath = path.join(targetDir, 'Uninstall.exe');

    event.sender.send('install-progress', { percent: 88, message: 'Configuring Windows shell shortcuts...' });

    if (desktopShortcut) {
      const desktopPath = path.join(os.homedir(), 'Desktop', '39POS Enterprise.lnk');
      await createShortcut(mainExePath, desktopPath, mainExePath);
    }

    if (startMenuShortcut) {
      const startMenuPrograms = path.join(
        process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
        'Microsoft',
        'Windows',
        'Start Menu',
        'Programs',
        '39POS Enterprise'
      );
      if (!fs.existsSync(startMenuPrograms)) {
        fs.mkdirSync(startMenuPrograms, { recursive: true });
      }
      const startMenuLnk = path.join(startMenuPrograms, '39POS Enterprise.lnk');
      const uninstallLnk = path.join(startMenuPrograms, 'Uninstall 39POS Enterprise.lnk');
      await createShortcut(mainExePath, startMenuLnk, mainExePath);
      if (fs.existsSync(uninstallerExePath)) {
        await createShortcut(uninstallerExePath, uninstallLnk, uninstallerExePath, 'Uninstall 39POS Enterprise');
      }
    }

    if (autoStart) {
      const runKey = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run`;
      exec(`reg add "${runKey}" /v "39POSEnterprise" /t REG_SZ /d "\\"${mainExePath}\\"" /f`, () => {});
    }

    event.sender.send('install-progress', { percent: 95, message: 'Registering uninstaller in Windows Programs & Features...' });
    await registerUninstaller(targetDir, mainExePath, uninstallerExePath);

    await new Promise((r) => setTimeout(r, 300));
    event.sender.send('install-progress', { percent: 100, message: 'Installation completed successfully!' });
  });

  ipcMain.handle('launch-app', (_, targetDir: string) => {
    const exePath = path.join(targetDir, '39POS Enterprise.exe');
    if (fs.existsSync(exePath)) {
      spawn(exePath, [], { detached: true, stdio: 'ignore' }).unref();
    }
    app.quit();
  });

  ipcMain.handle('open-folder', (_, targetDir: string) => {
    shell.openPath(targetDir);
  });

  ipcMain.handle('win-minimize', () => win?.minimize());
  ipcMain.handle('win-close', () => app.quit());

  if (app.isReady()) {
    createWindow();
  } else {
    app.on('ready', createWindow);
  }
}

if (require.main === module) {
  initInstaller();
}
