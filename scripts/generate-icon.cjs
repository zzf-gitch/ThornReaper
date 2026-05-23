// 生成 VS Code 扩展图标 — 与 icon.svg 完全一致的设计
// 在 d:/PC-Game 执行: node scripts/generate-icon.cjs
const fs = require('fs');
const zlib = require('zlib');

const SIZE = 256;
// 用纯色填充（不透明背景, 避免活动栏灰色方块）
const data = Buffer.alloc(SIZE * SIZE * 4, 255);

function setPixel(x, y, r, g, b, a = 255) {
  const ix = Math.round(x), iy = Math.round(y);
  if (ix < 0 || ix >= SIZE || iy < 0 || iy >= SIZE) return;
  const idx = (iy * SIZE + ix) * 4;
  const alpha = a / 255;
  data[idx]     = Math.round(data[idx]     * (1 - alpha) + r * alpha);
  data[idx + 1] = Math.round(data[idx + 1] * (1 - alpha) + g * alpha);
  data[idx + 2] = Math.round(data[idx + 2] * (1 - alpha) + b * alpha);
  data[idx + 3] = Math.min(255, data[idx + 3] + a);
}

function fillCircleAA(cx, cy, radius, r, g, b, a = 255) {
  const minX = Math.max(0, Math.floor(cx - radius - 1));
  const maxX = Math.min(SIZE - 1, Math.ceil(cx + radius + 1));
  const minY = Math.max(0, Math.floor(cy - radius - 1));
  const maxY = Math.min(SIZE - 1, Math.ceil(cy + radius + 1));
  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
      if (dist <= radius) {
        const alpha = Math.min(1, Math.max(0, radius + 0.5 - dist));
        setPixel(px, py, r, g, b, Math.round(a * alpha));
      }
    }
  }
}

function fillRect(x, y, w, h, r, g, b, a = 255) {
  for (let py = Math.max(0, y); py < Math.min(SIZE, y + h); py++) {
    for (let px = Math.max(0, x); px < Math.min(SIZE, x + w); px++) {
      setPixel(px, py, r, g, b, a);
    }
  }
}

// ===== 与 SVG 完全一致的设计 =====
const CX = SIZE / 2, CY = SIZE / 2;

// 1. 纯色背景（白色，保持透明区域干净）
for (let px = 0; px < SIZE; px++) {
  for (let py = 0; py < SIZE; py++) {
    const idx = (py * SIZE + px) * 4;
    data[idx] = 0;
    data[idx+1] = 0;
    data[idx+2] = 0;
    data[idx+3] = 0;
  }
}

// 2. 深色圆形背景（完全覆盖活动栏灰色问题）
fillCircleAA(CX, CY, 127, 26, 26, 46, 255);
fillCircleAA(CX, CY, 126, 30, 28, 50, 255);

// 3. 金色边框
for (let a = 0; a < 360; a += 0.3) {
  const rad = a * Math.PI / 180;
  setPixel(CX + 126 * Math.cos(rad), CY + 126 * Math.sin(rad), 241, 196, 15, 220);
}

// 4. ⚔️ 交叉剑（与 SVG 几何一致）
// 两把剑交叉在 (CX, CY-10)

