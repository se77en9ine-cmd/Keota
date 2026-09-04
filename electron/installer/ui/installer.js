// ─── 39POS Enterprise Multi-Language Neumorphic Installer Controller ───

let currentStep = 1;
const totalSteps = 4;
let currentLang = 'en';

const state = {
  installPath: '',
  createDesktopShortcut: true,
  createStartMenuShortcut: true,
  autoStart: false,
};

const isElectron = typeof window.electronAPI !== 'undefined';

// ── Multi-Language Translation Dictionary ──
const I18N = {
  en: {
    name: 'English',
    titlebar: '39POS Enterprise — Setup Wizard',
    appTitle: '39POS Enterprise',
    appBadge: 'Online Platform Edition — v1.0.0',
    featCloudTitle: 'Cloud Sync',
    featCloudDesc: 'Real-time store & multi-branch synchronisation',
    featFastTitle: 'Ultra Fast POS',
    featFastDesc: 'Dual screen & hardware printer acceleration',
    featOfflineTitle: 'Offline Safe',
    featOfflineDesc: 'Continuous sales even during network outage',
    footerStep1: 'Ready to configure installation',
    btnContinue: 'Continue',
    labelDir: 'Installation Directory',
    labelLocal: 'Local Program Files',
    btnBrowse: 'Browse...',
    labelShortcuts: 'Shortcut & Integration Options',
    optDesktop: 'Create Desktop Shortcut',
    optStartMenu: 'Create Start Menu Shortcut',
    optAutoStart: 'Launch automatically on Windows startup',
    diskReq: '💾 Disk Space Required: ~350 MB',
    diskReady: 'Drive Ready',
    btnBack: 'Back',
    btnInstall: 'Install Now',
    progressFooter: 'Please wait while 39POS Enterprise is being configured...',
    successTitle: 'Installation Completed!',
    successDesc: '39POS Enterprise (Online Platform v1.0.0) has been installed and configured successfully on your system.',
    btnOpenFolder: 'Open Folder',
    btnClose: 'Close',
    btnLaunch: 'Launch 39POS Now',
    tips: [
      { title: '⚡ High-Speed POS Engine', desc: 'Dual-screen customer display and lightning-fast receipt printing.' },
      { title: '☁ Multi-Branch Sync', desc: 'Real-time inventory and pricing sync with Cloud Database.' },
      { title: '🛡 Offline Resilience', desc: 'Automatic offline queue processing prevents missed transactions.' },
      { title: '📊 Advanced Accounting', desc: 'Built-in double-entry ledger, VAT reporting, and live analytics.' },
    ],
    status: {
      init: 'Initializing extraction engine...',
      createDir: 'Creating destination directory...',
      extract: 'Extracting application runtime & modules...',
      shortcuts: 'Configuring Windows shell shortcuts...',
      registry: 'Registering uninstaller in Windows Programs & Features...',
      complete: 'Installation completed successfully!',
    }
  },
  la: {
    name: 'ພາສາລາວ',
    titlebar: '39POS Enterprise — ໂປຣແກຣມຕິດຕັ້ງລະບົບ',
    appTitle: '39POS Enterprise',
    appBadge: 'ລຸ້ນ Online Platform — v1.0.0',
    featCloudTitle: 'ຊິ້ງຂໍ້ມູນຄລາວ',
    featCloudDesc: 'ເຊື່ອມຕໍ່ຂໍ້ມູນຮ້ານ ແລະ ສາຂາແບບ Real-time',
    featFastTitle: 'POS ຄວາມໄວສູງ',
    featFastDesc: 'ຮອງຮັບ 2 ຈໍ ແລະ ເຄື່ອງພິມໃບບິນ hardware',
    featOfflineTitle: 'ຂາຍໄດ້ແບບ Offline',
    featOfflineDesc: 'ຂາຍຕໍ່ເນື່ອງບໍ່ສະດຸດ ເຖິງແມ່ນວ່າເນັດຈະຫຼຸດ',
    footerStep1: 'ພ້ອມຕັ້ງຄ່າການຕິດຕັ້ງ',
    btnContinue: 'ຕໍ່ໄປ',
    labelDir: 'ໂຟນເດີຕິດຕັ້ງ',
    labelLocal: 'ໂຟນເດີ Program Files ຂອງເຄື່ອງ',
    btnBrowse: 'ເລືອກ...',
    labelShortcuts: 'ຕົວເລືອກປຸ່ມລັດ (Shortcuts)',
    optDesktop: 'ສ້າງປຸ່ມລັດເທິງ Desktop',
    optStartMenu: 'ສ້າງປຸ່ມລັດໃນ Start Menu',
    optAutoStart: 'ເປີດໂປຣແກຣມອັດຕະໂນມັດເມື່ອເປີດ Windows',
    diskReq: '💾 ພື້ນທີ່ດິສກ໌ທີ່ຕ້ອງການ: ~350 MB',
    diskReady: 'ພ້ອມຕິດຕັ້ງ',
    btnBack: 'ກັບຄືນ',
    btnInstall: 'ຕິດຕັ້ງດຽວນີ້',
    progressFooter: 'ກະລຸນາລໍຖ້າ ລະບົບກຳລັງຕັ້ງຄ່າ 39POS Enterprise...',
    successTitle: 'ການຕິດຕັ້ງສຳເລັດສົມບູນ!',
    successDesc: '39POS Enterprise (Online Platform v1.0.0) ໄດ້ຮັບການຕິດຕັ້ງ ແລະ ພ້ອມໃຊ້ງານແລ້ວ.',
    btnOpenFolder: 'ເປີດໂຟນເດີ',
    btnClose: 'ປິດ',
    btnLaunch: 'ເປີດ 39POS ດຽວນີ້',
    tips: [
      { title: '⚡ ລະບົບ POS ຄວາມໄວສູງ', desc: 'ຮອງຮັບຈໍສະແດງຜົນລູກຄ້າ ແລະ ການພິມໃບບິນຢ່າງວ່ອງໄວ.' },
      { title: '☁ ຊິ້ງຂໍ້ມູນຫຼາຍສາຂາ', desc: 'ອັບເດດສະຕັອກ ແລະ ລາຄາແບບ Real-time ກັບ Cloud Database.' },
      { title: '🛡 ຮອງຮັບການເຮັດວຽກ Offline', desc: 'ລະບົບບັນທຶກການຂາຍອັດຕະໂນມັດເຖິງແມ່ນວ່າເນັດຈະຫຼຸດ.' },
      { title: '📊 ລະບົບບັນຊີມາດຕະຖານ', desc: 'ລາຍງານລາຍຮັບ-ລາຍຈ່າຍ, ອາກອນ VAT ແລະ ສະຫຼຸບຍອດຂາຍ.' },
    ],
    status: {
      init: 'ກຳລັງກຽມພ້ອມລະບົບຕິດຕັ້ງ...',
      createDir: 'ກຳລັງສ້າງໂຟນເດີປາຍທາງ...',
      extract: 'ກຳລັງແຕກໄຟລ໌ໂປຣແກຣມ ແລະ ຖານຂໍ້ມູນ...',
      shortcuts: 'ກຳລັງສ້າງປຸ່ມລັດ Windows Shortcuts...',
      registry: 'ກຳລັງລົງທະບຽນ Uninstaller ໃນ Windows...',
      complete: 'ການຕິດຕັ້ງສຳເລັດສົມບູນ!',
    }
  },
  th: {
    name: 'ภาษาไทย',
    titlebar: '39POS Enterprise — ตัวช่วยติดตั้งระบบ',
    appTitle: '39POS Enterprise',
    appBadge: 'Online Platform Edition — v1.0.0',
    featCloudTitle: 'ซิงค์คลาวด์เรียลไทม์',
    featCloudDesc: 'เชื่อมโยงข้อมูลหน้าร้านและหลายสาขาแบบเรียลไทม์',
    featFastTitle: 'POS ความเร็วสูง',
    featFastDesc: 'รองรับ 2 หน้าจอ และเครื่องพิมพ์ใบเสร็จฮาร์ดแวร์',
    featOfflineTitle: 'ขายได้แม้ออฟไลน์',
    featOfflineDesc: 'ขายต่อเนื่องไม่สะดุดแม้สัญญาณอินเทอร์เน็ตขาดหาย',
    footerStep1: 'พร้อมกำหนดค่าการติดตั้ง',
    btnContinue: 'ดำเนินการต่อ',
    labelDir: 'ตำแหน่งโฟลเดอร์ติดตั้ง',
    labelLocal: 'โฟลเดอร์ Program Files',
    btnBrowse: 'เลือก...',
    labelShortcuts: 'ตัวเลือกช็อตคัทและการเชื่อมต่อ',
    optDesktop: 'สร้างช็อตคัทบนเดสก์ท็อป',
    optStartMenu: 'สร้างช็อตคัทใน Start Menu',
    optAutoStart: 'เปิดโปรแกรมอัตโนมัติเมื่อเริ่ม Windows',
    diskReq: '💾 พื้นที่ว่างที่ต้องการ: ~350 MB',
    diskReady: 'พร้อมติดตั้ง',
    btnBack: 'ย้อนกลับ',
    btnInstall: 'ติดตั้งทันที',
    progressFooter: 'กรุณารอสักครู่ ระบบกำลังติดตั้ง 39POS Enterprise...',
    successTitle: 'ติดตั้งสำเร็จสมบูรณ์!',
    successDesc: '39POS Enterprise (Online Platform v1.0.0) ได้รับการติดตั้งและกำหนดค่าเรียบร้อยแล้ว',
    btnOpenFolder: 'เปิดโฟลเดอร์',
    btnClose: 'ปิด',
    btnLaunch: 'เปิดใช้งาน 39POS ทันที',
    tips: [
      { title: '⚡ ระบบ POS ความเร็วสูง', desc: 'รองรับจอแสดงผลสำหรับลูกค้าและการพิมพ์ใบเสร็จทันที' },
      { title: '☁ ซิงค์หลายสาขา', desc: 'อัปเดตสินค้าคงคลังและราคาแบบเรียลไทม์กับ Cloud Database' },
      { title: '🛡 มั่นใจแม้ออฟไลน์', desc: 'คิวบันทึกการขายอัตโนมัติป้องกันยอดขายตกหล่น' },
      { title: '📊 บัญชีและการเงินมาตรฐาน', desc: 'สมุดรายวันแยกประเภท ภาษีมูลค่าเพิ่ม และรายงานวิเคราะห์สด' },
    ],
    status: {
      init: 'กำลังเตรียมระบบติดตั้ง...',
      createDir: 'กำลังสร้างโฟลเดอร์ปลายทาง...',
      extract: 'กำลังแตกไฟล์ระบบและฐานข้อมูล...',
      shortcuts: 'กำลังสร้างทางลัดช็อตคัท...',
      registry: 'กำลังลงทะเบียนใน Windows Programs & Features...',
      complete: 'ติดตั้งสำเร็จสมบูรณ์!',
    }
  },
  zh: {
    name: '简体中文',
    titlebar: '39POS Enterprise — 安装向导',
    appTitle: '39POS Enterprise',
    appBadge: '企业在线云端版 — v1.0.0',
    featCloudTitle: '云端实时同步',
    featCloudDesc: '门店与多连锁分店实时数据秒级同步',
    featFastTitle: '超高速收银系统',
    featFastDesc: '支持客显副屏及专业硬件打印机硬件加速',
    featOfflineTitle: '离线稳定运行',
    featOfflineDesc: '网络中断时仍可持续收银与结账',
    footerStep1: '准备就绪，配置安装选项',
    btnContinue: '继续',
    labelDir: '安装目录',
    labelLocal: '本地程序目录',
    btnBrowse: '浏览...',
    labelShortcuts: '快捷方式与系统集成',
    optDesktop: '创建桌面快捷方式',
    optStartMenu: '创建开始菜单快捷方式',
    optAutoStart: '开机自动启动 39POS',
    diskReq: '💾 所需磁盘空间: ~350 MB',
    diskReady: '磁盘就绪',
    btnBack: '上一步',
    btnInstall: '立即安装',
    progressFooter: '请稍候，正在配置 39POS Enterprise 系统...',
    successTitle: '安装完成！',
    successDesc: '39POS Enterprise (Online Platform v1.0.0) 已成功安装并完成系统配置。',
    btnOpenFolder: '打开目录',
    btnClose: '关闭',
    btnLaunch: '立即启动 39POS',
    tips: [
      { title: '⚡ 高性能收银引擎', desc: '支持客显副屏与高速小票收据打印。' },
      { title: '☁ 多连锁门店同步', desc: '库存与售价云端实时同步。' },
      { title: '🛡 断网离线保障', desc: '离线订单自动安全排队入库。' },
      { title: '📊 财务报表与分析', desc: '内置复式记账、增值税报表与实时分析。' },
    ],
    status: {
      init: '正在初始化解压引擎...',
      createDir: '正在创建目标文件夹...',
      extract: '正在部署程序模块与本地数据库...',
      shortcuts: '正在创建 Windows 桌面与菜单快捷方式...',
      registry: '正在注册系统卸载程序...',
      complete: '安装成功完成！',
    }
  },
  jp: {
    name: '日本語',
    titlebar: '39POS Enterprise — セットアップウィザード',
    appTitle: '39POS Enterprise',
    appBadge: 'オンラインプラットフォーム版 — v1.0.0',
    featCloudTitle: 'クラウドリアルタイム同期',
    featCloudDesc: '店舗および複数拠点データのリアルタイム同期',
    featFastTitle: '高速POSエンジン',
    featFastDesc: 'デュアル画面表示およびハードウェアレシート印刷',
    featOfflineTitle: 'オフライン対応',
    featOfflineDesc: 'ネットワーク障害時でも売上登録を継続',
    footerStep1: 'インストールの設定を準備中',
    btnContinue: '次へ',
    labelDir: 'インストール先フォルダ',
    labelLocal: 'プログラムフォルダ',
    btnBrowse: '参照...',
    labelShortcuts: 'ショートカットと設定',
    optDesktop: 'デスクトップにショートカットを作成',
    optStartMenu: 'スタートメニューに追加',
    optAutoStart: 'Windows起動時に自動起動',
    diskReq: '💾 必要ディスク容量: ~350 MB',
    diskReady: '準備完了',
    btnBack: '戻る',
    btnInstall: '今すぐインストール',
    progressFooter: '39POS Enterprise の設定を行っています。しばらくお待ちください...',
    successTitle: 'インストールが完了しました！',
    successDesc: '39POS Enterprise (Online Platform v1.0.0) が正常にインストールされました。',
    btnOpenFolder: 'フォルダを開く',
    btnClose: '閉じる',
    btnLaunch: '今すぐ 39POS を起動',
    tips: [
      { title: '⚡ 高速POSエンジン', desc: 'カスタマーディスプレイと高速レシート印刷に対応。' },
      { title: '☁ 複数店舗同期', desc: '在庫と価格をクラウドデータベースと同期。' },
      { title: '🛡 オフライン復元力', desc: 'オフラインキューによる確実な取引保存。' },
      { title: '📊 高度な会計分析', desc: '複式簿記、税務レポート、リアルタイム売上分析を搭載。' },
    ],
    status: {
      init: '解凍エンジンを初期化しています...',
      createDir: 'インストール先を作成しています...',
      extract: 'プログラムとデータベースを展開中...',
      shortcuts: 'ショートカットを作成しています...',
      registry: 'アンインストーラーを登録中...',
      complete: 'インストールが完了しました！',
    }
  }
};

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

