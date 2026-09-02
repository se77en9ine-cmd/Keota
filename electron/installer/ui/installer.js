// ─── 39POS Enterprise Neumorphism Soft UI Installer Controller ───

let currentStep = 1;
const totalSteps = 4;

const state = {
  installPath: '',
  createDesktopShortcut: true,
  createStartMenuShortcut: true,
  autoStart: false,
};

// Check if running inside Electron IPC or fallback
const isElectron = typeof window.electronAPI !== 'undefined';

// DOM Elements
const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');
const step3 = document.getElementById('step-3');
const step4 = document.getElementById('step-4');

const dot1 = document.getElementById('dot-1');
const dot2 = document.getElementById('dot-2');
const dot3 = document.getElementById('dot-3');
const dot4 = document.getElementById('dot-4');

const line1 = document.getElementById('line-1');
const line2 = document.getElementById('line-2');
const line3 = document.getElementById('line-3');

const inputPath = document.getElementById('input-install-path');
const btnBrowse = document.getElementById('btn-browse');

const optDesktop = document.getElementById('opt-desktop');
const chkDesktop = document.getElementById('chk-desktop');
const optStartMenu = document.getElementById('opt-startmenu');
const chkStartMenu = document.getElementById('chk-startmenu');
const optAutoStart = document.getElementById('opt-autostart');
const chkAutoStart = document.getElementById('chk-autostart');

const progressPercent = document.getElementById('progress-percent');
const progressFill = document.getElementById('progress-fill');
const statusLog = document.getElementById('status-log-text');
const tipTitle = document.getElementById('tip-title');
const tipDesc = document.getElementById('tip-desc');
const finalPathEl = document.getElementById('final-install-path');

// Tips carousel during installation
const TIPS = [
  { title: '⚡ High-Speed POS Engine', desc: 'Dual-screen customer display and lightning-fast receipt printing.' },
  { title: '☁ Multi-Branch Sync', desc: 'Real-time inventory and pricing sync with Cloud Database.' },
  { title: '🛡 Offline Resilience', desc: 'Automatic offline queue processing prevents missed transactions.' },
  { title: '📊 Advanced Accounting', desc: 'Built-in double-entry ledger, VAT reporting, and live analytics.' },
];
let tipIndex = 0;

// Initialize default path
async function init() {
  if (isElectron && window.electronAPI.getDefaultPath) {
    state.installPath = await window.electronAPI.getDefaultPath();
  } else {
    state.installPath = 'C:\\Users\\User\\AppData\\Local\\Programs\\39POS Enterprise';
  }
  inputPath.value = state.installPath;

  // Window titlebar controls
  document.getElementById('btn-minimize')?.addEventListener('click', () => {
    if (isElectron) window.electronAPI.minimize();
  });
  document.getElementById('btn-close')?.addEventListener('click', () => {
    if (isElectron) window.electronAPI.close();
  });
}

function updateStepperUI(step) {
  [step1, step2, step3, step4].forEach((p, idx) => {
    p.classList.toggle('active', idx + 1 === step);
  });

  const dots = [dot1, dot2, dot3, dot4];
  const lines = [line1, line2, line3];

  dots.forEach((dot, idx) => {
    dot.classList.remove('active', 'done');
    if (idx + 1 === step) {
      dot.classList.add('active');
    } else if (idx + 1 < step) {
      dot.classList.add('done');
      dot.textContent = '✓';
    } else {
      dot.textContent = String(idx + 1);
    }
  });

  lines.forEach((line, idx) => {
    line.classList.toggle('active', idx + 1 < step);
  });
}

// Step 1 -> 2
document.getElementById('btn-next-1')?.addEventListener('click', () => {
  currentStep = 2;
  updateStepperUI(currentStep);
});

// Step 2 -> 1
document.getElementById('btn-back-2')?.addEventListener('click', () => {
  currentStep = 1;
  updateStepperUI(currentStep);
});

