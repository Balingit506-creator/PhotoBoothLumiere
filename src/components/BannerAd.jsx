import { useEffect, useState } from 'react';
import { ADSTERRA_BANNER } from '../ads.config.js';
import { isAdFree } from '../lib/adfree.js';

const ready = (u) => !!(u && u.key && u.src);
const pick = () => {
  const { desktop, mobile } = ADSTERRA_BANNER;
  const wide = window.innerWidth >= 760;
  return (wide ? [desktop, mobile] : [mobile, desktop]).find((u) => ready(u) && u.width <= window.innerWidth - 32) || null;
};

// Adsterra banners read a global `atOptions`, so each one runs in its own frame
// where it can't clash with other ads on the page.
const frameDoc = (u) => `<!doctype html><html><head><style>html,body{margin:0;overflow:hidden;background:transparent}</style></head><body>
<script>atOptions = ${JSON.stringify({ key: u.key, format: 'iframe', height: u.height, width: u.width, params: {} })};</script>
<script src="${u.src.startsWith('//') ? 'https:' + u.src : u.src}"></script>
</body></html>`;

/** One Adsterra Banner: 728x90 on wide screens, 320x50 on phones. */
export default function BannerAd() {
  const [unit, setUnit] = useState(() => (isAdFree() ? null : pick())); // tippers turned ads off

  useEffect(() => {
    if (isAdFree()) return undefined;
    const onResize = () => setUnit((cur) => { const next = pick(); return next === cur ? cur : next; });
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  }, []);

  if (!unit) {
    // While no banner is set up, show the empty space in development only.
    if (!import.meta.env.DEV || isAdFree()) return null;
    return (
      <aside className="section ad-slot" aria-label="Advertisement">
        <p className="ad-label">Advertisement</p>
        <div className="banner-ad banner-ad-empty">Banner space · 728×90 / 320×50 · set it up in ads.config.js</div>
      </aside>
    );
  }
  return (
    <aside className="section ad-slot" aria-label="Advertisement">
      <p className="ad-label">Advertisement · <a href="#support">Tip to remove ads</a></p>
      <div className="banner-ad">
        <iframe key={unit.key} title="Advertisement" width={unit.width} height={unit.height}
          scrolling="no" loading="lazy" srcDoc={frameDoc(unit)} />
      </div>
    </aside>
  );
}