const btnLangToggle = document.getElementById('btn-lang-toggle');
const langDropdownMenu = document.getElementById('lang-dropdown-menu');
const currentLangLabel = document.getElementById('current-lang-label');

let tipIndex = 0;
let tipInterval = null;

// Apply Language
function setLanguage(lang) {
  if (!I18N[lang]) lang = 'en';
  currentLang = lang;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem('39pos_install_lang', lang);
    localStorage.setItem('i18nextLng', lang);
  } catch (_) {}

  const t = I18N[lang];
  currentLangLabel.textContent = t.name;

  document.querySelectorAll('.lang-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-lang') === lang);
  });

  // Update UI texts
  const map = {
    'txt-titlebar': t.titlebar,
    'txt-app-title': t.appTitle,
    'txt-app-badge': t.appBadge,
    'txt-feat-cloud-title': t.featCloudTitle,
    'txt-feat-cloud-desc': t.featCloudDesc,
    'txt-feat-fast-title': t.featFastTitle,
    'txt-feat-fast-desc': t.featFastDesc,
    'txt-feat-offline-title': t.featOfflineTitle,
    'txt-feat-offline-desc': t.featOfflineDesc,
    'txt-footer-step1': t.footerStep1,
    'txt-btn-continue': t.btnContinue,
    'txt-label-dir': t.labelDir,
    'txt-label-local': t.labelLocal,
    'txt-btn-browse': t.btnBrowse,
    'txt-label-shortcuts': t.labelShortcuts,
    'txt-opt-desktop': t.optDesktop,
    'txt-opt-startmenu': t.optStartMenu,
    'txt-opt-autostart': t.optAutoStart,
    'txt-disk-req': t.diskReq,
    'txt-disk-status': t.diskReady,
    'txt-btn-back': t.btnBack,
    'txt-btn-install': t.btnInstall,
    'txt-progress-footer': t.progressFooter,
    'txt-success-title': t.successTitle,
    'txt-success-desc': t.successDesc,
    'txt-btn-openfolder': t.btnOpenFolder,
    'txt-btn-close': t.btnClose,
    'txt-btn-launch': t.btnLaunch,
  };

  for (const [id, text] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // Update Tips Carousel
  if (t.tips && t.tips.length > 0) {
    tipTitle.textContent = t.tips[tipIndex % t.tips.length].title;
    tipDesc.textContent = t.tips[tipIndex % t.tips.length].desc;
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

// Initialize default path & language
async function init() {
  const savedLang = localStorage.getItem('39pos_install_lang') || localStorage.getItem('i18nextLng') || 'en';
  setLanguage(savedLang);

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
    dot.removeAttribute('aria-current');
    if (idx + 1 === step) {
      dot.classList.add('active');
      dot.setAttribute('aria-current', 'step');
      dot.textContent = String(idx + 1);
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
  state.installPath = e.target.value.trim();
});

// Toggle handler helper
function toggleOption(optEl, chkEl, key) {
  state[key] = !state[key];
  chkEl.classList.toggle('checked', state[key]);
  chkEl.textContent = state[key] ? '✓' : '';
  optEl.setAttribute('aria-checked', String(state[key]));
}

optDesktop?.addEventListener('click', () => toggleOption(optDesktop, chkDesktop, 'createDesktopShortcut'));
optDesktop?.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    toggleOption(optDesktop, chkDesktop, 'createDesktopShortcut');
  }
});

