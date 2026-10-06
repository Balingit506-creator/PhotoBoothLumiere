import { useEffect, useState } from 'react';

function toggleTheme() {
  const root = document.documentElement;
  const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  const next = dark ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('lumiere-theme', next); } catch (e) { /* storage unavailable */ }
}

// The nav is sticky, so a plain #top link never scrolls. Scroll the page instead
// (smooth or instant, following the CSS scroll-behavior).
function toTop(e) {
  e.preventDefault();
  window.scrollTo({ top: 0 });
  history.replaceState(null, '', location.pathname + location.search);
}

export function Brand() {
  return (
    <a className="brand" href="#top" aria-label="Lumière Booth home" onClick={toTop}>
      <img className="brand-mark" src="logo.webp" alt="" width="56" height="40" decoding="async" />
      <span className="brand-name">Lumière<em>Booth</em></span>
    </a>
  );
}

const Heart = () => <span className="nav-heart" aria-hidden="true">♥</span>;

const LINKS = [
  ['How it works', '#how'],
  ['Templates', '#templates'],
  ['Support us', '#support', true], // true: gets the little gold heart
  ['Suggestions', '#suggest'],
  ['FAQ', '#faq'],
];

export default function Nav() {
  // Phone menu: the inline links are hidden below 900px, so they live behind a hamburger.
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onResize = () => { if (window.innerWidth > 900) setOpen(false); };
    addEventListener('keydown', onKey);
    addEventListener('resize', onResize);
    return () => { removeEventListener('keydown', onKey); removeEventListener('resize', onResize); };
  }, [open]);

  return (
    <header className={'nav' + (open ? ' menu-open' : '')} id="top">
      <div className="nav-inner">
        <Brand />
        <nav className="nav-links" aria-label="Primary">
          {LINKS.map(([label, href, heart]) => <a key={href} href={href}>{label}{heart && <Heart />}</a>)}
        </nav>
        <div className="nav-actions">
          <button className="icon-btn" type="button" aria-label="Toggle dark mode" onClick={toggleTheme}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z" /></svg>
          </button>
          <a className="btn btn-dark btn-sm" href="#booth">Open the booth</a>
          <button className="icon-btn menu-btn" type="button" aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)}>
            <span className="burger" aria-hidden="true"><span></span><span></span><span></span></span>
          </button>
        </div>
      </div>
      <nav className="mobile-menu" id="mobile-menu" aria-label="Mobile" hidden={!open}>
        {LINKS.map(([label, href, heart]) => <a key={href} href={href} onClick={close}>{label}{heart && <Heart />}</a>)}
        <a className="btn btn-dark btn-block" href="#booth" onClick={close}>Open the booth</a>
      </nav>
    </header>
  );
}
