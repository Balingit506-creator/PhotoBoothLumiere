/*
 * Lumière Booth — layouts, templates and the photo-strip renderer.
 * Every template is drawn procedurally on <canvas>, so the artwork is original,
 * resolution-independent and ships with zero image assets.
 */

const TAU = Math.PI * 2;
const YEAR = new Date().getFullYear();

/* ------------------------------------------------------------------ utils */

function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
function mix(hex, hex2, t) {
  const a = hexToRgb(hex), b = hexToRgb(hex2);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
}

function fill(ctx, L, color) { ctx.fillStyle = color; ctx.fillRect(0, 0, L.w, L.h); }
function vGrad(ctx, L, c0, c1) {
  const g = ctx.createLinearGradient(0, 0, 0, L.h);
  g.addColorStop(0, c0); g.addColorStop(1, c1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, L.w, L.h);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (!r) { ctx.rect(x, y, w, h); return; }
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function cover(ctx, img, x, y, w, h) {
  const iw = img.width, ih = img.height;
  const s = Math.max(w / iw, h / ih);
  const sw = w / s, sh = h / s;
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
}

function gold(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#a8782a');
  g.addColorStop(0.22, '#f3dc97');
  g.addColorStop(0.45, '#b98a36');
  g.addColorStop(0.7, '#f7e6ae');
  g.addColorStop(1, '#9c6d22');
  return g;
}
const GOLDS = ['#d4af37', '#f1d98b', '#b8862b', '#fff2c4', '#c99a3c'];

/* --------------------------------------------------------------- shapes */

function blobPath(ctx, x, y, r, R, jag, n) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const rr = r * (1 - jag / 2 + R() * jag);
    p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  ctx.beginPath();
  const s = mid(p[n - 1], p[0]);
  ctx.moveTo(s[0], s[1]);
  for (let i = 0; i < n; i++) {
    const e = mid(p[i], p[(i + 1) % n]);
    ctx.quadraticCurveTo(p[i][0], p[i][1], e[0], e[1]);
  }
  ctx.closePath();
}

// Layered translucent blobs read as a watercolour wash.
function watercolor(ctx, x, y, r, color, R, layers = 8, alpha = 0.09) {
  for (let i = 0; i < layers; i++) {
    blobPath(ctx, x + (R() - 0.5) * r * 0.35, y + (R() - 0.5) * r * 0.35, r * (0.5 + R() * 0.55), R, 0.5, 11);
    ctx.fillStyle = rgba(color, alpha);
    ctx.fill();
  }
}

function leaf(ctx, x, y, len, wid, ang, color, vein) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -wid, len, 0);
  ctx.quadraticCurveTo(len * 0.5, wid, 0, 0);
  ctx.fillStyle = color; ctx.fill();
  if (vein) {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len * 0.92, 0);
    ctx.strokeStyle = vein; ctx.lineWidth = Math.max(0.6, wid * 0.07); ctx.stroke();
  }
  ctx.restore();
}

function bigLeaf(ctx, x, y, len, ang, color, vein) {
  const wid = len * 0.3;
  leaf(ctx, x, y, len, wid, ang, color, vein);
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  ctx.strokeStyle = vein; ctx.lineWidth = len * 0.007; ctx.lineCap = 'round';
  for (let i = 1; i < 8; i++) {
    const t = i / 8, t2 = Math.min(0.97, t + 0.1);
    const hw = 2 * t2 * (1 - t2) * wid * 0.85;
    ctx.beginPath(); ctx.moveTo(len * t, 0); ctx.lineTo(len * t2, -hw); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(len * t, 0); ctx.lineTo(len * t2, hw); ctx.stroke();
  }
  ctx.restore();
}

function sprig(ctx, x, y, len, ang, color, R, leafLen, leafW, count = 6, curve = 0.15) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(0.8, leafW * 0.14); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len / 2, len * curve, len, 0); ctx.stroke();
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    const px = len * t, py = 2 * (1 - t) * t * len * curve;
    const side = i % 2 ? 1 : -1, s = 1 - t * 0.35;
    leaf(ctx, px, py, leafLen * s, leafW * s, side * (0.75 + R() * 0.3) - 0.05, color);
  }
  leaf(ctx, len, 0, leafLen * 0.75, leafW * 0.75, 0, color);
  ctx.restore();
}

function roundSprig(ctx, x, y, len, ang, color, R, leafR, count = 6) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  ctx.strokeStyle = color; ctx.lineWidth = leafR * 0.12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len / 2, len * 0.08, len, 0); ctx.stroke();
  ctx.fillStyle = color;
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 0.5);
    const px = len * t, py = 2 * (1 - t) * t * len * 0.08, s = leafR * (1 - t * 0.45);
    for (const side of [-1, 1]) {
      ctx.globalAlpha = 0.72 + R() * 0.25;
      ctx.beginPath(); ctx.ellipse(px, py + side * s * 0.95, s * 0.9, s * 0.72, side * 0.3, 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function flower(ctx, x, y, r, n, color, center, rot, stroke) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  const ring = (rr, c) => {
    for (let i = 0; i < n; i++) {
      ctx.save(); ctx.rotate((i / n) * TAU);
      ctx.beginPath(); ctx.ellipse(0, -rr * 0.52, rr * 0.34, rr * 0.52, 0, 0, TAU);
      ctx.fillStyle = c; ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(0.8, r * 0.035); ctx.stroke(); }
      ctx.restore();
    }
  };
  ring(r, color);
  ctx.rotate(Math.PI / n);
  ring(r * 0.62, color.startsWith('#') ? mix(color, '#ffffff', 0.32) : color);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.17, 0, TAU); ctx.fillStyle = center; ctx.fill();
  ctx.restore();
}

function floralCluster(ctx, x, y, k, R, o) {
  const a0 = o.angle, sc = (o.scale || 1) * k;
  for (let i = 0; i < 5; i++) {
    const a = a0 + (i - 2) * 0.5 + (R() - 0.5) * 0.2;
    sprig(ctx, x, y, (95 + R() * 55) * sc, a, o.leaf, R, 24 * sc, 9 * sc, 5, (R() - 0.5) * 0.4);
  }
  const u = 50 * sc, ca = Math.cos(a0), sa = Math.sin(a0);
  const spots = [[0.55, 0, 1], [1.3, -0.6, 0.7], [1.2, 0.65, 0.75], [0.25, -0.95, 0.55], [0.25, 0.95, 0.55]];
  spots.forEach(([d, p, s], i) => {
    const px = x + (ca * d - sa * p) * u, py = y + (sa * d + ca * p) * u;
    flower(ctx, px, py, 34 * sc * s, o.petals || 5, o.flowers[i % o.flowers.length], o.center, R() * TAU, o.stroke);
  });
}

function palm(ctx, x, y, len, ang, color) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  const c = 0.1, n = 16;
  ctx.strokeStyle = color; ctx.lineWidth = len * 0.012; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len / 2, len * c, len, 0); ctx.stroke();
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1), px = len * t, py = 2 * (1 - t) * t * len * c;
    const l = len * (0.1 + 0.32 * Math.sin(Math.PI * Math.min(1, t * 1.1)));
    leaf(ctx, px, py, l, len * 0.026, -0.75 - t * 0.2, color);
    leaf(ctx, px, py, l, len * 0.026, 0.75 + t * 0.2, color);
  }
  ctx.restore();
}

function hibiscus(ctx, x, y, r, color, rot) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  for (let i = 0; i < 5; i++) {
    ctx.save(); ctx.rotate((i / 5) * TAU);
    ctx.beginPath(); ctx.ellipse(0, -r * 0.5, r * 0.42, r * 0.55, 0, 0, TAU);
    const g = ctx.createRadialGradient(0, 0, 0, 0, -r * 0.5, r * 0.75);
    g.addColorStop(0, '#7d1535'); g.addColorStop(0.35, color); g.addColorStop(1, mix(color, '#ffffff', 0.28));
    ctx.fillStyle = g; ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = '#f5c542'; ctx.lineWidth = r * 0.045; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.2, -r * 0.8); ctx.stroke();
  ctx.fillStyle = '#f5c542';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.arc(r * 0.2 + (i - 2) * r * 0.055, -r * 0.84 - (i % 2) * r * 0.05, r * 0.045, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function orchid(ctx, x, y, r, color, lip, rot) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  const pet = (a, rx, ry, c) => {
    ctx.save(); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, -ry, rx, ry, 0, 0, TAU); ctx.fillStyle = c; ctx.fill();
    ctx.restore();
  };
  const light = mix(color, '#ffffff', 0.4);
  pet(0, r * 0.2, r * 0.5, light); pet(TAU / 3, r * 0.2, r * 0.5, light); pet(-TAU / 3, r * 0.2, r * 0.5, light);
  pet(1.25, r * 0.34, r * 0.42, color); pet(-1.25, r * 0.34, r * 0.42, color);
  ctx.beginPath(); ctx.ellipse(0, r * 0.2, r * 0.17, r * 0.23, 0, 0, TAU); ctx.fillStyle = lip; ctx.fill();
  ctx.beginPath(); ctx.arc(0, -r * 0.02, r * 0.08, 0, TAU); ctx.fillStyle = '#fff6c8'; ctx.fill();
  ctx.restore();
}