optStartMenu?.addEventListener('click', () => toggleOption(optStartMenu, chkStartMenu, 'createStartMenuShortcut'));
optStartMenu?.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    toggleOption(optStartMenu, chkStartMenu, 'createStartMenuShortcut');
  }
});

optAutoStart?.addEventListener('click', () => toggleOption(optAutoStart, chkAutoStart, 'autoStart'));
optAutoStart?.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    toggleOption(optAutoStart, chkAutoStart, 'autoStart');
  }
});

// Start Installation
document.getElementById('btn-install-now')?.addEventListener('click', () => {
  state.installPath = inputPath.value.trim() || state.installPath;
  currentStep = 3;
  updateStepperUI(currentStep);
  runInstallation();
});

// Keyboard Navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (currentStep === 1 || currentStep === 4) {
      if (isElectron) window.electronAPI.close();
    } else if (currentStep === 2) {
      currentStep = 1;
      updateStepperUI(currentStep);
    }
  } else if (e.key === 'Enter' && !['input', 'textarea'].includes(document.activeElement?.tagName?.toLowerCase())) {
    if (currentStep === 1) {
      currentStep = 2;
      updateStepperUI(currentStep);
    } else if (currentStep === 2) {
      state.installPath = inputPath.value.trim() || state.installPath;
      currentStep = 3;
      updateStepperUI(currentStep);
      runInstallation();
    } else if (currentStep === 4) {
      if (isElectron && window.electronAPI.launchApp) {
        window.electronAPI.launchApp(state.installPath);
      }
    }
  }
});

