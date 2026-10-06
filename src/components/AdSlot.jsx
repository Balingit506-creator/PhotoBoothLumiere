import { useEffect } from 'react';
import { ADSTERRA_NATIVE } from '../ads.config.js';
import { isAdFree } from '../lib/adfree.js';

/** One Adsterra Native Banner. Its script fills the container div once it loads. */
export default function AdSlot() {
  const { container } = ADSTERRA_NATIVE;
  const src = isAdFree() ? '' : ADSTERRA_NATIVE.src; // tippers turned ads off

  useEffect(() => {
    // Load once; StrictMode runs effects twice in development.
    if (!src || document.querySelector(`script[src="${src}"]`)) return;
    const s = document.createElement('script');
    s.async = true;
    s.dataset.cfasync = 'false';
    s.src = src;
    document.body.appendChild(s);
  }, [src]);

  if (!src) return null;
  return (
    <aside className="section ad-slot" aria-label="Advertisement">
      <p className="ad-label">Advertisement · <a href="#support">Tip to remove ads</a></p>
      <div id={container}></div>
    </aside>
  );
}