function confetti(ctx, R, n, colors, a, size) {
  for (let i = 0; i < n; i++) {
    const x = a.x + R() * a.w, y = a.y + R() * a.h, s = size * (0.6 + R() * 0.8);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(R() * TAU);
    ctx.fillStyle = colors[(R() * colors.length) | 0];
    const t = R();
    if (t < 0.5) ctx.fillRect(-s / 2, -s * 0.22, s, s * 0.44);
    else if (t < 0.8) { ctx.beginPath(); ctx.arc(0, 0, s * 0.32, 0, TAU); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(0, -s * 0.4); ctx.lineTo(s * 0.4, s * 0.35); ctx.lineTo(-s * 0.4, s * 0.35); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
}

// bias > 1 concentrates dots toward a.y (use a negative a.h to grow upward).
function glitter(ctx, R, n, a, colors, k, bias = 1) {
  for (let i = 0; i < n; i++) {
    const x = a.x + R() * a.w, y = a.y + Math.pow(R(), bias) * a.h;
    ctx.globalAlpha = 0.35 + R() * 0.65;
    ctx.fillStyle = colors[(R() * colors.length) | 0];
    ctx.beginPath(); ctx.arc(x, y, (0.5 + R() * R() * 2.8) * k, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function glitterAlong(ctx, R, n, path, spread, colors, k) {
  for (let i = 0; i < n; i++) {
    const [px, py] = path(R());
    const g = () => (R() + R() + R() - 1.5) * spread;
    ctx.globalAlpha = 0.3 + R() * 0.7;
    ctx.fillStyle = colors[(R() * colors.length) | 0];
    ctx.beginPath(); ctx.arc(px + g(), py + g(), (0.5 + R() * R() * 2.6) * k, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function sparkle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.closePath(); ctx.fill();
}

function heart(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.78, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.78, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  ctx.closePath();
}

function balloon(ctx, x, y, r, color, k, metal) {
  ctx.save();
  ctx.strokeStyle = 'rgba(130,120,110,.6)'; ctx.lineWidth = 1.3 * k;
  ctx.beginPath(); ctx.moveTo(x, y + r * 1.12);
  ctx.bezierCurveTo(x - r * 0.35, y + r * 1.7, x + r * 0.35, y + r * 2.2, x - r * 0.1, y + r * 3.2);
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + r * 1.0); ctx.lineTo(x - r * 0.12, y + r * 1.15); ctx.lineTo(x + r * 0.12, y + r * 1.15); ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.05, x, y, r * 1.1);
  g.addColorStop(0, 'rgba(255,255,255,.9)');
  g.addColorStop(0.25, color);
  g.addColorStop(1, mix(color, '#000000', metal ? 0.45 : 0.18));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.86, r, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

function snowflake(ctx, x, y, r, lw) {
  ctx.save();
  ctx.translate(x, y); ctx.lineWidth = lw; ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    ctx.rotate(TAU / 6);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, -r);
    ctx.moveTo(0, -r * 0.55); ctx.lineTo(-r * 0.22, -r * 0.76);
    ctx.moveTo(0, -r * 0.55); ctx.lineTo(r * 0.22, -r * 0.76);
    ctx.stroke();
  }
  ctx.restore();
}

function pine(ctx, x, y, len, ang, color, R, k) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  ctx.strokeStyle = color; ctx.lineCap = 'round';
  ctx.lineWidth = 3 * k;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
  ctx.lineWidth = 1.8 * k;
  const n = Math.floor(len / (4.5 * k));
  for (let i = 0; i < n; i++) {
    const px = (i / n) * len, nl = (17 + R() * 6) * k * (1 - (i / n) * 0.5);
    ctx.beginPath();
    ctx.moveTo(px, 0); ctx.lineTo(px + nl * 0.6, -nl);
    ctx.moveTo(px, 0); ctx.lineTo(px + nl * 0.6, nl);
    ctx.stroke();
  }
  ctx.restore();
}

function berries(ctx, x, y, k) {
  [[0, 0], [11, 6], [3, 13], [-9, 8]].forEach(([dx, dy]) => {
    const bx = x + dx * k, by = y + dy * k;
    ctx.fillStyle = '#c62828'; ctx.beginPath(); ctx.arc(bx, by, 6.5 * k, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(bx - 2 * k, by - 2 * k, 1.8 * k, 0, TAU); ctx.fill();
  });
}

function citrus(ctx, x, y, r, rind, flesh) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = rind; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, TAU); ctx.fillStyle = '#fffbea'; ctx.fill();
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU + 0.06, a1 = ((i + 1) / n) * TAU - 0.06, am = (a0 + a1) / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(am) * r * 0.08, Math.sin(am) * r * 0.08);
    ctx.arc(0, 0, r * 0.82, a0, a1);
    ctx.closePath();
    ctx.fillStyle = flesh; ctx.fill();
  }
  ctx.restore();
}

function isoCubes(ctx, w, h, s, faces) {
  const hx = (s * Math.sqrt(3)) / 2;
  const poly = (cx, cy, pts, c) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(cx + px, cy + py) : ctx.moveTo(cx + px, cy + py)));
    ctx.closePath(); ctx.fillStyle = c; ctx.fill();
  };
  for (let row = -1; (row - 1) * s * 1.5 < h; row++) {
    for (let col = -1; (col - 1) * hx * 2 < w; col++) {
      const cx = col * hx * 2 + (row & 1 ? hx : 0), cy = row * s * 1.5;
      poly(cx, cy, [[0, -s], [hx, -s / 2], [0, 0], [-hx, -s / 2]], faces[0]);
      poly(cx, cy, [[-hx, -s / 2], [0, 0], [0, s], [-hx, s / 2]], faces[1]);
      poly(cx, cy, [[hx, -s / 2], [0, 0], [0, s], [hx, s / 2]], faces[2]);
    }
  }
}

function marble(ctx, L, R) {
  const { w, h, k } = L;
  fill(ctx, L, '#f7f5f2');
  for (let i = 0; i < 10; i++) watercolor(ctx, R() * w, R() * h, (120 + R() * 200) * k, '#b9b2a8', R, 4, 0.05);
  ctx.lineCap = 'round';
  const vein = (style, width) => {
    let x = R() * w, y = R() * h - h * 0.1;
    const a = 0.6 + R() * 0.8;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let j = 0; j < 7; j++) {
      const step = (80 + R() * 120) * k;
      const nx = x + Math.cos(a) * step + (R() - 0.5) * 60 * k;
      const ny = y + Math.sin(a) * step + (R() - 0.5) * 60 * k;
      ctx.quadraticCurveTo(x + (R() - 0.5) * 90 * k, y + (R() - 0.5) * 90 * k, nx, ny);
      x = nx; y = ny;
    }
    ctx.strokeStyle = style; ctx.lineWidth = width; ctx.stroke();
  };
  for (let i = 0; i < 18; i++) vein(`rgba(110,104,98,${0.07 + R() * 0.18})`, (0.6 + R() * 2.2) * k);
  ctx.globalAlpha = 0.75;
  for (let i = 0; i < 4; i++) vein(gold(ctx, 0, 0, w, h), (0.8 + R() * 1.2) * k);
  ctx.globalAlpha = 1;
}

function decoFan(ctx, cx, cy, r, k, stroke) {
  ctx.save();
  ctx.strokeStyle = stroke; ctx.lineWidth = 1.6 * k;
  for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(cx, cy, (r * i) / 3, Math.PI, TAU); ctx.stroke(); }
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.33, cy + Math.sin(a) * r * 0.33);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.restore();
}

function notchedRect(ctx, x, y, w, h, s) {
  ctx.beginPath();
  ctx.moveTo(x + s, y); ctx.lineTo(x + w - s, y); ctx.lineTo(x + w - s, y + s); ctx.lineTo(x + w, y + s);
  ctx.lineTo(x + w, y + h - s); ctx.lineTo(x + w - s, y + h - s); ctx.lineTo(x + w - s, y + h);
  ctx.lineTo(x + s, y + h); ctx.lineTo(x + s, y + h - s); ctx.lineTo(x, y + h - s);
  ctx.lineTo(x, y + s); ctx.lineTo(x + s, y + s); ctx.closePath();
}

function gradCap(ctx, cx, cy, s, color) {
  ctx.save();
  ctx.fillStyle = color; ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.34, cy + s * 0.08); ctx.lineTo(cx - s * 0.34, cy + s * 0.36);
  ctx.quadraticCurveTo(cx, cy + s * 0.52, cx + s * 0.34, cy + s * 0.36);
  ctx.lineTo(cx + s * 0.34, cy + s * 0.08); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - s, cy); ctx.lineTo(cx, cy - s * 0.4); ctx.lineTo(cx + s, cy); ctx.lineTo(cx, cy + s * 0.4);
  ctx.closePath(); ctx.fill();
  ctx.lineWidth = s * 0.045; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + s * 0.72, cy + s * 0.1); ctx.lineTo(cx + s * 0.72, cy + s * 0.62); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx + s * 0.72, cy + s * 0.7, s * 0.07, s * 0.12, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

