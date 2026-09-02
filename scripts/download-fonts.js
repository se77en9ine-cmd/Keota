const https = require('https');
const fs = require('fs');
const path = require('path');

const outDir = path.join(process.cwd(), 'client/public/fonts');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function downloadBinary(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
}

const fontUrls = [
  { name: 'Noto Sans Lao', url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@100..900&display=swap' },
  { name: 'Noto Sans Thai', url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@100..900&display=swap' },
  { name: 'Noto Serif JP', url: 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400..900&display=swap' },
  { name: 'Noto Serif SC', url: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400..900&display=swap' },
  { name: 'Inter', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300..900&display=swap' }
];

async function main() {
  const allFontFaceRules = [];
  let fileCounter = 0;

  for (const item of fontUrls) {
    console.log(`\n=== Fetching ${item.name} ===`);
    const css = await get(item.url);
    console.log(`CSS length for ${item.name}:`, css.length);

    const fontFaceRegex = /@font-face\s*\{([^}]+)\}/g;
    let match;
    let count = 0;

    while ((match = fontFaceRegex.exec(css)) !== null) {
      const block = match[1];
      const familyMatch = block.match(/font-family:\s*['"]([^'"]+)['"]/);
      const styleMatch = block.match(/font-style:\s*([^;]+);/);
      const weightMatch = block.match(/font-weight:\s*([^;]+);/);
      const urlMatch = block.match(/src:\s*url\((https:\/\/[^)]+)\)/);
      const unicodeMatch = block.match(/unicode-range:\s*([^;]+);/);

      if (familyMatch && urlMatch) {
        const family = familyMatch[1];
        const style = styleMatch ? styleMatch[1].trim() : 'normal';
        const weight = weightMatch ? weightMatch[1].trim() : '400 900';
        const url = urlMatch[1];
        const unicode = unicodeMatch ? unicodeMatch[1].trim() : null;

        const safePrefix = family.replace(/\s+/g, '-').toLowerCase();
        const fileName = `${safePrefix}-${fileCounter}.woff2`;
        const destPath = path.join(outDir, fileName);

        console.log(`  Downloading [${fileName}] from ${url}`);
        await downloadBinary(url, destPath);

        let rule = '@font-face {\n';
        rule += `  font-family: '${family}';\n`;
        rule += `  font-style: ${style};\n`;
        rule += `  font-weight: ${weight};\n`;
        rule += `  font-display: swap;\n`;
        rule += `  src: url('/fonts/${fileName}') format('woff2');\n`;
        if (unicode) {
          rule += `  unicode-range: ${unicode};\n`;
        }
        rule += '}\n';

        allFontFaceRules.push(rule);
        fileCounter++;
        count++;
      }
    }
    console.log(`Finished ${item.name}: downloaded ${count} woff2 slices`);
  }

  const fontsCssPath = path.join(process.cwd(), 'client/src/fonts.css');
  fs.writeFileSync(fontsCssPath, '/* Self-hosted Multi-Language Fonts (Offline / Local) */\n\n' + allFontFaceRules.join('\n'));
  console.log(`\n======================================================`);
  console.log(`Total ${fileCounter} fonts downloaded. Generated: ${fontsCssPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
