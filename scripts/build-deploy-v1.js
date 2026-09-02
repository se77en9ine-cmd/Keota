/**
 * 39POS Enterprise — Windows Deployment Pipeline (V1)
 * Optimized for Windows 10 and latest Windows 11 releases
 * Target: D:\Google\Antigravity\POS\Deploy\Online Ver\V1
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEPLOY_DIR = 'D:\\Google\\Antigravity\\POS\\Deploy\\Online Ver\\V1';

function log(msg) {
  console.log(`[Deploy Pipeline] ${msg}`);
}

function run(cmd, cwd = ROOT) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`▶ ${cmd}`);
  console.log(`  cwd: ${cwd}`);
  console.log(`${'═'.repeat(60)}\n`);
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  const startTime = Date.now();
  log('Starting Windows 10/11 Production Build & Packaging for 39POS Enterprise...');
  log(`Destination: ${DEPLOY_DIR}`);

  // 0. Ensure no running instances lock output files
  try {
    execSync('taskkill /F /IM "39POS Enterprise.exe" /T', { stdio: 'ignore' });
    execSync('taskkill /F /IM "electron.exe" /T', { stdio: 'ignore' });
  } catch (_) {}

  // 1. Build Workspaces (shared, client, server, electron)
  console.log('\n📦 Step 1: Compiling workspaces (shared, client, server, electron)...');
  run('npm run build', ROOT);
  run('npx tsc -p electron/tsconfig.json', ROOT);

  // 2. Copy UI assets for Installer & Uninstaller
  console.log('\n🎨 Step 2: Syncing Neumorphism Soft UI assets...');
  const installerUiSrc = path.join(ROOT, 'electron', 'installer', 'ui');
  const installerUiDest = path.join(ROOT, 'electron', 'dist', 'installer', 'ui');
  copyDirRecursive(installerUiSrc, installerUiDest);

  const uninstallerUiSrc = path.join(ROOT, 'electron', 'uninstaller', 'ui');
  const uninstallerUiDest = path.join(ROOT, 'electron', 'dist', 'uninstaller', 'ui');
  copyDirRecursive(uninstallerUiSrc, uninstallerUiDest);

  // 3. Package Main Windows App with electron-builder
  console.log('\n⚡ Step 3: Packaging main Windows application with electron-builder...');
  run('npx electron-builder --win', ROOT);

  const unpackedDir = path.join(DEPLOY_DIR, 'win-unpacked');

  // 4. Setup Neumorphic Uninstaller (`Uninstall.exe`) inside win-unpacked & deploy folder
  console.log('\n🛠 Step 4: Configuring Neumorphic Uninstaller...');
  if (fs.existsSync(unpackedDir)) {
    const mainExe = path.join(unpackedDir, '39POS Enterprise.exe');
    const uninstallExe = path.join(unpackedDir, 'Uninstall.exe');
    if (fs.existsSync(mainExe)) {
      fs.copyFileSync(mainExe, uninstallExe);
    }

    const uninstallerDeploy = path.join(DEPLOY_DIR, '39POS-Enterprise-Uninstaller.exe');
    if (fs.existsSync(mainExe)) {
      fs.copyFileSync(mainExe, uninstallerDeploy);
    }

    // Also place Uninstall.bat helper
    const uninstallLauncherBat = `@echo off
cd /d "%~dp0"
if exist "%~dp0Uninstall.exe" (
  start "" "%~dp0Uninstall.exe" --uninstall
) else (
  start "" "%~dp039POS Enterprise.exe" --uninstall
)
`;
    fs.writeFileSync(path.join(unpackedDir, 'Uninstall.bat'), uninstallLauncherBat);
  }

  // 5. Generate Manifest & Release Info
  console.log('\n📋 Step 5: Generating Release Manifest & Documentation...');
  const manifest = {
    productName: '39POS Enterprise',
    edition: 'Online Platform Edition',
    version: '1.0.0',
    buildDate: new Date().toISOString(),
    platform: 'win32',
    arch: 'x64',
    supportedOS: [
      'Windows 11 (all editions, 21H2, 22H2, 23H2, 24H2+)',
      'Windows 10 (all editions, 64-bit)',
      'Windows Server 2019 / 2022 / 2025',
    ],
    artifacts: {
      installer: '39POS-Enterprise-Setup-1.0.0.exe',
      uninstaller: '39POS-Enterprise-Uninstaller.exe',
      portableApplication: 'win-unpacked/39POS Enterprise.exe',
      unpackedDirectory: 'win-unpacked/',
    },
    features: [
      'Neumorphism Soft UI Setup Wizard and Uninstaller',
      'Dual dynamic port discovery to prevent port binding conflicts',
      'Offline-first SQLite with real-time Cloud PostgreSQL sync',
      'Hardware ESC/POS receipt printer & barcode scanner support',
      'Windows 10 & 11 High-DPI and dark/light system adaptation',
    ],
    systemRequirements: {
      os: 'Windows 10 (64-bit) or Windows 11',
      memory: '4 GB RAM minimum (8 GB recommended)',
      diskSpace: '500 MB free space',
    },
  };

  fs.writeFileSync(path.join(DEPLOY_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const readmeContent = `# 39POS Enterprise — Windows Platform Release (V1)
**Edition**: Online Platform Edition  
**Version**: 1.0.0  
**Supported OS**: Windows 10 & Windows 11 (64-bit, all latest updates)  
**Deploy Path**: \`${DEPLOY_DIR}\`

---

## 🎨 Design & Experience (Neumorphism Soft UI)
- **Soft UI Tactile Aesthetics**: Dual-light-source shadows, convex extruded action buttons with spring feedback, recessed debossed fields, and glowing cyber cyan/indigo progress engine.
- **Dynamic Port Resilience**: Automatically detects available ports on Windows to ensure 100% startup success even if port 5000 is occupied.
- **Universal Windows Compatibility**: Optimized for Windows 10, Windows 11, high-DPI scaling, and modern UAC security.

---

## 📦 Release Files

1. **\`39POS-Enterprise-Setup-1.0.0.exe\`**
   - Single-file installer for Windows 10 & 11 with custom directory picker, desktop/start menu shortcut generator, and uninstaller registry integration.
2. **\`39POS-Enterprise-Uninstaller.exe\`**
   - Standalone Neumorphic Uninstaller with data retention toggle and automatic shortcut/registry cleanup.
3. **\`win-unpacked/\`**
   - Standalone portable application folder. Run \`39POS Enterprise.exe\` immediately without installation.
4. **\`manifest.json\`**
   - Comprehensive release specification and system compatibility checklist.
`;

  fs.writeFileSync(path.join(DEPLOY_DIR, 'README.md'), readmeContent);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎉 DEPLOYMENT COMPLETE in ${durationSec}s`);
  console.log(`📂 Output Directory: ${DEPLOY_DIR}`);
  console.log(`${'═'.repeat(60)}\n`);
}

main().catch((err) => {
  console.error('\n❌ Deployment failed:', err);
  process.exit(1);
});