function brushEdge(ctx, x0, y0, x1, y1, R, k, style) {
  const len = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(len / (26 * k));
  const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
  ctx.strokeStyle = style; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = Math.min(1, t0 + 0.06 + R() * 0.1);
    const off = (2 + R() * 14) * k;
    ctx.globalAlpha = 0.25 + R() * 0.55;
    ctx.lineWidth = (2 + R() * 7) * k;
    ctx.beginPath();
    ctx.moveTo(x0 + (x1 - x0) * t0 + nx * off, y0 + (y1 - y0) * t0 + ny * off);
    ctx.lineTo(x0 + (x1 - x0) * t1 + nx * (off + (R() - 0.5) * 6 * k), y0 + (y1 - y0) * t1 + ny * (off + (R() - 0.5) * 6 * k));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function flake(ctx, x, y, r, R) {
  ctx.beginPath();
  const n = 5 + ((R() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, rr = r * (0.5 + R() * 0.6);
    i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}

function bat(ctx, x, y, s, rot) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s);
  // Each piece is filled on its own so overlapping windings never punch holes.
  for (const d of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(0, -0.2);
    ctx.quadraticCurveTo(d * 0.35, -0.62, d, -0.34);
    ctx.quadraticCurveTo(d * 0.82, -0.12, d * 0.88, 0.12);
    ctx.quadraticCurveTo(d * 0.68, 0, d * 0.58, 0.2);
    ctx.quadraticCurveTo(d * 0.44, 0.04, d * 0.3, 0.24);
    ctx.quadraticCurveTo(d * 0.14, 0.06, 0, 0.3);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(d * 0.11, -0.16); ctx.lineTo(d * 0.07, -0.36); ctx.lineTo(d * 0.02, -0.2); ctx.closePath(); ctx.fill();
  }
  ctx.beginPath(); ctx.ellipse(0, 0.02, 0.13, 0.26, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

function pumpkin(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  [[-0.5, 0.5], [0.5, 0.5], [-0.25, 0.55], [0.25, 0.55], [0, 0.5]].forEach(([dx, rx]) => {
    const g = ctx.createRadialGradient(dx * r - r * 0.15, -r * 0.25, r * 0.05, dx * r, 0, r * 0.9);
    g.addColorStop(0, '#ffb35c'); g.addColorStop(1, '#d9590f');
    ctx.beginPath(); ctx.ellipse(dx * r, 0, rx * r, r * 0.78, 0, 0, TAU);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(120,40,0,.35)'; ctx.lineWidth = r * 0.03; ctx.stroke();
  });
  ctx.fillStyle = '#4d5a24';
  ctx.beginPath();
  ctx.moveTo(-r * 0.08, -r * 0.68);
  ctx.quadraticCurveTo(-r * 0.02, -r * 1.02, r * 0.18, -r * 1.06);
  ctx.lineTo(r * 0.16, -r * 0.96);
  ctx.quadraticCurveTo(r * 0.07, -r * 0.88, r * 0.1, -r * 0.68);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// A quarter spider web in a corner; sx/sy flip it into the other corners.
function web(ctx, x, y, r, k, color, sx = 1, sy = 1) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(sx, sy);
  ctx.strokeStyle = color; ctx.lineWidth = 1.1 * k;
  const n = 6, A = (i) => (i / (n - 1)) * (Math.PI / 2);
  for (let i = 0; i < n; i++) {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(A(i)) * r, Math.sin(A(i)) * r); ctx.stroke();
  }
  for (let j = 1; j <= 4; j++) {
    const rr = (r * j) / 4.4;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const px = Math.cos(A(i)) * rr, py = Math.sin(A(i)) * rr;
      if (!i) { ctx.moveTo(px, py); continue; }
      const am = (A(i) + A(i - 1)) / 2;
      ctx.quadraticCurveTo(Math.cos(am) * rr * 0.82, Math.sin(am) * rr * 0.82, px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function firework(ctx, x, y, r, color, R, k) {
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round';
  const n = 26;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + R() * 0.1, r0 = r * (0.18 + R() * 0.12), r1 = r * (0.75 + R() * 0.25);
    const ca = Math.cos(a), sa = Math.sin(a);
    ctx.globalAlpha = 0.55 + R() * 0.45; ctx.lineWidth = (1 + R() * 1.4) * k;
    ctx.beginPath(); ctx.moveTo(x + ca * r0, y + sa * r0); ctx.lineTo(x + ca * r1, y + sa * r1); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + ca * (r1 + 5 * k), y + sa * (r1 + 5 * k), 1.6 * k, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function cloud(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  [[-0.55, 0.1, 0.32], [-0.2, -0.12, 0.42], [0.25, -0.05, 0.36], [0.58, 0.12, 0.26]].forEach(([dx, dy, r]) => {
    ctx.moveTo(x + dx * s + r * s, y + dy * s);
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
  });
  ctx.moveTo(x + 0.85 * s, y + 0.2 * s);
  ctx.ellipse(x, y + 0.2 * s, 0.85 * s, 0.2 * s, 0, 0, TAU);
  ctx.fill();
}

// Right half of a maple leaf in unit coordinates; the left half mirrors it.
const MAPLE = [[0, -1], [0.14, -0.6], [0.36, -0.72], [0.3, -0.36], [0.78, -0.5], [0.64, -0.18], [0.92, 0.02], [0.46, 0.14], [0.54, 0.4], [0.1, 0.3], [0.04, 0.36]];
function mapleLeaf(ctx, x, y, s, rot, color) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.beginPath();
  MAPLE.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  for (let i = MAPLE.length - 1; i >= 0; i--) ctx.lineTo(-MAPLE[i][0], MAPLE[i][1]);
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = mix(color, '#000000', 0.25); ctx.lineWidth = 0.035; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0.85); ctx.lineTo(0, -0.7);
  ctx.moveTo(0, 0.1); ctx.lineTo(0.6, -0.35); ctx.moveTo(0, 0.1); ctx.lineTo(-0.6, -0.35);
  ctx.stroke();
  ctx.restore();
}

function pampas(ctx, x, y, len, ang, color, R, k) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang); ctx.lineCap = 'round';
  ctx.strokeStyle = mix(color, '#000000', 0.25); ctx.lineWidth = 1.6 * k;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, len * 0.05, len, 0); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 1.1 * k;
  for (let i = 0; i < 80; i++) {
    const t = 0.35 + R() * 0.65, px = len * t, py = 2 * (1 - t) * t * len * 0.05;
    const plume = Math.sin((Math.PI * (t - 0.35)) / 0.65) * len * 0.13 + 4 * k;
    const l = plume * (0.5 + R() * 0.5), side = R() < 0.5 ? -1 : 1;
    ctx.globalAlpha = 0.35 + R() * 0.5;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + l * 0.55, py + side * l); ctx.stroke();
  }
  ctx.restore();
}

function blossomBranch(ctx, x, y, len, ang, R, k, petal, center) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  ctx.strokeStyle = '#5a3a2e'; ctx.lineCap = 'round';
  ctx.lineWidth = 7 * k;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, len * 0.12, len, len * 0.04); ctx.stroke();
  const pts = [[len, len * 0.04], [len * 0.62, len * 0.1]];
  for (let i = 0; i < 4; i++) {
    const t = 0.25 + i * 0.18, bx = len * t, by = 2 * (1 - t) * t * len * 0.12 + t * t * len * 0.04;
    const side = i % 2 ? 1 : -1, tl = len * (0.28 - i * 0.04), ex = bx + tl * 0.7, ey = by + side * tl * 0.7;
    ctx.lineWidth = 3.5 * k * (1 - i * 0.15);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + tl * 0.4, by + side * tl * 0.2, ex, ey); ctx.stroke();
    pts.push([ex, ey], [(bx + ex) / 2 + side * 4 * k, (by + ey) / 2]);
  }
  pts.forEach(([px, py]) => flower(ctx, px, py, (13 + R() * 9) * k, 5, petal, center, R() * TAU));
  ctx.restore();
}

/* -------------------------------------------------------------- layouts */

function strip(n, photoH, gap, top) {
  const slots = [];
  let y = top;
  for (let i = 0; i < n; i++) { slots.push({ x: 40, y, w: 520, h: photoH }); y += photoH + gap; }
  y -= gap;
  return { slots, gap, F: { x: 0, y, w: 600, h: 1800 - y } };
}

const LAYOUTS = {
  strip3: { id: 'strip3', name: 'Classic Strip', detail: '3 photos · 2×6 in', count: 3, w: 600, h: 1800, ...strip(3, 400, 28, 40) },
  strip4: { id: 'strip4', name: 'Four-Frame Strip', detail: '4 photos · 2×6 in', count: 4, w: 600, h: 1800, ...strip(4, 330, 22, 40) },
  double: { id: 'double', name: 'Double Strip', detail: 'two 4-photo strips · 4×6 in', count: 4, w: 1200, h: 1800, composite: 'strip4' },
  grid4: {
    id: 'grid4', name: 'Postcard Grid', detail: '4 photos · 4×6 in', count: 4, w: 1200, h: 1800, gap: 30,
    slots: [
      { x: 60, y: 60, w: 525, h: 620 }, { x: 615, y: 60, w: 525, h: 620 },
      { x: 60, y: 710, w: 525, h: 620 }, { x: 615, y: 710, w: 525, h: 620 },
    ],
    F: { x: 0, y: 1330, w: 1200, h: 470 },
  },
  single: {
    id: 'single', name: 'Portrait', detail: '1 photo · 4×6 in', count: 1, w: 1200, h: 1800, gap: 120,
    slots: [{ x: 60, y: 60, w: 1080, h: 1290 }],
    F: { x: 0, y: 1350, w: 1200, h: 450 },
  },
};

/* ------------------------------------------------------------ templates */

const T = [];
const add = (t) => T.push(t);
const serifTitle = (o) => ({ family: 'Cormorant Garamond', weight: 600, style: 'italic', size: 60, ...o });
const script = (o) => ({ family: 'Great Vibes', weight: 400, size: 76, ...o });
const caps = (o) => ({ family: 'Montserrat', weight: 400, size: 13, spacing: 6, upper: true, ...o });

add({
  id: 'classic', name: 'Classic White', cats: ['classic'], caption: 'Our Moments',
  bg(ctx, L) { fill(ctx, L, '#fbfaf7'); },
  deco(ctx, L) {
    const { k, F } = L;
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(L.w / 2 - 22 * k, F.y + F.h * 0.22, 44 * k, 1.5 * k);
  },
  text: { title: serifTitle({ color: '#1c1917' }), sub: caps({ size: 14, color: '#7a7067' }) },
});

