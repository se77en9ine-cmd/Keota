/**
 * WhatsApp Utility for normalizing phone numbers and generating WhatsApp chat links.
 * Handles Laos (+856), Thailand (+66), Vietnam (+84), China (+86), and international formats.
 */

export function getCleanPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  let digits = phone.replace(/[^0-9]/g, '');

  // Laos local format:
  // 020XXXXXXXX (11 digits) -> 85620XXXXXXXX
  // 20XXXXXXXX (10 digits)  -> 85620XXXXXXXX
  // 030XXXXXXXX (11 digits) -> 85630XXXXXXXX
  // 30XXXXXXXX (10 digits)  -> 85630XXXXXXXX
  if ((digits.startsWith('020') || digits.startsWith('030')) && digits.length === 11) {
    return '856' + digits.slice(1);
  }
  if ((digits.startsWith('20') || digits.startsWith('30')) && digits.length === 10) {
    return '856' + digits;
  }

  // Thailand local format:
  // 08XXXXXXXX, 09XXXXXXXX, 06XXXXXXXX (10 digits) -> 668XXXXXXXX
  if (digits.startsWith('0') && digits.length === 10) {
    return '66' + digits.slice(1);
  }

  return digits;
}

export function formatWhatsAppUrl(phone: string | null | undefined, text?: string): string {
  const cleanPhone = getCleanPhoneNumber(phone);
  if (!cleanPhone) return '';
  const base = `https://wa.me/${cleanPhone}`;
  if (text) {
    return `${base}?text=${encodeURIComponent(text)}`;
  }
  return base;
}