function runInstallation() {
  const t = I18N[currentLang] || I18N.en;
  statusLog.textContent = t.status.init;

  tipInterval = setInterval(() => {
    const currentTips = (I18N[currentLang] || I18N.en).tips;
    tipIndex = (tipIndex + 1) % currentTips.length;
    tipTitle.textContent = currentTips[tipIndex].title;
    tipDesc.textContent = currentTips[tipIndex].desc;
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
        }, 700);
      }
    });

    window.electronAPI.startInstall({
      targetDir: state.installPath,
      desktopShortcut: state.createDesktopShortcut,
      startMenuShortcut: state.createStartMenuShortcut,
      autoStart: state.autoStart,
      language: currentLang,
    });
  } else {
    // Fallback simulation for browser/development preview
    let p = 0;
    const interval = setInterval(() => {
      p += 4;
      progressPercent.textContent = `${Math.min(100, p)}%`;
      progressFill.style.width = `${Math.min(100, p)}%`;
      
      if (p < 25) statusLog.textContent = t.status.extract;
      else if (p < 60) statusLog.textContent = t.status.shortcuts;
      else if (p < 85) statusLog.textContent = t.status.registry;
      else statusLog.textContent = t.status.complete;

      if (p >= 100) {
        clearInterval(interval);
        clearInterval(tipInterval);
        setTimeout(finishInstallation, 700);
      }
    }, 120);
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
