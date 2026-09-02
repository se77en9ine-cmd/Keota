/**
 * 39POS Enterprise — Full Build & Deploy Pipeline
 * 
 * Steps:
 *  1. Build shared workspace (TypeScript)
 *  2. Build client (Vite production)
 *  3. Build server (TypeScript)
 *  4. Compile Electron main/preload (TypeScript)
 *  5. Run electron-builder to produce NSIS installer
 *  6. Copy output to deploy directory
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEPLOY_DIR = 'D:\\Google\\Antigravity\\POS\\Deploy\\Ver-0.0.1';

function run(cmd, cwd = ROOT) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`▶ ${cmd}`);
  console.log(`  cwd: ${cwd}`);
  console.log(`${'═'.repeat(60)}\n`);
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
}

function step(label) {
  console.log(`\n\n${'━'.repeat(60)}`);
  console.log(`  📦 ${label}`);
  console.log(`${'━'.repeat(60)}\n`);
}

try {
  // ── Step 1: Build shared ──
  step('Step 1/6 — Building shared workspace');
  run('npx tsc', path.join(ROOT, 'shared'));

  // ── Step 2: Build client ──
  step('Step 2/6 — Building Vite client (production)');
  run('npx tsc && npx vite build', path.join(ROOT, 'client'));

  // ── Step 3: Build server ──
  step('Step 3/6 — Building Express server (TypeScript)');
  run('npx tsc', path.join(ROOT, 'server'));

  // ── Step 4: Compile Electron ──
  step('Step 4/6 — Compiling Electron main & preload');
  run('npx tsc -p tsconfig.json', path.join(ROOT, 'electron'));

  // ── Step 5: electron-builder ──
  step('Step 5/6 — Packaging with electron-builder (NSIS)');
  run('npx electron-builder --win --config electron-builder.yml', ROOT);

  // ── Step 6: Copy to deploy directory ──
  step('Step 6/6 — Copying artifacts to deploy directory');
  
  const electronDistDir = path.join(ROOT, 'electron-dist');
  
  if (!fs.existsSync(DEPLOY_DIR)) {
    fs.mkdirSync(DEPLOY_DIR, { recursive: true });
  }

  // Copy installer .exe files
  if (fs.existsSync(electronDistDir)) {
    const files = fs.readdirSync(electronDistDir);
    let copiedCount = 0;
    
    for (const file of files) {
      const src = path.join(electronDistDir, file);
      const stat = fs.statSync(src);
      
      if (stat.isFile() && (file.endsWith('.exe') || file.endsWith('.yml') || file.endsWith('.yaml') || file.endsWith('.blockmap'))) {
        const dest = path.join(DEPLOY_DIR, file);
        fs.copyFileSync(src, dest);
        const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
        console.log(`  ✅ Copied: ${file} (${sizeMB} MB)`);
        copiedCount++;
      }
    }

    // Also copy the unpacked directory if it exists
    const unpackedDir = path.join(electronDistDir, 'win-unpacked');
    if (fs.existsSync(unpackedDir)) {
      const destUnpacked = path.join(DEPLOY_DIR, 'win-unpacked');
      console.log(`  📁 Copying win-unpacked directory...`);
      copyDirRecursive(unpackedDir, destUnpacked);
      console.log(`  ✅ Copied win-unpacked directory`);
    }

    console.log(`\n  📊 Total artifacts copied: ${copiedCount}`);
  } else {
    console.warn('  ⚠️  electron-dist directory not found. Check electron-builder output.');
  }

  console.log(`\n\n${'═'.repeat(60)}`);
  console.log(`  🎉 BUILD COMPLETE`);
  console.log(`  📦 Output: ${DEPLOY_DIR}`);
  console.log(`${'═'.repeat(60)}\n`);

} catch (err) {
  console.error('\n\n❌ BUILD FAILED:', err.message);
  process.exit(1);
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
