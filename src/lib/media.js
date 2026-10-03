/* Lumière Booth — image, sound and timing helpers shared by the booth. */
import * as Looks from './looks.js';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

export function lookOf(p, look) {
  if (!p) return null;
  if (!p.cache[look]) p.cache[look] = Looks.apply(p.src, look);
  return p.cache[look];
}

export function loadImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not read that image.')); };
    img.src = url;
  });
}

export function toCanvas(source, sw, sh, mirror) {
  const max = 1600, s = Math.min(1, max / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.round(sw * s); c.height = Math.round(sh * s);
  const ctx = c.getContext('2d');
  if (mirror) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(source, 0, 0, c.width, c.height);
  return c;
}

function drawCover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height), sw = w / s, sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

/** Two shots joined into one photo, each filling half; `aspect` is the photo slot's width / height. */
export function sideBySide(left, right, aspect) {
  const h = 1200, w = Math.round(h * aspect), half = Math.round(w / 2);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  drawCover(ctx, left, 0, 0, half, h);
  drawCover(ctx, right, half, 0, w - half, h);
  return c;
}

/** A capture as JPEG bytes, small enough to send to a friend quickly. */
export function canvasToBuffer(canvas, max = 1280) {
  const s = Math.min(1, max / Math.max(canvas.width, canvas.height));
  const c = document.createElement('canvas');
  c.width = Math.round(canvas.width * s); c.height = Math.round(canvas.height * s);
  c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => b.arrayBuffer().then(res), 'image/jpeg', 0.9));
}

export async function bufferToCanvas(buf) {
  const bmp = await createImageBitmap(new Blob([buf], { type: 'image/jpeg' }));
  const c = document.createElement('canvas');
  c.width = bmp.width; c.height = bmp.height;
  c.getContext('2d').drawImage(bmp, 0, 0);
  bmp.close();
  return c;
}

/** Restarts a one-shot CSS animation class on an element. */
export function replay(el, cls) {
  if (!el) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
}

let actx;
function audio() {
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); return actx; } catch (e) { return null; }
}
export function beep(freq = 880, dur = 0.09) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.07, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + dur);
}
export function shutterSound() {
  const a = audio(); if (!a) return;
  const len = Math.floor(a.sampleRate * 0.12), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = a.createBufferSource(), g = a.createGain();
  src.buffer = buf; g.gain.value = 0.35;
  src.connect(g).connect(a.destination); src.start();
}

export function fileName(template) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `lumiere-booth-${template}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.png`;
}
