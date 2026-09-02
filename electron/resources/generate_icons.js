// Generate a high-resolution 256x256 PNG and convert it to a valid Windows ICO format
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function generate256PngBuffer() {
  const width = 256;
  const height = 256;

  // Generate uncompressed raw pixel rows (Filter 0 + RGBA)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const cx = x - 128;
      const cy = y - 128;
      const dist = Math.sqrt(cx * cx + cy * cy);
      const maxRadius = 120;

      // Rounded squircle container
      const cornerRadius = 36;
      const dx = Math.max(0, Math.abs(cx) - (128 - cornerRadius));
      const dy = Math.max(0, Math.abs(cy) - (128 - cornerRadius));
      const isInside = Math.sqrt(dx * dx + dy * dy) <= cornerRadius;

      if (isInside) {
        // Vibrant Indigo/Purple gradient with subtle glow
        const gradientT = (x + y) / (512);
        let r = Math.round(79 + gradientT * 40);   // 79 -> 119
        let g = Math.round(70 + gradientT * 30);   // 70 -> 100
        let b = Math.round(229 + gradientT * 26);  // 229 -> 255
        let a = 255;

        // Border stroke (Outer rim highlight)
        const isBorder = (Math.sqrt(dx * dx + dy * dy) > cornerRadius - 3) || 
                         (Math.abs(cx) > 124 || Math.abs(cy) > 124);
        if (isBorder) {
          r = Math.min(255, r + 50);
          g = Math.min(255, g + 50);
          b = 255;
        }

        // Draw POS Terminal Screen
        const nx = x / 256;
        const ny = y / 256;

        // Register Screen (Top rectangle)
        if (nx >= 0.22 && nx <= 0.78 && ny >= 0.20 && ny <= 0.52) {
          const isScreenBorder = nx <= 0.24 || nx >= 0.76 || ny <= 0.22 || ny >= 0.50;
          if (isScreenBorder) {
            r = 255; g = 255; b = 255; a = 240;
          } else {
            // Screen interior (Deep dark tech blue)
            r = 15; g = 23; b = 42; a = 255;
            // Screen bar graph or chart indicator
            if (ny >= 0.30 && ny <= 0.42) {
              if (nx >= 0.30 && nx <= 0.38) { r = 16; g = 185; b = 129; } // Emerald bar
              else if (nx >= 0.42 && nx <= 0.50) { r = 59; g = 130; b = 246; } // Blue bar
              else if (nx >= 0.54 && nx <= 0.62) { r = 245; g = 158; b = 11; } // Amber bar
              else if (nx >= 0.66 && nx <= 0.70) { r = 239; g = 68; b = 68; } // Red bar
            }
          }
        }

        // Stand Neck
        if (nx >= 0.44 && nx <= 0.56 && ny > 0.52 && ny <= 0.62) {
          r = 203; g = 213; b = 225; a = 255;
        }

        // Base Pad & Keypad
        if (nx >= 0.18 && nx <= 0.82 && ny > 0.62 && ny <= 0.78) {
          r = 241; g = 245; b = 249; a = 255;
          // Card slot / button indicators
          if (ny >= 0.66 && ny <= 0.74 && nx >= 0.26 && nx <= 0.74) {
            const keyCol = Math.floor((nx - 0.26) / 0.16);
            const keyDist = (nx - 0.26) % 0.16;
            if (keyDist >= 0.03 && keyDist <= 0.13) {
              r = 99; g = 102; b = 241; // Indigo buttons
            }
          }
        }

        rawData[pxOffset + 0] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
        rawData[pxOffset + 3] = a;
      } else {
        rawData[pxOffset + 0] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);  // 8 bits per channel
  ihdrData.writeUInt8(6, 9);  // RGBA
  ihdrData.writeUInt8(0, 10); // Deflate
  ihdrData.writeUInt8(0, 11); // Filter none
  ihdrData.writeUInt8(0, 12); // Interlace none
  const ihdrChunk = createPngChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = createPngChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSig, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  }
  crcTable[n] = c;
}

function createPngChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Build standard modern 256x256 Windows ICO embedding the PNG directly
function createIcoFromPng(pngBuffer, outputPath) {
  const iconDir = Buffer.alloc(6);
  iconDir.writeUInt16LE(0, 0); // Reserved
  iconDir.writeUInt16LE(1, 2); // ICO format
  iconDir.writeUInt16LE(1, 4); // 1 Image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0);       // Width 0 = 256
  entry.writeUInt8(0, 1);       // Height 0 = 256
  entry.writeUInt8(0, 2);       // Color palette
  entry.writeUInt8(0, 3);       // Reserved
  entry.writeUInt16LE(1, 4);    // Color planes
  entry.writeUInt16LE(32, 6);   // BPP
  entry.writeUInt32LE(pngBuffer.length, 8); // Size of PNG
  entry.writeUInt32LE(22, 12);  // Offset = 6 + 16 = 22

  const icoBuffer = Buffer.concat([iconDir, entry, pngBuffer]);
  fs.writeFileSync(outputPath, icoBuffer);
  console.log(`Generated 256x256 ICO: ${outputPath} (${icoBuffer.length} bytes)`);
}

const resDir = 'd:/Google/Antigravity/POS/Online/electron/resources';
if (!fs.existsSync(resDir)) fs.mkdirSync(resDir, { recursive: true });

const png = generate256PngBuffer();
fs.writeFileSync(path.join(resDir, 'icon.png'), png);
console.log(`Generated 256x256 PNG: ${path.join(resDir, 'icon.png')}`);

createIcoFromPng(png, path.join(resDir, 'icon.ico'));
console.log('✅ Icon generation complete.');
