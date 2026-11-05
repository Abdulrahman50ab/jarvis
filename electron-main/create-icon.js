const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height) {
  const bytesPerPixel = 4;
  const scanlineLength = width * bytesPerPixel + 1;
  const rawData = Buffer.alloc(scanlineLength * height);

  const insideRoundedRect = (x, y, inset, radius) => {
    const left = inset;
    const top = inset;
    const right = width - inset - 1;
    const bottom = height - inset - 1;
    if (x < left || x > right || y < top || y > bottom) return false;
    const nearestX = Math.min(Math.max(x, left + radius), right - radius);
    const nearestY = Math.min(Math.max(y, top + radius), bottom - radius);
    const dx = x - nearestX;
    const dy = y - nearestY;
    return dx * dx + dy * dy <= radius * radius;
  };

  for (let y = 0; y < height; y++) {
    const offset = y * scanlineLength;
    rawData[offset] = 0; // Filter type None
    for (let x = 0; x < width; x++) {
      const pxOffset = offset + 1 + x * bytesPerPixel;
      
      const cx = x - width / 2;
      const cy = y - height / 2;
      const dist = Math.sqrt(cx * cx + cy * cy);

      if (!insideRoundedRect(x, y, 4, 42)) {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
        continue;
      }

      // White card base with a subtle warm tint toward the bottom.
      const shade = 255 - Math.floor((y / height) * 7);
      let red = 255;
      let green = shade;
      let blue = shade;
      const alpha = 255;

      // Strong red rounded border.
      if (!insideRoundedRect(x, y, 12, 35)) {
        red = 220;
        green = 38;
        blue = 38;
      }

      // Assistant orbit and core.
      if (Math.abs(dist - 91) < 3) {
        red = 248;
        green = 113;
        blue = 113;
      }
      if (dist < 61) {
        const coreShade = Math.max(0, Math.min(1, (cy + 61) / 122));
        red = 239 - Math.floor(coreShade * 19);
        green = 68 - Math.floor(coreShade * 30);
        blue = 68 - Math.floor(coreShade * 30);
      }

      // A clean white "J" mark inside the red assistant core.
      const jTop = x >= 104 && x <= 151 && y >= 96 && y <= 107;
      const jStem = x >= 138 && x <= 149 && y >= 101 && y <= 143;
      const jArcRadius = Math.sqrt((x - 118) ** 2 + (y - 140) ** 2);
      const jArc = Math.abs(jArcRadius - 25) <= 5 && y >= 139 && x <= 143;
      if (jTop || jStem || jArc) {
        red = 255;
        green = 255;
        blue = 255;
      }

      rawData[pxOffset] = red;
      rawData[pxOffset + 1] = green;
      rawData[pxOffset + 2] = blue;
      rawData[pxOffset + 3] = alpha;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter method
  ihdr[12] = 0; // Interlace method

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = calcCrc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function calcCrc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i];
    for (let j = 0; j < 8; j++) {
      let mix = (crc ^ byte) & 1;
      crc = (crc >>> 1) ^ (mix ? 0xedb88320 : 0);
      byte = byte >>> 1;
    }
  }
  return (crc ^ -1) >>> 0;
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const pngBuffer = createPng(256, 256);
fs.writeFileSync(path.join(iconsDir, 'icon.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, 'jarvis.png'), pngBuffer);

console.log('Successfully generated jarvis.png & icon.png (256x256)');
