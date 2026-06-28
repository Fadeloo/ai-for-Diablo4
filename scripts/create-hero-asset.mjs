import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const output = path.join(root, "public/assets/hero-sanctuary.png");
const width = 1920;
const height = 1080;
const rgba = Buffer.alloc(width * height * 4);

let seed = 1337;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0xffffffff;
}

function blendPixel(x, y, color, alpha = 1) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const i = (Math.floor(y) * width + Math.floor(x)) * 4;
  const inv = 1 - alpha;
  rgba[i] = rgba[i] * inv + color[0] * alpha;
  rgba[i + 1] = rgba[i + 1] * inv + color[1] * alpha;
  rgba[i + 2] = rgba[i + 2] * inv + color[2] * alpha;
  rgba[i + 3] = 255;
}

function fillRect(x, y, w, h, color, alpha = 1) {
  for (let yy = Math.max(0, y); yy < Math.min(height, y + h); yy += 1) {
    for (let xx = Math.max(0, x); xx < Math.min(width, x + w); xx += 1) {
      blendPixel(xx, yy, color, alpha);
    }
  }
}

function drawLine(x0, y0, x1, y1, color, thickness = 1, alpha = 1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    for (let oy = -thickness; oy <= thickness; oy += 1) {
      for (let ox = -thickness; ox <= thickness; ox += 1) {
        if (ox * ox + oy * oy <= thickness * thickness) blendPixel(x + ox, y + oy, color, alpha);
      }
    }
  }
}

function fillEllipse(cx, cy, rx, ry, color, alpha = 1) {
  const minX = Math.floor(cx - rx);
  const maxX = Math.ceil(cx + rx);
  const minY = Math.floor(cy - ry);
  const maxY = Math.ceil(cy + ry);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const n = ((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2);
      if (n <= 1) blendPixel(x, y, color, alpha * (1 - n * 0.5));
    }
  }
}

function fillPolygon(points, color, alpha = 1) {
  const minY = Math.max(0, Math.floor(Math.min(...points.map((p) => p[1]))));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(...points.map((p) => p[1]))));
  for (let y = minY; y <= maxY; y += 1) {
    const nodes = [];
    for (let i = 0; i < points.length; i += 1) {
      const j = (i + 1) % points.length;
      const [x1, y1] = points[i];
      const [x2, y2] = points[j];
      if ((y1 < y && y2 >= y) || (y2 < y && y1 >= y)) {
        nodes.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
    nodes.sort((a, b) => a - b);
    for (let n = 0; n < nodes.length; n += 2) {
      const from = Math.max(0, Math.floor(nodes[n]));
      const to = Math.min(width - 1, Math.ceil(nodes[n + 1]));
      for (let x = from; x <= to; x += 1) blendPixel(x, y, color, alpha);
    }
  }
}

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

function writePng() {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    rgba.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 8 })),
    chunk("IEND")
  ]);
}

function paintBackground() {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const v = y / height;
      const noise = (random() - 0.5) * 10;
      const top = v < 0.58;
      const base = top ? 10 + v * 18 : 18 + (v - 0.58) * 55;
      const red = top ? 6 + v * 24 : 18 + (v - 0.58) * 40;
      blendPixel(x, y, [base + red * 0.18 + noise, base + noise, base + 4 + noise], 1);
    }
  }
}

function paintScene() {
  fillPolygon([[790, 260], [920, 180], [1045, 195], [1175, 315], [1195, 650], [1070, 820], [835, 802], [720, 630], [735, 350]], [125, 12, 9], 0.34);
  fillPolygon([[845, 330], [955, 255], [1065, 335], [1115, 615], [1010, 740], [880, 700], [805, 610]], [20, 3, 3], 0.78);
  fillPolygon([[930, 405], [970, 365], [1018, 420], [1010, 585], [965, 645], [920, 585]], [185, 42, 28], 0.16);
  for (let i = 0; i < 34; i += 1) {
    const angle = (i / 34) * Math.PI * 2;
    const x = 960 + Math.cos(angle) * (198 + random() * 34);
    const y = 500 + Math.sin(angle) * (278 + random() * 32);
    drawLine(960, 500, x, y, [150, 32, 24], 1 + random() * 2, 0.18);
  }

  fillRect(0, 650, width, 430, [11, 10, 10], 0.34);
  for (let i = 0; i < 28; i += 1) {
    const y = 690 + i * 18;
    drawLine(120, y, 1800, y + i * 5, [118, 112, 104], 1, 0.08);
  }
  for (let i = -9; i <= 9; i += 1) {
    drawLine(960, 620, 960 + i * 170, 1080, [150, 144, 132], 1, 0.1);
  }

  fillPolygon([[790, 525], [1130, 525], [1190, 760], [730, 760]], [22, 20, 19], 0.74);
  fillPolygon([[880, 520], [1040, 520], [1088, 720], [832, 720]], [74, 70, 66], 0.7);
  fillPolygon([[875, 575], [960, 540], [1045, 575], [1010, 695], [910, 695]], [43, 42, 41], 0.86);
  fillEllipse(960, 465, 54, 50, [78, 76, 72], 0.82);
  fillPolygon([[900, 500], [1020, 500], [1052, 545], [868, 545]], [94, 88, 80], 0.64);
  drawLine(960, 470, 960, 675, [205, 196, 175], 3, 0.38);
  drawLine(870, 582, 1050, 582, [205, 196, 175], 2, 0.22);

  const weapons = [
    [330, 760, 520, 320],
    [430, 825, 720, 360],
    [1590, 790, 1390, 320],
    [1490, 840, 1190, 380]
  ];
  for (const [x0, y0, x1, y1] of weapons) {
    drawLine(x0, y0, x1, y1, [118, 114, 108], 5, 0.62);
    fillPolygon([[x1 - 34, y1 + 12], [x1 + 28, y1 - 16], [x1 + 62, y1 + 30], [x1 + 8, y1 + 52]], [164, 155, 136], 0.52);
    drawLine(x1 - 30, y1 + 14, x1 + 58, y1 + 30, [224, 212, 184], 2, 0.18);
  }
  fillEllipse(545, 780, 92, 118, [56, 52, 47], 0.74);
  fillEllipse(1375, 785, 92, 118, [56, 52, 47], 0.74);
  drawLine(500, 725, 590, 842, [174, 154, 112], 2, 0.24);
  drawLine(1420, 725, 1330, 842, [174, 154, 112], 2, 0.24);

  for (let i = 0; i < 420; i += 1) {
    const x = random() * width;
    const y = random() * height * 0.86;
    const alpha = random() * 0.18;
    blendPixel(x, y, [214, 205, 186], alpha);
    if (random() > 0.72) blendPixel(x + 1, y, [178, 48, 36], alpha);
  }

  fillRect(0, 0, width, 190, [0, 0, 0], 0.26);
  fillRect(0, 820, width, 260, [0, 0, 0], 0.32);
}

await mkdir(path.dirname(output), { recursive: true });
paintBackground();
paintScene();
await writeFile(output, writePng());
console.log(`Wrote ${path.relative(root, output)} (${width}x${height})`);