add({
  id: 'film', name: 'Noir Film', cats: ['classic', 'party'], caption: 'Frame by Frame',
  bg(ctx, L) {
    fill(ctx, L, '#121110');
    const m = L.slots[0].x, hw = m * 0.36, hh = hw * 1.35, step = hh * 2.1;
    ctx.fillStyle = '#efe8dc';
    for (let y = step * 0.4; y < L.h - hh; y += step) {
      roundRect(ctx, (m - hw) / 2, y, hw, hh, hw * 0.25); ctx.fill();
      roundRect(ctx, L.w - (m + hw) / 2, y, hw, hh, hw * 0.25); ctx.fill();
    }
  },
  deco(ctx, L) {
    const { k, F } = L;
    ctx.fillStyle = '#e39b3d';
    ctx.font = `600 ${11 * k}px "Montserrat", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('LUMIÈRE 400  ▸  24A', L.w / 2, F.y + F.h - 26 * k);
  },
  text: {
    title: { family: 'Montserrat', weight: 600, size: 32, spacing: 10, upper: true, color: '#f3ede2' },
    sub: caps({ weight: 300, color: '#9d958a' }),
  },
});

add({
  id: 'gatsby', name: 'Gatsby Deco', cats: ['wedding', 'party'], caption: 'The Roaring Night',
  bg(ctx, L) {
    vGrad(ctx, L, '#0b1320', '#131f35');
    const { w, h, k } = L;
    ctx.strokeStyle = 'rgba(214,180,106,.07)'; ctx.lineWidth = 1.5 * k;
    for (let i = 0; i < 40; i++) {
      const a = Math.PI + (i / 39) * Math.PI;
      ctx.beginPath(); ctx.moveTo(w / 2, h); ctx.lineTo(w / 2 + Math.cos(a) * h, h + Math.sin(a) * h); ctx.stroke();
    }
  },
  deco(ctx, L) {
    const { w, h, k, F } = L, g = gold(ctx, 0, 0, w, h);
    ctx.strokeStyle = g;
    ctx.lineWidth = 2 * k; ctx.strokeRect(14 * k, 14 * k, w - 28 * k, h - 28 * k);
    ctx.lineWidth = 0.8 * k; ctx.strokeRect(21 * k, 21 * k, w - 42 * k, h - 42 * k);
    const e = Math.min(8 * k, L.gap * 0.28);
    L.slots.forEach((s) => {
      notchedRect(ctx, s.x - e, s.y - e, s.w + 2 * e, s.h + 2 * e, 10 * k);
      ctx.lineWidth = 1.6 * k; ctx.stroke();
    });
    decoFan(ctx, w / 2, h - 26 * k, Math.min(F.h * 0.4, w * 0.3), k, g);
  },
  text: {
    ty: 0.27, sy: 0.43,
    title: { family: 'Poiret One', weight: 400, size: 54, gold: true },
    sub: caps({ spacing: 8, color: '#d9c38c' }),
  },
});

add({
  id: 'geometric', name: 'Modern Geometric', cats: ['wedding'], caption: 'Mr & Mrs',
  bg(ctx, L) {
    fill(ctx, L, '#f6f1e9');
    const { w, h, k } = L;
    ctx.strokeStyle = gold(ctx, 0, 0, w, h); ctx.lineWidth = 1.2 * k;
    [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]].forEach(([cx, cy, sx, sy]) => {
      for (let i = 1; i <= 4; i++) {
        const s = (26 + i * 26) * k;
        ctx.beginPath(); ctx.moveTo(cx + sx * s, cy); ctx.lineTo(cx, cy + sy * s); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + sx * 90 * k, cy + sy * 90 * k); ctx.stroke();
    });
  },
  deco(ctx, L) {
    const { w, k, F } = L, cy = F.y + F.h * 0.2;
    ctx.strokeStyle = gold(ctx, w * 0.2, 0, w * 0.8, 0); ctx.lineWidth = 1.2 * k;
    ctx.beginPath(); ctx.moveTo(w / 2, cy - 10 * k); ctx.lineTo(w / 2 + 10 * k, cy); ctx.lineTo(w / 2, cy + 10 * k); ctx.lineTo(w / 2 - 10 * k, cy); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w / 2 - 80 * k, cy); ctx.lineTo(w / 2 - 18 * k, cy); ctx.moveTo(w / 2 + 18 * k, cy); ctx.lineTo(w / 2 + 80 * k, cy); ctx.stroke();
  },
  text: { ty: 0.45, sy: 0.63, title: serifTitle({ style: 'normal', color: '#2b2622' }), sub: caps({ spacing: 7, color: '#a07d45' }) },
});

add({
  id: 'lavender', name: 'Lavender Watercolour', cats: ['wedding'], caption: 'Forever & Always',
  bg(ctx, L, R) {
    const { w, h, k, F } = L;
    fill(ctx, L, '#fffdfd');
    watercolor(ctx, 0, 0, 190 * k, '#a58bd0', R);
    watercolor(ctx, w * 0.9, h, 230 * k, '#8f73c4', R);
    watercolor(ctx, w, F.y, 110 * k, '#cdb9ec', R);
    watercolor(ctx, 0, F.y + F.h * 0.7, 130 * k, '#d9cbef', R);
  },
  deco(ctx, L, R) {
    const { w, h, k } = L;
    const o = { flowers: ['#8e6cc2', '#b39ddb', '#7a5bb0'], center: '#f3d58a', leaf: '#8aa37b' };
    floralCluster(ctx, 8 * k, 8 * k, k, R, { ...o, angle: 0.8 });
    floralCluster(ctx, w - 8 * k, h - 8 * k, k, R, { ...o, angle: Math.PI + 0.8, scale: 0.85 });
  },
  text: { ty: 0.4, sy: 0.58, title: script({ color: '#6c4f9a' }), sub: caps({ color: '#8c7a9e' }) },
});

add({
  id: 'goldleaf', name: 'Gold Leaf', cats: ['wedding'], caption: 'Happily Ever After',
  bg(ctx, L) { fill(ctx, L, '#fbf7ef'); },
  deco(ctx, L, R) {
    const { w, h, k } = L, g = gold(ctx, 0, 0, w, h), i = 6 * k;
    brushEdge(ctx, i, i, w - i, i, R, k, g);
    brushEdge(ctx, w - i, i, w - i, h - i, R, k, g);
    brushEdge(ctx, w - i, h - i, i, h - i, R, k, g);
    brushEdge(ctx, i, h - i, i, i, R, k, g);
    ctx.fillStyle = g;
    [[40, 40], [w / k - 40, h / k - 40]].forEach(([cx, cy]) => {
      for (let j = 0; j < 18; j++) {
        ctx.globalAlpha = 0.5 + R() * 0.5;
        flake(ctx, cx * k + (R() - 0.5) * 120 * k, cy * k + (R() - 0.5) * 120 * k, (2 + R() * 6) * k, R);
      }
    });
    ctx.globalAlpha = 1;
  },
  text: {
    ty: 0.4, sy: 0.58,
    title: script({ size: 80, gold: true }),
    sub: { family: 'Cormorant Garamond', weight: 500, style: 'italic', size: 24, color: '#8a6d3b' },
  },
});

add({
  id: 'tropical', name: 'Tropical Paradise', cats: ['summer', 'party'], caption: 'Aloha',
  bg(ctx, L) {
    const { w, h, k } = L;
    fill(ctx, L, '#fbf6ec');
    const greens = ['#245a41', '#2f6b4f', '#3f8a60'];
    [0.45, 0.95, 1.4].forEach((a, i) => { palm(ctx, -10 * k, -10 * k, 250 * k, a, greens[i]); palm(ctx, w + 10 * k, -10 * k, 250 * k, Math.PI - a, greens[2 - i]); });
    [-0.55, -0.95, -1.3].forEach((a, i) => { palm(ctx, -10 * k, h + 10 * k, 175 * k, a, greens[i]); palm(ctx, w + 10 * k, h + 10 * k, 175 * k, -Math.PI - a, greens[2 - i]); });
  },
  photo: { border: 6, borderColor: '#ffffff' },
  deco(ctx, L) {
    const { w, h, k } = L;
    bigLeaf(ctx, 30 * k, 30 * k, 90 * k, 0.3, '#2f6b4f', '#6fae88');
    hibiscus(ctx, 42 * k, 42 * k, 44 * k, '#e84a6f', 0.3);
    hibiscus(ctx, 96 * k, 22 * k, 24 * k, '#f28b82', 1.1);
    bigLeaf(ctx, w - 30 * k, h - 40 * k, 100 * k, Math.PI + 0.5, '#245a41', '#5f9e79');
    hibiscus(ctx, w - 50 * k, h - 62 * k, 50 * k, '#e84a6f', -0.4);
    hibiscus(ctx, w - 110 * k, h - 30 * k, 26 * k, '#f28b82', 0.7);
  },
  text: {
    ty: 0.4, sy: 0.56,
    title: { family: 'Playfair Display', weight: 700, style: 'italic', size: 58, color: '#1f4d3a' },
    sub: caps({ weight: 600, color: '#e07a5f' }),
  },
});

add({
  id: 'graduation', name: 'Class Of', cats: ['celebration'], caption: `Class of ${YEAR}`,
  bg(ctx, L, R) {
    vGrad(ctx, L, '#0f1b35', '#1c2b50');
    confetti(ctx, R, 60 * L.k, ['rgba(241,217,139,.55)', 'rgba(255,255,255,.35)'], { x: 0, y: 0, w: L.w, h: L.h }, 10 * L.k);
  },
  photo: { border: 3, borderColor: '#d4af37' },
  deco(ctx, L, R) {
    const { w, k, F } = L;
    confetti(ctx, R, 26, ['#d4af37', '#f1d98b', '#ffffff'], { x: 0, y: F.y, w, h: F.h }, 11 * k);
    gradCap(ctx, w / 2, F.y + F.h * 0.2, Math.min(36 * k, F.h * 0.09), gold(ctx, w / 2 - 40 * k, 0, w / 2 + 40 * k, 0));
  },
  text: {
    ty: 0.47, sy: 0.65,
    title: { family: 'Playfair Display', weight: 700, size: 50, gold: true },
    sub: caps({ weight: 600, spacing: 8, color: '#e8e8e8' }),
  },
});

add({
  id: 'minimal', name: 'Ivory Minimal', cats: ['wedding', 'classic'], caption: 'Together',
  bg(ctx, L) {
    fill(ctx, L, '#faf8f4');
    const { w, h, k } = L;
    ctx.strokeStyle = '#cbbfae'; ctx.lineWidth = 1 * k;
    ctx.strokeRect(16 * k, 16 * k, w - 32 * k, h - 32 * k);
  },
  deco(ctx, L) {
    const { w, k, F } = L, cy = F.y + F.h * 0.22;
    ctx.strokeStyle = '#b3a591'; ctx.lineWidth = 1 * k;
    ctx.beginPath(); ctx.arc(w / 2, cy, 16 * k, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#b3a591'; ctx.beginPath(); ctx.arc(w / 2, cy, 2.5 * k, 0, TAU); ctx.fill();
  },
  text: {
    ty: 0.47, sy: 0.64,
    title: { family: 'Italiana', weight: 400, size: 50, spacing: 6, upper: true, color: '#2a2622' },
    sub: { family: 'Cormorant Garamond', weight: 500, style: 'italic', size: 22, color: '#8b8175' },
  },
});

add({
  id: 'anniversary', name: 'Eucalyptus', cats: ['wedding', 'celebration'], caption: 'Happy Anniversary',
  bg(ctx, L, R) {
    const { w, h, k } = L;
    fill(ctx, L, '#ffffff');
    watercolor(ctx, w, 0, 180 * k, '#7fb8a4', R);
    watercolor(ctx, 0, h, 210 * k, '#a7cfc0', R);
    ctx.fillStyle = 'rgba(106,168,146,.3)';
    [[w, 0], [0, h]].forEach(([cx, cy]) => {
      for (let i = 0; i < 26; i++) {
        const a = R() * TAU, d = (120 + R() * 140) * k;
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, (1 + R() * 5) * k, 0, TAU); ctx.fill();
      }
    });
  },
  deco(ctx, L, R) {
    const { w, h, k } = L;
    const cols = ['#5c8577', '#6f9a8d', '#8fb3a6'];
    [2.2, 2.65, 1.85, 3.05].forEach((a, i) => roundSprig(ctx, w + 6 * k, -6 * k, (130 + R() * 40) * k, a, cols[i % 3], R, 11 * k));
    [-0.95, -0.5, -1.35, -0.15].forEach((a, i) => roundSprig(ctx, -6 * k, h + 6 * k, (140 + R() * 40) * k, a, cols[i % 3], R, 12 * k));
  },
  text: { ty: 0.4, sy: 0.58, title: script({ size: 72, color: '#2f5d50' }), sub: caps({ color: '#6a8f84' }) },
});

add({
  id: 'citrus', name: 'Citrus Summer', cats: ['summer'], caption: 'Hello Summer',
  bg(ctx, L) { vGrad(ctx, L, '#fff6dc', '#ffe5bf'); },
  deco(ctx, L) {
    const { w, h, k } = L;
    const pair = (x, y, r, rind, flesh, a) => {
      leaf(ctx, x, y, r * 1.9, r * 0.7, a, '#2f9e44', '#69db7c');
      leaf(ctx, x, y, r * 1.6, r * 0.6, a + 0.7, '#37b24d', '#8ce99a');
      citrus(ctx, x, y, r, rind, flesh);
    };
    pair(22 * k, 26 * k, 58 * k, '#f08c00', '#ffa94d', 0.6);
    pair(w - 18 * k, 80 * k, 42 * k, '#f2c230', '#ffe066', 2.3);
    pair(34 * k, h - 44 * k, 62 * k, '#74b816', '#a9e34b', -0.5);
    pair(w - 34 * k, h - 86 * k, 48 * k, '#f08c00', '#ffa94d', -2.4);
  },
  text: {
    ty: 0.4, sy: 0.57,
    title: { family: 'Shrikhand', weight: 400, size: 50, color: '#e8590c' },
    sub: caps({ weight: 600, color: '#2f7a5a' }),
  },
});

add({
  id: 'neon', name: 'Neon Nightclub', cats: ['party'], caption: 'Party Night',
  bg(ctx, L) {
    vGrad(ctx, L, '#12072b', '#2a0f4f');
    isoCubes(ctx, L.w, L.h, 26 * L.k, ['rgba(255,255,255,.045)', 'rgba(255,255,255,.015)', 'rgba(255,255,255,.075)']);
  },
  photo: { border: 3, borderColor: '#ff4fd8', glow: '#ff4fd8' },
  deco(ctx, L, R) {
    const { w, k, F } = L;
    const metal = ['#f5d06f', '#e3e3e3', '#ff7ad9', '#7af0ff', '#c9a0ff'];
    confetti(ctx, R, 70, metal, { x: 0, y: F.y, w, h: F.h }, 12 * k);
    confetti(ctx, R, 24, metal, { x: 0, y: 0, w, h: L.slots[0].y + 20 * k }, 10 * k);
    const r = Math.min(36 * k, F.h * 0.1), by = F.y + F.h * 0.3;
    balloon(ctx, 58 * k, by, r, '#d4af37', k, true);
    balloon(ctx, 108 * k, by - r * 0.9, r * 0.8, '#c0c0c0', k, true);
    balloon(ctx, w - 58 * k, by, r, '#c0c0c0', k, true);
    balloon(ctx, w - 108 * k, by - r * 0.9, r * 0.8, '#d4af37', k, true);
  },
  text: {
    ty: 0.42, sy: 0.6, maxW: 0.6,
    title: { family: 'Montserrat', weight: 700, size: 46, spacing: 4, upper: true, color: '#ffe3f8', glow: '#ff4fd8' },
    sub: caps({ weight: 600, spacing: 8, color: '#c6f8ff', glow: '#39d7ff' }),
  },
});

add({
  id: 'marble', name: 'Marble & Gold', cats: ['seasonal', 'party', 'wedding'], caption: 'Happy Holidays',
  bg(ctx, L, R) { marble(ctx, L, R); },
  photo: { border: 2.5, borderColor: '#c9a45c' },
  deco(ctx, L, R) {
    const { w, h, k } = L;
    glitter(ctx, R, 700, { x: 0, y: 0, w, h: 130 * k }, GOLDS, k, 2.4);
    glitter(ctx, R, 900, { x: 0, y: h, w, h: -170 * k }, GOLDS, k, 2.4);
  },
  text: {
    ty: 0.37, sy: 0.53,
    title: { family: 'Playfair Display', weight: 500, style: 'italic', size: 56, gold: true },
    sub: caps({ spacing: 8, color: '#8a7a5a' }),
  },
});

add({
  id: 'emerald', name: 'Emerald Prom', cats: ['party', 'celebration'], caption: 'A Night to Remember',
  bg(ctx, L) {
    const { w, h } = L;
    const g = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, h * 0.75);
    g.addColorStop(0, '#12664e'); g.addColorStop(1, '#052219');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  },
  photo: { border: 2, borderColor: '#d8b25a' },
  deco(ctx, L, R) {
    const { w, h, k, F } = L;
    const q = (p0, p1, p2) => (t) => [
      (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
      (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1],
    ];
    glitterAlong(ctx, R, 900, q([w * 0.5, 0], [w * 0.95, h * 0.01], [w, h * 0.13]), 14 * k, GOLDS, k);
    glitterAlong(ctx, R, 1100, q([0, h - F.h * 0.32], [w * 0.45, h - 8 * k], [w, h - F.h * 0.06]), 16 * k, GOLDS, k);
    ctx.fillStyle = '#f7e6ae';
    for (let i = 0; i < 9; i++) sparkle(ctx, R() * w, R() < 0.5 ? R() * 60 * k : h - R() * F.h * 0.25, (5 + R() * 9) * k);
  },
  text: {
    ty: 0.35, sy: 0.51,
    title: { family: 'Playfair Display', weight: 700, style: 'italic', size: 52, gold: true },
    sub: caps({ spacing: 8, color: '#e9d9a8' }),
  },
});

add({
  id: 'mint', name: 'Mint Blossom', cats: ['wedding'], caption: 'Just Married',
  bg(ctx, L, R) {
    const { w, h, k } = L;
    fill(ctx, L, '#fbfffd');
    watercolor(ctx, w, 0, 180 * k, '#8fd3bf', R);
    watercolor(ctx, 0, h, 220 * k, '#a9e0cf', R);
    watercolor(ctx, 0, 0, 90 * k, '#c9eee2', R);
  },
  deco(ctx, L, R) {
    const { w, h, k } = L;
    const o = { flowers: ['#ffffff', '#f4fbf8'], stroke: '#8cb8a7', center: '#f0cf7a', leaf: '#6fb39b', petals: 6 };
    floralCluster(ctx, w - 8 * k, 8 * k, k, R, { ...o, angle: Math.PI - 0.8 });
    floralCluster(ctx, 8 * k, h - 8 * k, k, R, { ...o, angle: -0.8, scale: 0.9 });
  },
  text: { ty: 0.4, sy: 0.58, title: script({ color: '#3c7a68' }), sub: caps({ color: '#6a9c8c' }) },
});

add({
  id: 'orchid', name: 'Orchid Garden', cats: ['wedding', 'summer'], caption: 'With Love',
  bg(ctx, L) {
    const { w, h, k, F } = L;
    fill(ctx, L, '#fffafb');
    bigLeaf(ctx, -20 * k, F.y + F.h * 0.75, 260 * k, -0.55, '#d5e8da', '#eaf4ed');
    bigLeaf(ctx, w + 20 * k, 30 * k, 240 * k, Math.PI + 0.55, '#d5e8da', '#eaf4ed');
    bigLeaf(ctx, w + 20 * k, h - 20 * k, 180 * k, Math.PI - 0.5, '#e1efe5', '#f1f8f3');
    bigLeaf(ctx, -20 * k, 10 * k, 160 * k, 0.6, '#e1efe5', '#f1f8f3');
  },
  deco(ctx, L) {
    const { w, h, k } = L, c = '#ef8fb5', lip = '#b0245e';
    bigLeaf(ctx, w - 10 * k, 30 * k, 110 * k, Math.PI + 0.35, '#7fae8c', '#b9d8c1');
    orchid(ctx, w - 42 * k, 52 * k, 50 * k, c, lip, 0.3);
    orchid(ctx, w - 100 * k, 28 * k, 34 * k, c, lip, -0.4);
    orchid(ctx, w - 22 * k, 120 * k, 30 * k, c, lip, 0.9);
    bigLeaf(ctx, 10 * k, h - 30 * k, 120 * k, -0.4, '#7fae8c', '#b9d8c1');
    orchid(ctx, 46 * k, h - 72 * k, 54 * k, c, lip, -0.2);
    orchid(ctx, 112 * k, h - 40 * k, 36 * k, c, lip, 0.5);
    orchid(ctx, 26 * k, h - 146 * k, 30 * k, c, lip, -0.8);
  },
  text: { ty: 0.4, sy: 0.57, title: serifTitle({ color: '#6b2d48' }), sub: caps({ color: '#a0708a' }) },
});

add({
  id: 'christmas', name: 'Merry & Bright', cats: ['seasonal'], caption: 'Merry Christmas',
  bg(ctx, L, R) {
    vGrad(ctx, L, '#9e1f24', '#6a1115');
    ctx.strokeStyle = '#ffffff';
    for (let i = 0; i < 46; i++) {
      ctx.globalAlpha = 0.08 + R() * 0.2;
      snowflake(ctx, R() * L.w, R() * L.h, (6 + R() * 12) * L.k, 1.3 * L.k);
    }
    ctx.globalAlpha = 1;
  },
  photo: { border: 7, borderColor: '#fbf6ee' },
  deco(ctx, L, R) {
    const { w, h, k, F } = L;
    const corner = (x, y, base) => {
      [0, 0.45, -0.45].forEach((d) => {
        pine(ctx, x, y, 120 * k, base + d, '#1e5a3a', R, k);
        pine(ctx, x, y, 95 * k, base + d + 0.2, '#2f7a4f', R, k);
      });
      berries(ctx, x + Math.cos(base) * 20 * k, y + Math.sin(base) * 20 * k, k);
    };
    corner(0, 0, 0.78);
    corner(w, 0, Math.PI - 0.78);
    corner(0, h, -0.78);
    corner(w, h, -Math.PI + 0.78);
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 6; i++) snowflake(ctx, w * (0.2 + R() * 0.6), F.y + F.h * (0.1 + R() * 0.15), (5 + R() * 6) * k, 1.2 * k);
  },
  text: {
    ty: 0.45, sy: 0.63,
    title: script({ color: '#fffaf0' }),
    sub: caps({ weight: 600, color: '#f2d49b' }),
  },
});

add({
  id: 'birthday', name: 'Birthday Balloons', cats: ['celebration', 'party'], caption: 'Happy Birthday',
  bg(ctx, L, R) {
    fill(ctx, L, '#fdebf1');
    confetti(ctx, R, 80 * L.k, ['#f7a8c4', '#a5d8ff', '#ffe066', '#d0bfff'], { x: 0, y: 0, w: L.w, h: L.h }, 9 * L.k);
  },
  photo: { radius: 14, border: 6, borderColor: '#ffffff' },
  deco(ctx, L, R) {
    const { w, k, F } = L;
    const cols = ['#f783ac', '#74c0fc', '#ffd43b', '#b197fc'];
    const r = Math.min(34 * k, F.h * 0.1), by = F.y + F.h * 0.3;
    balloon(ctx, 50 * k, by + r * 0.3, r, cols[0], k);
    balloon(ctx, 98 * k, by - r * 0.8, r * 0.85, cols[1], k);
    balloon(ctx, w - 50 * k, by + r * 0.3, r, cols[2], k);
    balloon(ctx, w - 98 * k, by - r * 0.8, r * 0.85, cols[3], k);
    confetti(ctx, R, 30, cols, { x: 0, y: F.y, w, h: F.h }, 10 * k);
  },
  text: {
    ty: 0.44, sy: 0.6, maxW: 0.6,
    title: { family: 'Shrikhand', weight: 400, size: 46, color: '#d6336c' },
    sub: caps({ weight: 600, color: '#8a5a70' }),
  },
});

add({
  id: 'retro', name: 'Retro Groove', cats: ['party'], caption: 'Stay Groovy',
  bg(ctx, L) { fill(ctx, L, '#f6ead4'); },
  photo: { radius: 22, border: 5, borderColor: '#7a4419' },
  deco(ctx, L, R) {
    const { w, h, k, F } = L;
    const r0 = Math.min(230 * k, F.h * 0.45), lw = r0 * 0.12;
    ['#7a4419', '#d9480f', '#f08c00', '#fab005'].forEach((c, i) => {
      ctx.strokeStyle = c; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.arc(w / 2, h + lw, r0 - i * lw, Math.PI, TAU); ctx.stroke();
    });
    ctx.fillStyle = '#f08c00';
    [[34, 30], [w / k - 34, 30]].forEach(([x, y]) => sparkle(ctx, x * k, y * k, 12 * k));
    for (let i = 0; i < 4; i++) sparkle(ctx, w * (0.1 + R() * 0.8), F.y + F.h * (0.05 + R() * 0.08), (4 + R() * 5) * k);
  },
  text: {
    ty: 0.26, sy: 0.42,
    title: { family: 'Shrikhand', weight: 400, size: 48, color: '#7a4419' },
    sub: caps({ weight: 700, color: '#d9480f' }),
  },
});

add({
  id: 'hearts', name: 'Love Letter', cats: ['wedding', 'celebration'], caption: 'Love You More',
  bg(ctx, L, R) {
    fill(ctx, L, '#fbe9e6');
    ctx.fillStyle = 'rgba(229,152,155,.2)';
    for (let i = 0; i < 60; i++) { heart(ctx, R() * L.w, R() * L.h, (8 + R() * 16) * L.k); ctx.fill(); }
  },
  photo: { radius: 10, border: 7, borderColor: '#ffffff' },
  deco(ctx, L, R) {
    const { w, h, k } = L;
    const cols = ['#c9184a', '#ff758f', '#ffb3c1'];
    const cluster = (cx, cy) => {
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = cols[i % 3];
        heart(ctx, cx + (R() - 0.5) * 90 * k, cy + (R() - 0.5) * 70 * k, (14 + R() * 26) * k);
        ctx.fill();
      }
    };
    cluster(34 * k, 30 * k);
    cluster(w - 40 * k, h - 70 * k);
  },
  text: { ty: 0.4, sy: 0.58, title: script({ size: 78, color: '#b23a48' }), sub: caps({ color: '#b56576' }) },
});

add({
  id: 'starry', name: 'Starry Night', cats: ['party', 'celebration'], caption: 'Under the Stars',
  bg(ctx, L, R) {
    vGrad(ctx, L, '#0a1030', '#1f2c66');
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 280 * L.k; i++) {
      ctx.globalAlpha = 0.2 + R() * 0.8;
      ctx.beginPath(); ctx.arc(R() * L.w, R() * L.h, (0.4 + R() * R() * 1.8) * L.k, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
  photo: { radius: 6, border: 2, borderColor: 'rgba(244,231,197,.65)' },
  deco(ctx, L, R) {
    const { w, h, k, F } = L;
    ctx.fillStyle = '#f4e7c5';
    for (let i = 0; i < 12; i++) {
      const side = R() < 0.5;
      sparkle(ctx, side ? R() * 36 * k : w - R() * 36 * k, R() * h, (4 + R() * 8) * k);
    }
    const mr = Math.min(24 * k, F.h * 0.07), mx = w / 2, my = F.y + F.h * 0.22;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.arc(mx + mr * 0.45, my - mr * 0.25, mr * 0.9, 0, TAU);
    ctx.clip('evenodd');
    ctx.shadowColor = 'rgba(244,231,197,.6)'; ctx.shadowBlur = 18 * k;
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
    ctx.restore();
  },
  text: { ty: 0.5, sy: 0.66, title: serifTitle({ color: '#f4e7c5' }), sub: caps({ spacing: 7, color: '#a9b4e0' }) },
});

add({
  id: 'polaroid', name: 'Instant Film', cats: ['classic'], caption: 'Good Times',
  bg(ctx, L, R) {
    fill(ctx, L, '#ebe6df');
    ctx.fillStyle = 'rgba(90,80,70,.05)';
    for (let i = 0; i < 1400 * L.k; i++) ctx.fillRect(R() * L.w, R() * L.h, L.k, L.k);
  },
  photo: { matte: { pad: 14, bottom: 34, color: '#fffefb' } },
  deco(ctx, L, R) {
    const k = L.k, tapes = ['rgba(241,196,120,.62)', 'rgba(160,196,220,.62)', 'rgba(232,160,170,.6)'];
    L.slots.forEach((s, i) => {
      ctx.save();
      ctx.translate(s.x + s.w / 2 + (R() - 0.5) * 40 * k, s.y + 2 * k);
      ctx.rotate((R() - 0.5) * 0.18);
      ctx.fillStyle = tapes[i % tapes.length];
      ctx.fillRect(-45 * k, -13 * k, 90 * k, 26 * k);
      ctx.restore();
    });
  },
  text: {
    ty: 0.42, sy: 0.6,
    title: { family: 'Caveat', weight: 600, size: 66, color: '#3a3531' },
    sub: { family: 'Caveat', weight: 600, size: 30, color: '#7a716a' },
  },
});

add({
  id: 'halloween', name: 'Spooky Night', cats: ['seasonal', 'party'], caption: 'Happy Halloween',
  bg(ctx, L, R) {
    vGrad(ctx, L, '#140a24', '#3a1450');
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 90 * L.k; i++) {
      ctx.globalAlpha = 0.15 + R() * 0.6;
      ctx.beginPath(); ctx.arc(R() * L.w, R() * L.h, (0.4 + R() * 1.2) * L.k, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
  photo: { border: 3, borderColor: '#ff8a1f', glow: 'rgba(255,138,31,.5)' },
  deco(ctx, L) {
    const { w, h, k, F } = L;
    web(ctx, 0, 0, 150 * k, k, 'rgba(235,225,255,.6)');
    web(ctx, w, 0, 100 * k, k, 'rgba(235,225,255,.45)', -1, 1);
    const mr = Math.min(34 * k, F.h * 0.08), mx = w - 72 * k, my = F.y + F.h * 0.16;
    ctx.save();
    ctx.shadowColor = 'rgba(255,236,180,.7)'; ctx.shadowBlur = 24 * k;
    ctx.fillStyle = '#f8e9bd'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#0b0612';
    bat(ctx, mx - mr * 0.5, my + mr * 0.15, 30 * k, -0.2);
    bat(ctx, 72 * k, F.y + F.h * 0.13, 26 * k, 0.25);
    bat(ctx, 140 * k, F.y + F.h * 0.06, 17 * k, -0.15);
    const pr = Math.min(56 * k, F.h * 0.12);
    pumpkin(ctx, 62 * k, h - pr * 0.95, pr);
    pumpkin(ctx, 62 * k + pr * 1.3, h - pr * 0.62, pr * 0.62);
    pumpkin(ctx, w - 60 * k, h - pr * 0.85, pr * 0.85);
  },
  text: {
    ty: 0.44, sy: 0.62, maxW: 0.7,
    title: { family: 'Shrikhand', weight: 400, size: 46, color: '#ff8a1f', glow: 'rgba(255,120,20,.45)' },
    sub: caps({ weight: 600, spacing: 7, color: '#d9c7f0' }),
  },
});

add({
  id: 'newyear', name: "New Year's Eve", cats: ['seasonal', 'party'], caption: 'Happy New Year',
  bg(ctx, L, R) {
    vGrad(ctx, L, '#06070d', '#141a30');
    // Behind the photos only, so the caption area stays clean.
    for (let i = 0; i < 8; i++) firework(ctx, R() * L.w, R() * L.F.y, (50 + R() * 50) * L.k, 'rgba(241,217,139,.35)', R, L.k);
  },
  photo: { border: 2, borderColor: '#d4af37' },
  deco(ctx, L, R) {
    const { w, h, k, F } = L;
    const r = Math.min(70 * k, F.h * 0.16);
    firework(ctx, w * 0.2, F.y + F.h * 0.2, r, '#f1d98b', R, k);
    firework(ctx, w * 0.82, F.y + F.h * 0.15, r * 0.75, '#fff2c4', R, k);
    firework(ctx, w * 0.62, F.y + F.h * 0.08, r * 0.45, '#d4af37', R, k);
    glitter(ctx, R, 700, { x: 0, y: h, w, h: -Math.min(150 * k, F.h * 0.2) }, GOLDS, k, 2.4);
  },
  text: {
    ty: 0.5, sy: 0.66,
    title: { family: 'Montserrat', weight: 300, size: 42, spacing: 8, upper: true, gold: true },
    sub: caps({ spacing: 8, color: '#d9c38c' }),
  },
});

add({
  id: 'babyshower', name: 'Little Star', cats: ['celebration'], caption: 'Oh Baby',
  bg(ctx, L, R) {
    vGrad(ctx, L, '#e8f2fb', '#fbe9f0');
    for (let i = 0; i < 9; i++) cloud(ctx, R() * L.w, R() * L.h, (50 + R() * 50) * L.k, 'rgba(255,255,255,.55)');
  },
  photo: { radius: 18, border: 6, borderColor: '#ffffff' },
  deco(ctx, L, R) {
    const { w, h, k, F } = L;
    cloud(ctx, 58 * k, h - 40 * k, 70 * k, '#ffffff');
    cloud(ctx, w - 50 * k, h - 64 * k, 56 * k, '#ffffff');
    ctx.fillStyle = '#f2c36b';
    for (let i = 0; i < 9; i++) sparkle(ctx, w * (0.08 + R() * 0.84), F.y + F.h * (0.03 + R() * 0.09), (5 + R() * 7) * k);
    [[30, 30], [w / k - 30, 30]].forEach(([x, y]) => sparkle(ctx, x * k, y * k, 13 * k));
  },
  text: { ty: 0.42, sy: 0.6, title: script({ color: '#5b7fa6' }), sub: caps({ weight: 600, color: '#c28aa0' }) },
});

add({
  id: 'autumn', name: 'Autumn Harvest', cats: ['seasonal'], caption: 'Hello Autumn',
  bg(ctx, L, R) {
    const { w, h, k } = L;
    fill(ctx, L, '#f9f1e4');
    watercolor(ctx, 0, 0, 170 * k, '#e8b07a', R);
    watercolor(ctx, w, h, 200 * k, '#e3a066', R);
  },
  photo: { border: 5, borderColor: '#fffaf2' },
  deco(ctx, L, R) {
    const { w, h, k, F } = L;
    const cols = ['#c2410c', '#d97706', '#b45309', '#9a3412', '#ca8a04'];
    const corner = (cx, cy, base) => {
      for (let i = 0; i < 9; i++) {
        const a = base + (R() - 0.5) * 1.3, d = (10 + R() * 70) * k;
        mapleLeaf(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d, (24 + R() * 18) * k, R() * TAU, cols[i % cols.length]);
      }
    };
    corner(0, 0, 0.78);
    corner(w, h, -Math.PI + 0.78);
    for (let i = 0; i < 6; i++) {
      mapleLeaf(ctx, w * (0.1 + R() * 0.8), F.y + F.h * (0.04 + R() * 0.14), (9 + R() * 7) * k, R() * TAU, cols[(R() * cols.length) | 0]);
    }
  },
  text: {
    ty: 0.44, sy: 0.62,
    title: { family: 'Playfair Display', weight: 700, style: 'italic', size: 54, color: '#8a3412' },
    sub: caps({ weight: 600, color: '#b45f1e' }),
  },
});

add({
  id: 'seaside', name: 'Seaside', cats: ['summer'], caption: 'Beach Days',
  bg(ctx, L) { vGrad(ctx, L, '#f2fafb', '#cdebf0'); },
  photo: { radius: 4, border: 6, borderColor: '#ffffff' },
  deco(ctx, L) {
    const { w, h, k, F } = L;
    const top = h - Math.min(F.h * 0.3, 150 * k);
    ['#9fdbe5', '#5fbfd1', '#2b9bb3', '#16758c'].forEach((c, i) => {
      const y0 = top + (i * (h - top)) / 4.2, amp = 7 * k, len = 130 * k;
      ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, y0);
      for (let x = 0; x <= w + 4 * k; x += 4 * k) ctx.lineTo(x, y0 + Math.sin((x / len) * TAU + i * 1.3) * amp);
      ctx.lineTo(w, h); ctx.closePath();
      ctx.fillStyle = c; ctx.fill();
    });
    const sr = Math.min(26 * k, F.h * 0.07), sx = w - 70 * k, sy = F.y + F.h * 0.14;
    ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2b5f6e'; ctx.lineWidth = 2 * k; ctx.lineCap = 'round';
    [[sx - sr * 2.6, sy - sr * 0.5, 1], [sx - sr * 1.7, sy - sr * 1.1, 0.7], [70 * k, F.y + F.h * 0.1, 0.9]].forEach(([x, y, s]) => {
      const u = 12 * k * s;
      ctx.beginPath();
      ctx.moveTo(x - u, y); ctx.quadraticCurveTo(x - u / 2, y - u * 0.6, x, y);
      ctx.quadraticCurveTo(x + u / 2, y - u * 0.6, x + u, y);
      ctx.stroke();
    });
  },
  text: {
    ty: 0.38, sy: 0.54,
    title: { family: 'Playfair Display', weight: 700, style: 'italic', size: 56, color: '#0f4c5c' },
    sub: caps({ weight: 600, color: '#2a8a9e' }),
  },
});

add({
  id: 'boho', name: 'Boho Terracotta', cats: ['wedding', 'celebration'], caption: 'Love & Adventure',
  bg(ctx, L, R) {
    const { w, h, k } = L;
    fill(ctx, L, '#f6ede3');
    watercolor(ctx, w, 0, 150 * k, '#e7c9ab', R, 6, 0.08);
    watercolor(ctx, 0, h, 170 * k, '#e7c9ab', R, 6, 0.08);
  },
  photo: { radius: 8, border: 5, borderColor: '#fffaf4' },
  deco(ctx, L, R) {
    const { w, h, k } = L;
    [2.0, 2.35, 2.7].forEach((a, i) => pampas(ctx, w + 5 * k, -5 * k, (170 + i * 20) * k, a, i % 2 ? '#d4b48c' : '#e6d3b3', R, k));
    leaf(ctx, w + 5 * k, -5 * k, 120 * k, 14 * k, 2.15, '#a08a5c');
    [-0.6, -0.95, -1.25].forEach((a, i) => pampas(ctx, -5 * k, h + 5 * k, (150 + i * 20) * k, a, i % 2 ? '#e6d3b3' : '#d4b48c', R, k));
    [[74, '#c46a45'], [56, '#e09a6e'], [38, '#f0c9a4']].forEach(([r, c]) => {
      ctx.beginPath(); ctx.arc(w - 70 * k, h, r * k, Math.PI, TAU); ctx.closePath();
      ctx.fillStyle = c; ctx.fill();
    });
  },
  text: { ty: 0.42, sy: 0.6, title: serifTitle({ color: '#8a4b2f' }), sub: caps({ color: '#b07a5a' }) },
});

add({
  id: 'blossom', name: 'Cherry Blossom', cats: ['seasonal', 'wedding'], caption: 'In Full Bloom',
  bg(ctx, L, R) {
    const { w, h, k } = L;
    fill(ctx, L, '#fff8f8');
    watercolor(ctx, 0, 0, 170 * k, '#f6c6d3', R);
    watercolor(ctx, w, h, 190 * k, '#f3b8c8', R);
  },
  photo: { radius: 6, border: 5, borderColor: '#ffffff' },
  deco(ctx, L, R) {
    const { w, h, k, F } = L, petal = '#f6b3c6', center = '#d6476f';
    blossomBranch(ctx, -5 * k, 12 * k, 190 * k, 0.12, R, k, petal, center);
    blossomBranch(ctx, w + 5 * k, h - 14 * k, 180 * k, Math.PI + 0.18, R, k, petal, center);
    ctx.fillStyle = petal;
    for (let i = 0; i < 12; i++) {
      ctx.globalAlpha = 0.5 + R() * 0.5;
      ctx.beginPath();
      ctx.ellipse(w * (0.06 + R() * 0.88), F.y + F.h * (0.04 + R() * 0.2), (4 + R() * 3) * k, (2.5 + R() * 2) * k, R() * TAU, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
  text: { ty: 0.42, sy: 0.6, title: script({ color: '#b8476b' }), sub: caps({ color: '#c27a91' }) },
});

add({
  id: 'blank', name: 'Blank Canvas', cats: ['classic'], caption: '',
  bg(ctx, L) { fill(ctx, L, '#ffffff'); },
  text: { title: serifTitle({ color: '#1c1917' }), sub: caps({ color: '#7a7067' }) },
});

const TEMPLATES = {};
T.forEach((t) => (TEMPLATES[t.id] = t));

const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'wedding', name: 'Wedding' },
  { id: 'party', name: 'Party' },
  { id: 'celebration', name: 'Celebrations' },
  { id: 'seasonal', name: 'Seasonal' },
  { id: 'summer', name: 'Summer' },
  { id: 'classic', name: 'Classic' },
];

/* --------------------------------------------------------------- render */

function fontString(ts, size) {
  return `${ts.style || 'normal'} ${ts.weight || 400} ${size}px "${ts.family}", serif`;
}

// Every font string the templates use, so the app can preload them before drawing.
const FONT_LOADS = Array.from(new Set(T.flatMap((t) =>
  t.text ? [t.text.title, t.text.sub].map((ts) => fontString(ts, 40)) : []).concat(['600 40px "Montserrat"'])));

function spacedWidth(ctx, text, spacing) {
  let wsum = 0;
  for (const ch of text) wsum += ctx.measureText(ch).width;
  return wsum + spacing * Math.max(0, [...text].length - 1);
}

function drawLine(ctx, L, ts, text, y, maxW) {
  const k = L.k, spacing = (ts.spacing || 0) * k;
  if (ts.upper) text = text.toUpperCase();
  let size = ts.size * k;
  ctx.font = fontString(ts, size);
  let width = spacing ? spacedWidth(ctx, text, spacing) : ctx.measureText(text).width;
  while (width > maxW && size > 8) {
    size *= 0.94;
    ctx.font = fontString(ts, size);
    width = spacing ? spacedWidth(ctx, text, spacing * (size / (ts.size * k))) : ctx.measureText(text).width;
  }
  const sp = spacing * (size / (ts.size * k));
  const cx = L.w / 2;
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ts.gold ? gold(ctx, cx - width / 2, y - size / 2, cx + width / 2, y + size / 2) : ts.color;
  const paint = () => {
    if (!sp) { ctx.textAlign = 'center'; ctx.fillText(text, cx, y); return; }
    ctx.textAlign = 'left';
    let x = cx - width / 2;
    for (const ch of text) { ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + sp; }
  };
  if (ts.glow) {
    ctx.shadowColor = ts.glow; ctx.shadowBlur = 16 * k; paint(); ctx.shadowBlur = 6 * k; paint();
  } else paint();
  ctx.restore();
}

function drawCaption(ctx, L, tpl, caption, sub) {
  const t = tpl.text, F = L.F, maxW = L.w * (t.maxW || 0.84);
  if (caption) drawLine(ctx, L, t.title, caption, F.y + F.h * (t.ty ?? 0.42), maxW);
  if (sub) drawLine(ctx, L, t.sub, sub, F.y + F.h * (t.sy ?? 0.6), maxW);
}

function drawPhotos(ctx, L, tpl, photos) {
  const ps = tpl.photo || {}, k = L.k;
  L.slots.forEach((s, i) => {
    let { x, y, w, h } = s;
    const img = photos[i];
    if (ps.matte) {
      const m = ps.matte;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 14 * k; ctx.shadowOffsetY = 5 * k;
      ctx.fillStyle = m.color; ctx.fillRect(x, y, w, h);
      ctx.restore();
      x += m.pad * k; y += m.pad * k; w -= 2 * m.pad * k; h -= (m.pad + m.bottom) * k;
    }
    const r = (ps.radius || 0) * k;
    if (ps.border) {
      const b = ps.border * k;
      ctx.save();
      if (ps.glow) { ctx.shadowColor = ps.glow; ctx.shadowBlur = 18 * k; }
      roundRect(ctx, x - b / 2, y - b / 2, w + b, h + b, r + b / 2);
      ctx.lineWidth = b; ctx.strokeStyle = ps.borderColor; ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    roundRect(ctx, x, y, w, h, r);
    ctx.clip();
    if (img) cover(ctx, img, x, y, w, h);
    else {
      ctx.fillStyle = '#d9d3ca'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#a79d90';
      ctx.font = `500 ${Math.min(w, h) * 0.2}px "Cormorant Garamond", serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), x + w / 2, y + h / 2);
    }
    ctx.restore();
  });
}

