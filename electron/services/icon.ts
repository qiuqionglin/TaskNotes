/**
 * Programmatic PNG icon generator for the app.
 * Creates a purple circle with a white checkmark — no external image files needed.
 */
import * as zlib from 'zlib';
import { nativeImage, NativeImage } from 'electron';

function crc32(buf: Buffer): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? ((crc >>> 1) ^ 0xEDB88320) : (crc >>> 1);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type, 'ascii');
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([len, typeB, data, crcB]);
}

function distToSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function createPNG(size: number, pixelFn: (x: number, y: number) => [number, number, number, number]): Buffer {
  const rowSize = size * 4 + 1;
  const raw = Buffer.alloc(rowSize * size);
  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y);
      const off = y * rowSize + 1 + x * 4;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Generate the app icon as a NativeImage.
 * A purple circle with a white checkmark inside.
 */
export function createAppIcon(size: number = 32): NativeImage {
  const buf = createPNG(size, (x, y) => {
    const c = size / 2;
    const r = size / 2 - 1;
    const dx = x - c + 0.5;
    const dy = y - c + 0.5;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Transparent outside circle
    if (dist > r) return [0, 0, 0, 0];

    // Normalized coordinates for checkmark drawing
    const nx = x / size;
    const ny = y / size;

    // Checkmark: short stroke left-down, then long stroke up-right
    const d1 = distToSeg(nx, ny, 0.26, 0.50, 0.42, 0.68);
    const d2 = distToSeg(nx, ny, 0.42, 0.68, 0.74, 0.30);
    const thickness = 0.055;

    if (d1 < thickness || d2 < thickness) {
      return [255, 255, 255, 255]; // white checkmark
    }

    // Purple gradient background
    const t = dist / r;
    return [
      Math.round(108 + t * 20),   // R: lighter at edges
      Math.round(92 + t * 40),    // G
      Math.round(231 - t * 10),   // B
      255,
    ];
  });

  return nativeImage.createFromBuffer(buf);
}
