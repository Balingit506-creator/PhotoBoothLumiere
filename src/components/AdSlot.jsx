import { useEffect } from 'react';
import { ADSTERRA_NATIVE } from '../ads.config.js';

/** One Adsterra Native Banner. Its script fills the container div once it loads. */
export default function AdSlot() {
  const { src, container } = ADSTERRA_NATIVE;

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
      <p className="ad-label">Advertisement</p>
      <div id={container}></div>
    </aside>
  );
}
