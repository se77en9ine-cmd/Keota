import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import la from './locales/la.json';
import th from './locales/th.json';
import jp from './locales/jp.json';
import zh from './locales/zh.json';

export type LaoFontStyle = 'regular' | 'looped' | 'modern';

export function getLaoFontStyle(): LaoFontStyle {
  if (typeof window === 'undefined') return 'regular';
  return (localStorage.getItem('39pos_lao_font_style') as LaoFontStyle) || 'regular';
}

export function setLaoFontStyle(style: LaoFontStyle) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('39pos_lao_font_style', style);
    updateAppFont(i18n.language || 'la');
    window.dispatchEvent(new CustomEvent('39pos-lao-font-changed', { detail: { style } }));
  }
}

export function getLaoFontFamily(style?: LaoFontStyle): string {
  const current = style || getLaoFontStyle();
  if (current === 'looped') {
    return "'Noto Sans Lao Looped', 'Noto Sans Lao', 'Phetsarath OT', sans-serif";
  }
  return "'Noto Sans Lao', 'Saysettha OT', sans-serif";
}

export const fontMap: Record<string, { family: () => string; name: string; weight: string }> = {
  la: {
    family: () => getLaoFontFamily(),
    name: 'Noto Sans Lao',
    weight: '400',
  },
  th: {
    family: () => "'Noto Sans Thai Light', 'Noto Sans Thai', sans-serif",
    name: 'Noto Sans Thai Light',
    weight: '300',
  },
  jp: {
    family: () => "'Noto Serif Japanese', 'Noto Serif JP', serif",
    name: 'Noto Serif Japanese',
    weight: '400',
  },
  zh: {
    family: () => "'Noto Serif Simplified Chinese', 'Noto Serif SC', serif",
    name: 'Noto Serif Simplified Chinese',
    weight: '400',
  },
  en: {
    family: () => "'Arial Narrow', 'Roboto Condensed', 'Nimbus Sans Narrow', sans-serif",
    name: 'Arial Narrow',
    weight: '400',
  },
};

export function updateAppFont(lng: string) {
  const normalized = (lng || 'en').toLowerCase().split('-')[0];
  const entry = fontMap[normalized] || fontMap['en'];
  const family = entry.family();
  document.documentElement.style.setProperty('--app-font', family);
  document.documentElement.setAttribute('data-app-font', entry.name);
  document.documentElement.lang = normalized;
  if (document.body) {
    document.body.style.fontFamily = family;
  }

  let styleEl = document.getElementById('dynamic-app-font-override');
  if (!styleEl && typeof document !== 'undefined') {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-app-font-override';
    document.head.appendChild(styleEl);
  }
  if (styleEl) {
    const isLaoOrThai = normalized === 'la' || normalized === 'th';
    const lineHeightRule = isLaoOrThai ? 'line-height: 1.6 !important;' : '';
    const tablePaddingRule = isLaoOrThai ? `
      table th, table td {
        padding-top: 0.75rem !important;
        padding-bottom: 0.75rem !important;
      }
      h1, h2, h3, h4, h5, h6, .card-title, .modal-title {
        line-height: 1.5 !important;
      }
      .badge, .neu-pill, .btn, button {
        line-height: 1.45 !important;
      }
    ` : '';

    styleEl.textContent = `
      /* Global Typography & Font Family Enforcement across all menus, headers, bodies, forms, and buttons */
      html, body, nav, header, footer, button, h1, h2, h3, h4, h5, h6,
      th, td, label, legend, option, p, a, 
      .nav-item, .menu-item, .sub-menu, .btn, .action-btn, .table-header,
      .column-name, .form-label, .field-header, .sub-header, .tab-btn,
      .modal-title, .custom-select-option, .dropdown-item, .field-option,
      .badge-text, .droplist-item, .export-btn, .filter-chip,
      .sidebar-link, .nav-link, .menu-link, .dropdown-menu, .popover-content {
        font-family: ${family} !important;
        font-style: normal !important;
        font-weight: ${entry.weight || '400'} !important;
        ${lineHeightRule}
      }
      ${tablePaddingRule}
      *, *::before, *::after {
        font-style: normal !important;
      }
      body {
        font-family: ${family} !important;
        font-style: normal !important;
        font-weight: ${entry.weight || '400'};
      }
      /* Input Data Exclusion Rule: Do not apply language/decorative typography to raw user inputs and data fields */
      input, textarea, select, .input-data, .raw-input, .font-mono, [contenteditable="true"], .font-mono * {
        font-family: var(--input-font) !important;
        font-style: normal !important;
      }
      input::placeholder, textarea::placeholder {
        font-family: ${family} !important;
        font-style: normal !important;
      }
    `;
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      la: { translation: la },
      th: { translation: th },
      jp: { translation: jp },
      zh: { translation: zh },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on('languageChanged', (lng) => {
  updateAppFont(lng);
});

// Set initial font
updateAppFont(i18n.language || 'en');

export default i18n;
