// ─── 39POS Enterprise Multi-Language Uninstaller Logic ───

let currentStep = 1;
let currentLang = 'en';

const state = {
  keepDatabase: true,
  removeShortcuts: true,
  installDir: '',
};

const isElectron = typeof window.electronAPI !== 'undefined';

// ── Multi-Language Translation Dictionary ──
const I18N = {
  en: {
    name: 'English',
    titlebar: '39POS Enterprise — Uninstaller',
    confirmTitle: 'Uninstall 39POS Enterprise?',
    confirmDesc: 'This will remove 39POS Enterprise from your computer and delete installed program files and shortcuts.',
    optKeepDb: 'Preserve local database & backup cache',
    optShortcuts: 'Remove desktop & start menu shortcuts',
    btnCancel: 'Cancel',
    btnUninstall: 'Uninstall Now',
    removingTitle: 'Removing Application...',
    successTitle: 'Uninstalled Successfully',
    successDesc: '39POS Enterprise has been completely removed from your system.',
    btnFinish: 'Finish',
    status: {
      init: 'Locating install path...',
      processes: 'Stopping running 39POS Enterprise processes...',
      shortcuts: 'Removing shortcuts and shell integrations...',
      registry: 'Deregistering Windows Registry entries...',
      files: 'Cleaning up program files...',
      complete: 'Uninstallation complete!',
    }
  },
  la: {
    name: 'ພາສາລາວ',
    titlebar: '39POS Enterprise — ໂປຣແກຣມຖອນການຕິດຕັ້ງ',
    confirmTitle: 'ຕ້ອງການຖອນການຕິດຕັ້ງ 39POS Enterprise ແທ້ບໍ?',
    confirmDesc: 'ລະບົບຈະລຶບໂປຣແກຣມ 39POS Enterprise ອອກຈາກເຄື່ອງຂອງທ່ານ ລວມທັງໄຟລ໌ລະບົບ ແລະ ປຸ່ມລັດ Shortcuts.',
    optKeepDb: 'ຮັກສາຖານຂໍ້ມູນທ້ອງຖິ່ນ ແລະ ໄຟລ໌ສຳຮອງ (Backup)',
    optShortcuts: 'ລຶບປຸ່ມລັດເທິງ Desktop ແລະ Start Menu',
    btnCancel: 'ຍົກເລີກ',
    btnUninstall: 'ຖອນການຕິດຕັ້ງດຽວນີ້',
    removingTitle: 'ກຳລັງຖອນການຕິດຕັ້ງໂປຣແກຣມ...',
    successTitle: 'ຖອນການຕິດຕັ້ງສຳເລັດສົມບູນ!',
    successDesc: '39POS Enterprise ໄດ້ຖືກລຶບອອກຈາກເຄື່ອງຂອງທ່ານຮຽບຮ້ອຍແລ້ວ.',
    btnFinish: 'ສຳເລັດ',
    status: {
      init: 'ກຳລັງກວດສອບໂຟນເດີຕິດຕັ້ງ...',
      processes: 'ກຳລັງປິດໂປຣແກຣມ 39POS ທີ່ກຳລັງເຮັດວຽກ...',
      shortcuts: 'ກຳລັງລຶບປຸ່ມລັດ ແລະ Shortcuts...',
      registry: 'ກຳລັງລຶບຂໍ້ມູນລົງທະບຽນໃນ Windows Registry...',
      files: 'ກຳລັງລຶບໄຟລ໌ໂປຣແກຣມ...',
      complete: 'ຖອນການຕິດຕັ້ງສຳເລັດສົມບູນ!',
    }
  },
  th: {
    name: 'ภาษาไทย',
    titlebar: '39POS Enterprise — โปรแกรมถอนการติดตั้ง',
    confirmTitle: 'ต้องการถอนการติดตั้ง 39POS Enterprise หรือไม่?',
    confirmDesc: 'การดำเนินการนี้จะลบ 39POS Enterprise ออกจากคอมพิวเตอร์ของคุณ รวมถึงไฟล์โปรแกรมและช็อตคัท',
    optKeepDb: 'เก็บรักษาฐานข้อมูลและไฟล์สำรองข้อมูลในเครื่อง',
    optShortcuts: 'ลบช็อตคัทบนเดสก์ท็อปและ Start Menu',
    btnCancel: 'ยกเลิก',
    btnUninstall: 'ถอนการติดตั้งทันที',
    removingTitle: 'กำลังถอนการติดตั้งโปรแกรม...',
    successTitle: 'ถอนการติดตั้งสำเร็จ!',
    successDesc: '39POS Enterprise ถูกลบออกจากระบบคอมพิวเตอร์ของคุณเรียบร้อยแล้ว',
    btnFinish: 'เสร็จสิ้น',
    status: {
      init: 'กำลังระบุตำแหน่งโฟลเดอร์ติดตั้ง...',
      processes: 'กำลังปิดกระบวนการทำงานของ 39POS...',
      shortcuts: 'กำลังลบช็อตคัทและไฟล์เชื่อมต่อ...',
      registry: 'กำลังลบรายการใน Windows Registry...',
      files: 'กำลังลบไฟล์โปรแกรม...',
      complete: 'ถอนการติดตั้งเสร็จสมบูรณ์!',
    }
  },
  zh: {
    name: '简体中文',
    titlebar: '39POS Enterprise — 卸载向导',
    confirmTitle: '确认卸载 39POS Enterprise？',
    confirmDesc: '此操作将从您的计算机中完全移除 39POS Enterprise，并删除程序文件和快捷方式。',
    optKeepDb: '保留本地数据库与备份缓存文件',
    optShortcuts: '移除桌面及开始菜单快捷方式',
    btnCancel: '取消',
    btnUninstall: '立即卸载',
    removingTitle: '正在卸载应用程序...',
    successTitle: '卸载成功完成！',
    successDesc: '39POS Enterprise 已成功从您的系统中移除。',
    btnFinish: '完成',
    status: {
      init: '正在定位安装路径...',
      processes: '正在关闭正在运行的 39POS 进程...',
      shortcuts: '正在移除快捷方式与关联...',
      registry: '正在清理 Windows 注册表项...',
      files: '正在清理程序安装文件...',
      complete: '卸载操作成功完成！',
    }
  },
  jp: {
    name: '日本語',
    titlebar: '39POS Enterprise — アンインストーラー',
    confirmTitle: '39POS Enterprise をアンインストールしますか？',
    confirmDesc: '39POS Enterprise をコンピューターから削除し、関連するファイルおよびショートカットを削除します。',
    optKeepDb: 'ローカルデータベースとバックアップを保持する',
    optShortcuts: 'デスクトップおよびスタートメニューのショートカットを削除',
    btnCancel: 'キャンセル',
    btnUninstall: '今すぐアンインストール',
    removingTitle: 'アプリケーションを削除しています...',
    successTitle: 'アンインストールが完了しました',
    successDesc: '39POS Enterprise はシステムから完全に削除されました。',
    btnFinish: '完了',
    status: {
      init: 'インストール先を確認中...',
      processes: '実行中の 39POS プロセスを終了中...',
      shortcuts: 'ショートカットを削除中...',
      registry: 'Windows レジストリを登録解除中...',
      files: 'プログラムファイルを削除中...',
      complete: 'アンインストールが完了しました！',
    }
  }
};

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

