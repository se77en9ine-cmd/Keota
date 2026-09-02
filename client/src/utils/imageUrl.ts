/**
 * Image URL Sanitizer & Parser Utility
 * Resolves search engine result page wrappers (Google Images, Bing, Yahoo)
 * and cloud drive links to direct image source URLs.
 */

export function sanitizeImageUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();

  // Strip wrapping quotes if user pasted with quotes
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }

  // 1. Google Images Search Result (e.g. https://www.google.com/imgres?q=man&imgurl=https%3A%2F%2Fexample.com%2Fphoto.jpg...)
  if (url.includes('google.') && /imgurl=/i.test(url)) {
    try {
      const match = url.match(/[?&]imgurl=([^&]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {}
  }

  // 2. Google Search / Redirect URL (e.g. https://www.google.com/url?sa=i&url=https%3A%2F%2Fexample.com...)
  if (url.includes('google.') && /[?&]url=/i.test(url)) {
    try {
      const match = url.match(/[?&]url=([^&]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {}
  }

  // 3. Bing Image Search Result (e.g. mediaurl=...)
  if (url.includes('bing.com') && /mediaurl=/i.test(url)) {
    try {
      const match = url.match(/[?&]mediaurl=([^&]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {}
  }

  // 4. Yahoo Image Search Result (e.g. imgurl=...)
  if (url.includes('yahoo.com') && /imgurl=/i.test(url)) {
    try {
      const match = url.match(/[?&]imgurl=([^&]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {}
  }

  // 5. Google Drive Share Links (e.g. drive.google.com/file/d/FILE_ID/view?usp=sharing)
  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
  }

  // 6. Dropbox share links (change dl=0 to raw=1)
  if (url.includes('dropbox.com') && url.includes('dl=0')) {
    return url.replace('dl=0', 'raw=1');
  }

  return url;
}

export function isDirectImageUrl(url: string): boolean {
  if (!url) return false;
  const clean = sanitizeImageUrl(url);
  return (
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('data:image/') ||
    clean.startsWith('blob:')
  );
}
