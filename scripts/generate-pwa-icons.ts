import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width: number, height: number, bgColor: [number, number, number]): Buffer {
  const bytesPerPixel = 4;
  const scanlineLength = 1 + width * bytesPerPixel;
  const rawData = Buffer.alloc(height * scanlineLength);

  const cx = width / 2;
  const cy = height * 0.45;
  const rFlower = width * 0.28;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * bytesPerPixel;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background color #95A823 (149, 168, 35) or custom
      let r = bgColor[0];
      let g = bgColor[1];
      let b = bgColor[2];
      let a = 255;

      // 5-petal flower calculation
      const angle = Math.atan2(dy, dx);
      // 5 petals formula: r(theta) = R * (0.6 + 0.4 * cos(5 * theta))
      const petalRadius = rFlower * (0.65 + 0.35 * Math.cos(5 * angle));
      const distFromCenter = dist;

      if (distFromCenter <= petalRadius) {
        if (distFromCenter <= rFlower * 0.22) {
          // Yellow-green core #EAEEBB (234, 238, 187)
          r = 234; g = 238; b = 187;
        } else if (distFromCenter <= rFlower * 0.27) {
          // Darker green core border #6F7E16
          r = 111; g = 126; b = 22;
        } else {
          // White flower petals #FFFFFF
          r = 255; g = 255; b = 255;
        }
      }

      // Bottom banner for "MOD LOGAR"
      const bannerTop = height * 0.76;
      const bannerBottom = height * 0.88;
      const bannerLeft = width * 0.18;
      const bannerRight = width * 0.82;

      if (y >= bannerTop && y <= bannerBottom && x >= bannerLeft && x <= bannerRight) {
        // Dark timber banner #231E1B (35, 30, 27)
        r = 35; g = 30; b = 27;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawData);

  // Build PNG chunks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // Bit depth
  ihdr.writeUInt8(6, 9); // ColorType RGBA
  ihdr.writeUInt8(0, 10); // Compression
  ihdr.writeUInt8(0, 11); // Filter
  ihdr.writeUInt8(0, 12); // Interlace

  function makeChunk(type: string, data: Buffer): Buffer {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);

    // CRC
    let crc = 0xffffffff;
    const typeAndData = buf.subarray(4, 8 + len);
    for (let i = 0; i < typeAndData.length; i++) {
      let byte = typeAndData[i];
      for (let j = 0; j < 8; j++) {
        const bit = (crc ^ (byte >> j)) & 1;
        crc = (crc >>> 1) ^ (bit ? 0xedb88320 : 0);
      }
    }
    buf.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 8 + len);
    return buf;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate standard PWA icons
const icon192 = createPNG(192, 192, [149, 168, 35]); // #95A823
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);

const icon512 = createPNG(512, 512, [149, 168, 35]);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);

const iconMaskable = createPNG(512, 512, [111, 126, 22]); // #6F7E16
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), iconMaskable);

const appleIcon = createPNG(180, 180, [149, 168, 35]);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

console.log('Successfully generated PWA PNG icons in public directory!');