const btnLangToggle = document.getElementById('btn-lang-toggle');
const langDropdownMenu = document.getElementById('lang-dropdown-menu');
const currentLangLabel = document.getElementById('current-lang-label');

// Apply Language
function setLanguage(lang) {
  if (!I18N[lang]) lang = 'en';
  currentLang = lang;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem('39pos_install_lang', lang);
  } catch (_) {}

  const t = I18N[lang];
  currentLangLabel.textContent = t.name;

  document.querySelectorAll('.lang-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-lang') === lang);
  });

  const map = {
    'txt-titlebar': t.titlebar,
    'txt-confirm-title': t.confirmTitle,
    'txt-confirm-desc': t.confirmDesc,
    'txt-opt-keepdb': t.optKeepDb,
    'txt-opt-shortcuts': t.optShortcuts,
    'txt-btn-cancel': t.btnCancel,
    'txt-btn-uninstall': t.btnUninstall,
    'txt-removing-title': t.removingTitle,
    'txt-success-title': t.successTitle,
    'txt-success-desc': t.successDesc,
    'txt-btn-finish': t.btnFinish,
  };

  for (const [id, text] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
}

// Language Selector Events
btnLangToggle?.addEventListener('click', (e) => {
  e.stopPropagation();
  langDropdownMenu.classList.toggle('open');
});

document.addEventListener('click', () => {
  langDropdownMenu.classList.remove('open');
});

document.querySelectorAll('.lang-item').forEach(item => {
  item.addEventListener('click', () => {
    const lang = item.getAttribute('data-lang');
    if (lang) setLanguage(lang);
    langDropdownMenu.classList.remove('open');
  });
});

async function init() {
  const savedLang = localStorage.getItem('39pos_install_lang') || 'en';
  setLanguage(savedLang);

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

function toggleOption(optEl, chkEl, key) {
  state[key] = !state[key];
  chkEl.classList.toggle('checked', state[key]);
  chkEl.textContent = state[key] ? '✓' : '';
  optEl.setAttribute('aria-checked', String(state[key]));
}

optKeepDb?.addEventListener('click', () => toggleOption(optKeepDb, chkKeepDb, 'keepDatabase'));
optKeepDb?.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    toggleOption(optKeepDb, chkKeepDb, 'keepDatabase');
  }
});

optShortcuts?.addEventListener('click', () => toggleOption(optShortcuts, chkShortcuts, 'removeShortcuts'));
optShortcuts?.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    toggleOption(optShortcuts, chkShortcuts, 'removeShortcuts');
  }
});

document.getElementById('btn-start-uninstall')?.addEventListener('click', () => {
  currentStep = 2;
  updateUI();
  runUninstallation();
});

// Keyboard Navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (currentStep === 1 || currentStep === 3) {
      if (isElectron) window.electronAPI.close();
    }
  } else if (e.key === 'Enter' && currentStep === 1) {
    currentStep = 2;
    updateUI();
    runUninstallation();
  } else if (e.key === 'Enter' && currentStep === 3) {
    if (isElectron && window.electronAPI.finishAndSelfDelete) {
      window.electronAPI.finishAndSelfDelete();
    }
  }
});

function updateUI() {
  [step1, step2, step3].forEach((p, idx) => {
    p.classList.toggle('active', idx + 1 === currentStep);
  });
}

function runUninstallation() {
  const t = I18N[currentLang] || I18N.en;

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
      
      if (p < 30) unStatusText.textContent = t.status.processes;
      else if (p < 65) unStatusText.textContent = t.status.files;
      else if (p < 90) unStatusText.textContent = t.status.shortcuts;
      else unStatusText.textContent = t.status.complete;

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