function drawSword(angleDeg, cx, cy, isRight) {
  const angle = angleDeg * Math.PI / 180 * (isRight ? 1 : -1);
  const cosA = Math.cos(angle), sinA = Math.sin(angle);
  
  // 剑身: polygon points="-4,-56 4,-56 3,24 -3,24"
  // 从 (cx, cy) 偏移
  const bladeVerts = [
    [-4, -56], [4, -56], [3, 24], [-3, 24]
  ];
  
  // 填充剑身（多边形光栅化简化版）
  for (let py = cy - 58; py <= cy + 26; py++) {
    for (let px = cx - 30; px <= cx + 30; px++) {
      // 反旋转坐标
      const dx = (px - cx) * cosA + (py - cy) * sinA;
      const dy = -(px - cx) * sinA + (py - cy) * cosA;
      
      // 检查是否在剑身多边形内
      if (dx >= -4 && dx <= 4 && dy >= -56 && dy <= 24) {
        const t = (dy + 56) / 80; // 0=剑尖, 1=护手
        const halfW = 4 * (0.2 + 0.8 * (1 - t));
        if (Math.abs(dx) <= halfW) {
          const bright = 0.7 + 0.3 * (1 - t);
          setPixel(px, py,
            Math.round(192 * bright),
            Math.round(200 * bright),
            Math.round(210 * bright), 245);
        }
      }
      
      // 剑尖三角: polygon points="-4,-56 4,-56 0,-62"
      if (dy >= -62 && dy <= -56) {
        const tipT = (dy + 62) / 6;
        const halfW = 4 * (1 - tipT);
        if (Math.abs(dx) <= halfW) {
          setPixel(px, py, 208, 214, 220, 245);
        }
      }
      
      // 护手: rect x="-20" y="24" width="40" height="6"
      if (dy >= 24 && dy <= 30 && Math.abs(dx) <= 20) {
        const gbright = 0.8 + 0.2 * (1 - Math.abs(dx) / 20);
        setPixel(px, py,
          Math.round(212 * gbright),
          Math.round(170 * gbright),
          Math.round(40 * gbright), 250);
      }
      
      // 护手高光: rect x="-14" y="24" width="28" height="6"
      if (dy >= 24 && dy <= 30 && Math.abs(dx) <= 14) {
        setPixel(px, py,
          Math.min(255, 232), Math.min(255, 184), Math.min(255, 40), 255);
      }
      
      // 剑柄: rect x="-5" y="30" width="10" height="24"
      if (dy >= 30 && dy <= 54 && Math.abs(dx) <= 5) {
        setPixel(px, py, 138, 110, 32, 240);
      }
      
      // 剑柄末端: circle 末端
      if (dy >= 54 && dy <= 58) {
        const endDist = Math.sqrt(dx * dx + (dy - 56) * (dy - 56));
        if (endDist <= 5) {
          setPixel(px, py, 212, 170, 40, 245);
        }
        if (endDist <= 3) {
          setPixel(px, py, 232, 184, 40, 255);
        }
      }
    }
  }
}

// 绘制两把剑
drawSword(25, CX, CY - 10, true);   // 右剑
drawSword(25, CX, CY - 10, false);  // 左剑

// 5. 交叉点菱形宝石: polygon points="0,-14 10,-6 0,4 -10,-6"
const dCX = CX, dCY = CY - 10;
for (let px = dCX - 12; px <= dCX + 12; px++) {
  for (let py = dCY - 16; py <= dCY + 6; py++) {
    const dx = (px - dCX) / 10;
    const dy = (py - dCY) / 10;
    if (Math.abs(dx) + Math.abs(dy) <= 1) {
      const d = Math.abs(dx) + Math.abs(dy);
      setPixel(px, py,
        Math.round(241 - d * 30),
        Math.round(196 - d * 50),
        Math.round(15 + d * 20), 255);
    }
  }
}
// 菱形高光: polygon points="0,-10 6,-5 0,2 -6,-5"
for (let px = dCX - 8; px <= dCX + 8; px++) {
  for (let py = dCY - 12; py <= dCY + 4; py++) {
    const dx = (px - dCX) / 6;
    const dy = (py - dCY - 2) / 7;
    if (Math.abs(dx) + Math.abs(dy) <= 1) {
      setPixel(px, py, 247, 220, 111, 230);
    }
  }
}

// ===== PNG 编码 =====
function createPNG(width, height, pixelData) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    pixelData.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(raw);
  const chunks = [];
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  chunks.push(writeChunk('IHDR', ihdr));
  chunks.push(writeChunk('IDAT', compressed));
  chunks.push(writeChunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(chunks);
}

function writeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crc = crc32(crcData);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc, 0);
  return Buffer.concat([length, typeB, data, crcB]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// 主图标 256x256
const png = createPNG(SIZE, SIZE, data);
fs.writeFileSync('vscode-extension/icon.png', png);
console.log(`✅ icon.png (${png.length} bytes, ${SIZE}x${SIZE})`);

// ===== 活动栏图标 48x48 =====
// VS Code 活动栏图标的规则：透明背景 + 白色/浅色形状
// VS Code 会自动对白色区域进行主题着色（激活时用主题色，不激活时用灰色）
// 所以绝对不能有不透明背景，否则 VS Code 会把整个图标当作灰色方块看待！
const SMALL = 48;
const smallData = Buffer.alloc(SMALL * SMALL * 4, 0);

// 1. 初始化全透明背景
for (let px = 0; px < SMALL; px++) {
  for (let py = 0; py < SMALL; py++) {
    const idx = (py * SMALL + px) * 4;
    smallData[idx] = 0;
    smallData[idx+1] = 0;
    smallData[idx+2] = 0;
    smallData[idx+3] = 0;
  }
}

// 2. 缩小版的交叉剑 — 用白色绘制（alpha 区分透明度）
// VS Code 会对着色区域自动进行主题着色，不需要彩色
const SCX = SMALL / 2, SCY = SMALL / 2;
// 按像素坐标直接计算，不依赖 ratio 缩放
// 完整剑从剑尖(-62)到剑柄末端(+58) = 120 单位
// 48px 图标需要覆盖大约 40px 范围，所以比例约 40/120 ≈ 0.33
// 但为了看得清楚，让剑稍微更大一些
const swordScale = 0.45; // 放大系数，使剑在 48px 中清晰可见

function drawActivitySword(angleDeg, cx, cy, isRight) {
  const angle = angleDeg * Math.PI / 180 * (isRight ? 1 : -1);
  const cosA = Math.cos(angle), sinA = Math.sin(angle);
  const s = swordScale;
  
  // 计算边界框: 剑尖 -62*s 到 剑柄末端 58*s，护手 ±20*s
  // 加上旋转最大范围，用保险值
  const maxR = 62 * s;
  const minPx = Math.max(0, Math.round(cx - maxR - 2));
  const maxPx = Math.min(SMALL - 1, Math.round(cx + maxR + 2));
  const minPy = Math.max(0, Math.round(cy - maxR - 2));
  const maxPy = Math.min(SMALL - 1, Math.round(cy + maxR + 2));
  
  for (let py = minPy; py <= maxPy; py++) {
    for (let px = minPx; px <= maxPx; px++) {
      // 反旋转到剑的本地坐标系
      const dx = (px - cx) * cosA + (py - cy) * sinA;
      const dy = -(px - cx) * sinA + (py - cy) * cosA;
      const dxAbs = Math.abs(dx);
      
      // 剑身：从剑尖(-56*s)到护手(24*s)，宽度渐变
      if (dy >= -56 * s && dy <= 24 * s) {
        const t = (dy + 56 * s) / (80 * s);
        const halfW = 4 * s * (0.15 + 0.85 * (1 - t));
        if (dxAbs <= halfW) {
          const bright = 0.7 + 0.3 * (1 - t);
          const val = Math.round(255 * bright);
          const alpha = Math.round(180 + 75 * (1 - t));
          setSmallPixel(px, py, val, val, val, alpha);
        }
      }
      
      // 剑尖三角
      if (dy >= -62 * s && dy <= -56 * s) {
        const tipT = (dy + 62 * s) / (6 * s);
        const halfW = 4 * s * (1 - tipT);
        if (dxAbs <= halfW) {
          setSmallPixel(px, py, 255, 255, 255, 230);
        }
      }
      
      // 护手
      if (dy >= 24 * s && dy <= 30 * s && dxAbs <= 20 * s) {
        setSmallPixel(px, py, 240, 240, 220, 220);
      }
      
      // 剑柄
      if (dy >= 30 * s && dy <= 54 * s && dxAbs <= 5 * s) {
        const val = Math.round(200 - 30 * (dy - 30 * s) / (24 * s));
        setSmallPixel(px, py, val, val, val - 10, 200);
      }
      
      // 剑柄末端圆球
      if (dy >= 54 * s && dy <= 58 * s) {
        const endDist = Math.sqrt(dx * dx + (dy - 56 * s) * (dy - 56 * s));
        if (endDist <= 5 * s) {
          setSmallPixel(px, py, 200, 200, 190, 200);
        }
      }
    }
  }
}

function setSmallPixel(x, y, r, g, b, a) {
  const ix = Math.round(x), iy = Math.round(y);
  if (ix < 0 || ix >= SMALL || iy < 0 || iy >= SMALL) return;
  const idx = (iy * SMALL + ix) * 4;
  const alpha = a / 255;
  // 在透明背景上叠加 — 不使用已有颜色混合（背景是透明的）
  if (a > 0) {
    smallData[idx]     = Math.round(r);
    smallData[idx + 1] = Math.round(g);
    smallData[idx + 2] = Math.round(b);
    smallData[idx + 3] = Math.min(255, smallData[idx + 3] + a);
  }
}

// 绘制两把交叉剑
drawActivitySword(25, SCX, SCY - 2, true);   // 右剑
drawActivitySword(25, SCX, SCY - 2, false);  // 左剑

// 交叉点宝石 - 白色菱形
const dSX = SCX, dSY = SCY - 2;
for (let px = dSX - 4; px <= dSX + 4; px++) {
  for (let py = dSY - 5; py <= dSY + 2; py++) {
    const dx = (px - dSX) / 3;
    const dy = (py - dSY) / 3;
    if (Math.abs(dx) + Math.abs(dy) <= 1) {
      setSmallPixel(px, py, 255, 255, 240, 230);
    }
  }
}

const smallPng = createPNG(SMALL, SMALL, smallData);
fs.writeFileSync('vscode-extension/icon48.png', smallPng);
console.log(`✅ icon48.png (${smallPng.length} bytes, ${SMALL}x${SMALL})`);