/**
 * Draw a finished photo strip into `canvas`.
 * opts: { layout, template, photos[], caption, sub, showCaption, overlay, scale }
 */
function render(canvas, opts) {
  const Ld = LAYOUTS[opts.layout] || LAYOUTS.strip3;
  const s = opts.scale || 1;
  canvas.width = Math.round(Ld.w * s);
  canvas.height = Math.round(Ld.h * s);
  const ctx = canvas.getContext('2d');

  if (Ld.composite) {
    const base = LAYOUTS[Ld.composite];
    const tmp = document.createElement('canvas');
    render(tmp, { ...opts, layout: Ld.composite, overlay: null });
    ctx.drawImage(tmp, 0, 0, base.w * s, base.h * s);
    ctx.drawImage(tmp, base.w * s, 0, base.w * s, base.h * s);
  } else {
    ctx.setTransform(s, 0, 0, s, 0, 0);
    const L = { ...Ld, k: Ld.w / 600, m: Ld.slots[0].x };
    const tpl = TEMPLATES[opts.template] || T[0];
    const seed = hash(tpl.id);
    ctx.save(); tpl.bg(ctx, L, rng(seed)); ctx.restore();
    drawPhotos(ctx, L, tpl, opts.photos || []);
    if (tpl.deco) { ctx.save(); tpl.deco(ctx, L, rng(seed + 7)); ctx.restore(); }
    if (opts.showCaption !== false && tpl.text) drawCaption(ctx, L, tpl, opts.caption, opts.sub);
  }
  if (opts.overlay) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(opts.overlay, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

/* --------------------------------------------------------- placeholders */

// Soft abstract "portrait" frames for previews: gradients, bokeh and silhouettes, no real people.
function makePlaceholders() {
  const palettes = [
    ['#f3cdb8', '#d99a8a', '#6b3f35'],
    ['#cddbea', '#8fa9c8', '#2f3f5a'],
    ['#ece0c6', '#c9ae82', '#5a4630'],
    ['#d7e6d3', '#97b88f', '#34503a'],
  ];
  return palettes.map((p, i) => {
    const c = document.createElement('canvas');
    c.width = 800; c.height = 600;
    const ctx = c.getContext('2d'), R = rng(99 + i * 13);
    const g = ctx.createLinearGradient(0, 0, 800, 600);
    g.addColorStop(0, p[0]); g.addColorStop(1, p[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 800, 600);
    for (let j = 0; j < 14; j++) {
      ctx.fillStyle = `rgba(255,255,255,${0.08 + R() * 0.18})`;
      ctx.beginPath(); ctx.arc(R() * 800, R() * 320, 20 + R() * 60, 0, TAU); ctx.fill();
    }
    const people = i % 2 ? [[330, 1], [480, 0.92]] : [[400, 1]];
    people.forEach(([px, sc], j) => {
      const off = (R() - 0.5) * 60;
      ctx.fillStyle = rgba(p[2], 0.42 + j * 0.06);
      ctx.beginPath(); ctx.arc(px + off, 250 * sc + 40 * (1 - sc) * 3, 78 * sc, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(px + off, 590, 190 * sc, 190 * sc, 0, Math.PI, TAU); ctx.fill();
    });
    const v = ctx.createRadialGradient(400, 300, 200, 400, 300, 520);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.18)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, 800, 600);
    return c;
  });
}


export { LAYOUTS, TEMPLATES, T as TEMPLATE_LIST, CATEGORIES, FONT_LOADS, render, makePlaceholders };
