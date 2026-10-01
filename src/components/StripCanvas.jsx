import { useEffect, useRef } from 'react';
import { render } from '../lib/booth.js';
import { useArt } from '../context.js';

// Shallow compare, treating arrays (photos) element by element.
function same(a, b) {
  if (!a || !b) return false;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((k) => {
    const x = a[k], y = b[k];
    if (Array.isArray(x) && Array.isArray(y)) return x.length === y.length && x.every((v, i) => v === y[i]);
    return x === y;
  });
}

/** A canvas drawn by the strip renderer. Redraws only when `opts` actually change. */
export default function StripCanvas({ opts, ...props }) {
  const ref = useRef(null);
  const last = useRef(null);
  const { fontsVersion } = useArt();

  useEffect(() => {
    const key = { ...opts, fontsVersion };
    if (same(last.current, key)) return;
    last.current = key;
    render(ref.current, opts);
  });

  return <canvas ref={ref} {...props} />;
}
