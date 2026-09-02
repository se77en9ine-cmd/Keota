/**
 * Localized date helpers for Lao, Thai, and regional enterprise POS formats
 */

const LAO_MONTHS_SHORT = [
  'ມ.ກ.', 'ກ.ພ.', 'ມີ.ນາ', 'ເມ.ສາ', 'ພ.ພ.', 'ມິ.ຖ.',
  'ກ.ລ.', 'ສ.ຫ.', 'ກ.ຍ.', 'ຕ.ລ.', 'ພ.ຈ.', 'ທ.ວ.'
];

const LAO_MONTHS_FULL = [
  'ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ', 'ພຶດສະພາ', 'ມິຖຸນາ',
  'ກໍລະກົດ', 'ສິງຫາ', 'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ'
];

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export function formatLocalizedDate(
  dateStr: string | null | undefined,
  lang: string = 'en',
  variant: 'short' | 'full' = 'short'
): string {
  if (!dateStr) return '';
  const clean = String(dateStr).trim();
  
  // Check if matches YYYY-MM-DD
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return clean;

  const year = match[1];
  const monthIdx = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);

  if (monthIdx < 0 || monthIdx > 11) return clean;

  const l = (lang || 'en').toLowerCase().split('-')[0];

  if (l === 'la') {
    const mName = variant === 'full' ? LAO_MONTHS_FULL[monthIdx] : LAO_MONTHS_SHORT[monthIdx];
    return `${day} ${mName} ${year}`;
  }

  if (l === 'th') {
    return `${day} ${THAI_MONTHS_SHORT[monthIdx]} ${year}`;
  }

  return clean;
}
