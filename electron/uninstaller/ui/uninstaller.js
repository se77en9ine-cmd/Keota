// ─── 39POS Enterprise Uninstaller Logic ───

let currentStep = 1;
const state = {
  keepDatabase: true,
  removeShortcuts: true,
  installDir: '',
};

const isElectron = typeof window.electronAPI !== 'undefined';

const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');
const step3 = document.getElementById('step-3');

const currentInstallDirEl = document.getElementById('current-install-dir');
const optKeepDb = document.getElementById('opt-keep-db');
const chkKeepDb = document.getElementById('chk-keep-db');
const optShortcuts = document.getElementById('opt-shortcuts');
const chkShortcuts = document.getElementById('chk-shortcuts');

const unPercent = document.getElementById('un-percent');
const unStatusText = document.getElementById('un-status-text');
const unProgressFill = document.getElementById('un-progress-fill');

async function init() {
  if (isElectron && window.electronAPI.getInstallPath) {
    state.installDir = await window.electronAPI.getInstallPath();
  } else {
    state.installDir = 'C:\\Users\\User\\AppData\\Local\\Programs\\39POS Enterprise';
  }
  currentInstallDirEl.textContent = state.installDir;

  document.getElementById('btn-close')?.addEventListener('click', () => {
    if (isElectron) window.electronAPI.close();
  });
  document.getElementById('btn-cancel')?.addEventListener('click', () => {
    if (isElectron) window.electronAPI.close();
  });
}

optKeepDb?.addEventListener('click', () => {
  state.keepDatabase = !state.keepDatabase;
  chkKeepDb.classList.toggle('checked', state.keepDatabase);
  chkKeepDb.textContent = state.keepDatabase ? '✓' : '';
});

optShortcuts?.addEventListener('click', () => {
  state.removeShortcuts = !state.removeShortcuts;
  chkShortcuts.classList.toggle('checked', state.removeShortcuts);
  chkShortcuts.textContent = state.removeShortcuts ? '✓' : '';
});

document.getElementById('btn-start-uninstall')?.addEventListener('click', () => {
  currentStep = 2;
  updateUI();
  runUninstallation();
});

function updateUI() {
  [step1, step2, step3].forEach((p, idx) => {
    p.classList.toggle('active', idx + 1 === currentStep);
  });
}

function runUninstallation() {
  if (isElectron && window.electronAPI.startUninstall) {
    window.electronAPI.onProgress((data) => {
      const { percent, message } = data;
      unPercent.textContent = `${Math.round(percent)}%`;
      unProgressFill.style.width = `${percent}%`;
      if (message) unStatusText.textContent = message;

      if (percent >= 100) {
        setTimeout(() => {
          currentStep = 3;
          updateUI();
        }, 600);
      }
    });

    window.electronAPI.startUninstall(state);
  } else {
    let p = 0;
    const interval = setInterval(() => {
      p += 5;
      unPercent.textContent = `${Math.min(100, p)}%`;
      unProgressFill.style.width = `${Math.min(100, p)}%`;
      if (p < 30) unStatusText.textContent = 'Closing active 39POS processes...';
      else if (p < 70) unStatusText.textContent = 'Removing installed binaries and assets...';
      else unStatusText.textContent = 'Cleaning registry keys and desktop shortcuts...';

      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          currentStep = 3;
          updateUI();
        }, 600);
      }
    }, 120);
  }
}

document.getElementById('btn-finish-uninstall')?.addEventListener('click', () => {
  if (isElectron && window.electronAPI.finishAndSelfDelete) {
    window.electronAPI.finishAndSelfDelete();
  } else if (isElectron) {
    window.electronAPI.close();
  }
});

init();
