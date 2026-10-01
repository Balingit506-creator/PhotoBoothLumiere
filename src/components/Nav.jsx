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
      <span className="brand-mark" aria-hidden="true"></span>
      <span className="brand-name">Lumière<em>Booth</em></span>
    </a>
  );
}

export default function Nav() {
  return (
    <header className="nav" id="top">
      <div className="nav-inner">
        <Brand />
        <nav className="nav-links" aria-label="Primary">
          <a href="#how">How it works</a>
          <a href="#templates">Templates</a>
          <a href="#faq">FAQ</a>
          <a href="#support">Support</a>
        </nav>
        <div className="nav-actions">
          <button className="icon-btn" type="button" aria-label="Toggle dark mode" onClick={toggleTheme}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z" /></svg>
          </button>
          <a className="btn btn-dark btn-sm" href="#booth">Open the booth</a>
        </div>
      </div>
    </header>
  );
}
