/*
 * Film looks. Each look is a CSS filter string: the live camera preview uses it as-is,
 * and captured photos get the same look through canvas `filter` or, where that isn't
 * supported (older Safari), an exact pixel implementation of the same CSS functions.
 */

const LOOKS = [
  { id: 'none', name: 'Natural', css: 'none' },
  { id: 'golden', name: 'Golden', css: 'sepia(.18) saturate(1.25) brightness(1.03)' },
  { id: 'blush', name: 'Blush', css: 'sepia(.15) saturate(1.2) hue-rotate(-12deg) brightness(1.04)' },
  { id: 'cool', name: 'Cool', css: 'saturate(.9) hue-rotate(8deg) brightness(1.04)' },
  { id: 'vintage', name: 'Vintage', css: 'sepia(.4) contrast(.9) brightness(1.08) saturate(.85)' },
  { id: 'sepia', name: 'Sepia', css: 'sepia(.85) contrast(1.02)' },
  { id: 'mono', name: 'Mono', css: 'grayscale(1) contrast(1.08)' },
  { id: 'noir', name: 'Noir', css: 'grayscale(1) contrast(1.45) brightness(.95)' },
];

const nativeFilter = (() => {
  try {
    const c = document.createElement('canvas').getContext('2d');
    if (!('filter' in c)) return false;
    c.filter = 'grayscale(1)';
    return c.filter === 'grayscale(1)';
  } catch (e) { return false; }
})();

// Colour matrices from the Filter Effects spec (3×3 plus offset per channel).
function matrixFor(fn, v) {
  const a = 1 - v;
  switch (fn) {
    case 'grayscale': return [
      0.2126 + 0.7874 * a, 0.7152 - 0.7152 * a, 0.0722 - 0.0722 * a, 0,
      0.2126 - 0.2126 * a, 0.7152 + 0.2848 * a, 0.0722 - 0.0722 * a, 0,
      0.2126 - 0.2126 * a, 0.7152 - 0.7152 * a, 0.0722 + 0.9278 * a, 0];
    case 'sepia': return [
      0.393 + 0.607 * a, 0.769 - 0.769 * a, 0.189 - 0.189 * a, 0,
      0.349 - 0.349 * a, 0.686 + 0.314 * a, 0.168 - 0.168 * a, 0,
      0.272 - 0.272 * a, 0.534 - 0.534 * a, 0.131 + 0.869 * a, 0];
    case 'saturate': return [
      0.213 + 0.787 * v, 0.715 - 0.715 * v, 0.072 - 0.072 * v, 0,
      0.213 - 0.213 * v, 0.715 + 0.285 * v, 0.072 - 0.072 * v, 0,
      0.213 - 0.213 * v, 0.715 - 0.715 * v, 0.072 + 0.928 * v, 0];
    case 'hue-rotate': {
      const r = (v * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
      return [
        0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928, 0,
        0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283, 0,
        0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072, 0];
    }
    case 'brightness': return [v, 0, 0, 0, 0, v, 0, 0, 0, 0, v, 0];
    case 'contrast': { const o = (0.5 - 0.5 * v) * 255; return [v, 0, 0, o, 0, v, 0, o, 0, 0, v, o]; }
    default: return null;
  }
}

function parse(css) {
  const ops = [];
  css.replace(/([a-z-]+)\(([-\d.]+)(deg)?\)/g, (_, fn, val) => {
    const m = matrixFor(fn, parseFloat(val));
    if (m) ops.push(m);
  });
  return ops;
}

function applyPixels(ctx, w, h, css) {
  const ops = parse(css);
  if (!ops.length) return;
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  const clamp = (x) => (x < 0 ? 0 : x > 255 ? 255 : x);
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    for (const m of ops) {
      const nr = clamp(m[0] * r + m[1] * g + m[2] * b + m[3]);
      const ng = clamp(m[4] * r + m[5] * g + m[6] * b + m[7]);
      const nb = clamp(m[8] * r + m[9] * g + m[10] * b + m[11]);
      r = nr; g = ng; b = nb;
    }
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  ctx.putImageData(img, 0, 0);
}

/** Returns a new canvas with `look` applied to `src`. */
function apply(src, lookId) {
  const look = LOOKS.find((l) => l.id === lookId) || LOOKS[0];
  if (look.css === 'none') return src;
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const ctx = c.getContext('2d');
  if (nativeFilter) {
    ctx.filter = look.css;
    ctx.drawImage(src, 0, 0);
  } else {
    ctx.drawImage(src, 0, 0);
    applyPixels(ctx, c.width, c.height, look.css);
  }
  return c;
}


export { LOOKS, apply };
