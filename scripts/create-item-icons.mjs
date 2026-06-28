import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const outDir = path.join(root, "public/assets");
const size = 320;

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function createCanvas() {
  const rgba = Buffer.alloc(size * size * 4);
  const blend = (x, y, color, alpha = 1) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (Math.floor(y) * size + Math.floor(x)) * 4;
    const inv = 1 - alpha;
    rgba[i] = rgba[i] * inv + color[0] * alpha;
    rgba[i + 1] = rgba[i + 1] * inv + color[1] * alpha;
    rgba[i + 2] = rgba[i + 2] * inv + color[2] * alpha;
    rgba[i + 3] = 255;
  };
  const rect = (x, y, w, h, color, alpha = 1) => {
    for (let yy = Math.max(0, y); yy < Math.min(size, y + h); yy += 1) {
      for (let xx = Math.max(0, x); xx < Math.min(size, x + w); xx += 1) blend(xx, yy, color, alpha);
    }
  };
  const line = (x0, y0, x1, y1, color, thickness = 1, alpha = 1) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const x = x0 + dx * t;
      const y = y0 + dy * t;
      for (let oy = -thickness; oy <= thickness; oy += 1) {
        for (let ox = -thickness; ox <= thickness; ox += 1) {
          if (ox * ox + oy * oy <= thickness * thickness) blend(x + ox, y + oy, color, alpha);
        }
      }
    }
  };
  const ellipse = (cx, cy, rx, ry, color, alpha = 1) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const n = ((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2);
        if (n <= 1) blend(x, y, color, alpha * (1 - n * 0.35));
      }
    }
  };
  const polygon = (points, color, alpha = 1) => {
    const minY = Math.max(0, Math.floor(Math.min(...points.map((p) => p[1]))));
    const maxY = Math.min(size - 1, Math.ceil(Math.max(...points.map((p) => p[1]))));
    for (let y = minY; y <= maxY; y += 1) {
      const nodes = [];
      for (let i = 0; i < points.length; i += 1) {
        const j = (i + 1) % points.length;
        const [x1, y1] = points[i];
        const [x2, y2] = points[j];
        if ((y1 < y && y2 >= y) || (y2 < y && y1 >= y)) nodes.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
      }
      nodes.sort((a, b) => a - b);
      for (let n = 0; n < nodes.length; n += 2) {
        for (let x = Math.max(0, Math.floor(nodes[n])); x <= Math.min(size - 1, Math.ceil(nodes[n + 1])); x += 1) blend(x, y, color, alpha);
      }
    }
  };
  const png = () => {
    const raw = Buffer.alloc((size * 4 + 1) * size);
    for (let y = 0; y < size; y += 1) {
      const row = y * (size * 4 + 1);
      raw[row] = 0;
      rgba.copy(raw, row + 1, y * size * 4, (y + 1) * size * 4);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    return Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", ihdr),
      chunk("IDAT", zlib.deflateSync(raw, { level: 8 })),
      chunk("IEND")
    ]);
  };
  return { rgba, blend, rect, line, ellipse, polygon, png };
}

function paintBase(canvas, accent) {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - size / 2;
      const dy = y - size / 2;
      const d = Math.sqrt(dx * dx + dy * dy) / (size / 2);
      canvas.blend(x, y, [10 + accent[0] * 0.05, 10 + accent[1] * 0.04, 12 + accent[2] * 0.04], 1);
      if (d < 0.78) canvas.blend(x, y, accent, 0.18 * (1 - d));
    }
  }
  canvas.ellipse(160, 166, 118, 118, [38, 34, 31], 0.72);
  canvas.line(64, 245, 256, 245, [156, 142, 112], 2, 0.28);
}

function drawIcon(type) {
  const accentMap = {
    weapon: [174, 31, 24],
    armor: [146, 132, 104],
    jewelry: [193, 162, 96],
    utility: [99, 111, 121]
  };
  const c = createCanvas();
  paintBase(c, accentMap[type]);
  if (type === "weapon") {
    c.line(92, 244, 222, 74, [210, 205, 188], 8, 0.78);
    c.line(118, 218, 84, 184, [174, 31, 24], 5, 0.72);
    c.polygon([[206, 56], [246, 42], [234, 84], [200, 104]], [230, 222, 196], 0.72);
  } else if (type === "armor") {
    c.polygon([[110, 92], [210, 92], [236, 218], [160, 266], [84, 218]], [132, 124, 112], 0.84);
    c.polygon([[130, 118], [190, 118], [204, 198], [160, 228], [116, 198]], [34, 32, 31], 0.84);
    c.line(160, 94, 160, 226, [220, 210, 180], 3, 0.38);
  } else if (type === "jewelry") {
    c.ellipse(160, 162, 74, 74, [205, 172, 96], 0.72);
    c.ellipse(160, 162, 42, 42, [15, 13, 12], 0.92);
    c.polygon([[160, 84], [190, 126], [160, 150], [130, 126]], [232, 220, 176], 0.7);
  } else {
    c.polygon([[160, 58], [232, 130], [206, 232], [114, 232], [88, 130]], [94, 102, 108], 0.76);
    c.line(112, 132, 208, 132, [212, 200, 172], 3, 0.32);
    c.line(160, 70, 160, 220, [174, 31, 24], 4, 0.52);
  }
  return c.png();
}

await mkdir(outDir, { recursive: true });
for (const type of ["weapon", "armor", "jewelry", "utility"]) {
  await writeFile(path.join(outDir, `icon-${type}.png`), drawIcon(type));
}
console.log("Wrote equipment icon PNG assets");