// Directory Browser
btnBrowse?.addEventListener('click', async () => {
  if (isElectron && window.electronAPI.selectDirectory) {
    const selected = await window.electronAPI.selectDirectory(inputPath.value);
    if (selected) {
      inputPath.value = selected;
      state.installPath = selected;
    }
  }
});

inputPath?.addEventListener('input', (e) => {
  state.installPath = e.target.value;
});

// Toggle handlers
optDesktop?.addEventListener('click', () => {
  state.createDesktopShortcut = !state.createDesktopShortcut;
  chkDesktop.classList.toggle('checked', state.createDesktopShortcut);
  chkDesktop.textContent = state.createDesktopShortcut ? '✓' : '';
});

optStartMenu?.addEventListener('click', () => {
  state.createStartMenuShortcut = !state.createStartMenuShortcut;
  chkStartMenu.classList.toggle('checked', state.createStartMenuShortcut);
  chkStartMenu.textContent = state.createStartMenuShortcut ? '✓' : '';
});

optAutoStart?.addEventListener('click', () => {
  state.autoStart = !state.autoStart;
  chkAutoStart.classList.toggle('checked', state.autoStart);
  chkAutoStart.textContent = state.autoStart ? '✓' : '';
});

// Start Installation
document.getElementById('btn-install-now')?.addEventListener('click', () => {
  state.installPath = inputPath.value.trim() || state.installPath;
  currentStep = 3;
  updateStepperUI(currentStep);
  runInstallation();
});

function runInstallation() {
  const tipInterval = setInterval(() => {
    tipIndex = (tipIndex + 1) % TIPS.length;
    tipTitle.textContent = TIPS[tipIndex].title;
    tipDesc.textContent = TIPS[tipIndex].desc;
  }, 3500);

  if (isElectron && window.electronAPI.startInstall) {
    window.electronAPI.onInstallProgress((data) => {
      const { percent, message } = data;
      progressPercent.textContent = `${Math.round(percent)}%`;
      progressFill.style.width = `${percent}%`;
      if (message) statusLog.textContent = message;

      if (percent >= 100) {
        clearInterval(tipInterval);
        setTimeout(() => {
          finishInstallation();
        }, 800);
      }
    });

    window.electronAPI.startInstall({
      targetDir: state.installPath,
      desktopShortcut: state.createDesktopShortcut,
      startMenuShortcut: state.createStartMenuShortcut,
      autoStart: state.autoStart,
    });
  } else {
    // Fallback simulation for preview
    let p = 0;
    const interval = setInterval(() => {
      p += 4;
      progressPercent.textContent = `${Math.min(100, p)}%`;
      progressFill.style.width = `${Math.min(100, p)}%`;
      if (p < 25) statusLog.textContent = 'Extracting application runtime...';
      else if (p < 55) statusLog.textContent = 'Deploying embedded backend & database...';
      else if (p < 85) statusLog.textContent = 'Configuring Windows shell shortcuts...';
      else statusLog.textContent = 'Finalizing setup & registering uninstaller...';

      if (p >= 100) {
        clearInterval(interval);
        clearInterval(tipInterval);
        setTimeout(finishInstallation, 800);
      }
    }, 150);
  }
}

function finishInstallation() {
  currentStep = 4;
  updateStepperUI(currentStep);
  finalPathEl.textContent = state.installPath;

  document.getElementById('btn-open-folder')?.addEventListener('click', () => {
    if (isElectron && window.electronAPI.openFolder) {
      window.electronAPI.openFolder(state.installPath);
    }
  });

  document.getElementById('btn-finish-close')?.addEventListener('click', () => {
    if (isElectron && window.electronAPI.close) {
      window.electronAPI.close();
    }
  });

  document.getElementById('btn-launch-app')?.addEventListener('click', () => {
    if (isElectron && window.electronAPI.launchApp) {
      window.electronAPI.launchApp(state.installPath);
    }
  });
}

init();
