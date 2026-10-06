import { useRef, useState } from 'react';
import { Brand } from './Nav.jsx';

const CONFETTI = ['♥', '✦', '★', '♥', '✦', 'strip', '♥', '✧', 'strip', '★', '♥', '✦'];
const CHEERS = ['Say cheese! 📸', 'Smile! ✨', 'Hi from JB 💛', 'Strike a pose! 💃', 'Flash! ⚡'];

// The "JB" signature: a click fires a little booth flash and a burst of hearts,
// sparkles and tiny photo strips.
function Monogram() {
  const [bursts, setBursts] = useState([]);
  const [pop, setPop] = useState(0);
  const next = useRef(0);

  const celebrate = () => {
    const id = ++next.current;
    setPop(id);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bits = CONFETTI.map((kind, i) => {
      const angle = (-90 + (i - (CONFETTI.length - 1) / 2) * 15 + (Math.random() - .5) * 12) * Math.PI / 180;
      const dist = 46 + Math.random() * 40;
      return {
        kind,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        rot: (Math.random() - .5) * 120,
        delay: Math.random() * 80,
        hue: i % 3,
      };
    });
    setBursts((b) => [...b, { id, bits }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1400);
  };

  return (
    <button type="button" className="monogram" aria-label="J. B. — say cheese!" onClick={celebrate}>
      <span key={pop} className={pop ? 'monogram-face pop' : 'monogram-face'}>JB</span>
      {pop > 0 && <span key={'f' + pop} className="monogram-flash" aria-hidden="true"></span>}
      {pop > 0 && <span key={'b' + pop} className="monogram-bubble" role="status">{CHEERS[(pop - 1) % CHEERS.length]}</span>}
      {bursts.map((b) => (
        <span key={b.id} className="burst" aria-hidden="true">
          {b.bits.map((p, i) => (
            <span key={i} className={'bit c' + p.hue + (p.kind === 'strip' ? ' strip' : '')}
              style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rot': `${p.rot}deg`, animationDelay: `${p.delay}ms` }}>
              {p.kind === 'strip' ? <><i></i><i></i><i></i></> : p.kind}
            </span>
          ))}
        </span>
      ))}
    </button>
  );
}

const columns = [
  {
    title: 'Booth',
    links: [
      ['Open the booth', '#booth'],
      ['How it works', '#how'],
      ['Templates', '#templates'],
      ['Gear', '#gear'],
    ],
  },
  {
    title: 'Help',
    links: [
      ['FAQ', '#faq'],
      ['Support us', '#support'],
      ['Suggest an idea', '#suggest'],
    ],
  },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Brand />
          <p className="muted">Made for moments that matter. Snap a strip with your camera or upload photos, pick a template and download a print-ready keepsake.</p>
          <ul className="footer-facts muted small">
            <li>30 templates</li>
            <li>300 dpi prints</li>
            <li>Free to use</li>
          </ul>
        </div>
        {columns.map((col) => (
          <nav className="footer-col" key={col.title} aria-label={col.title}>
            <h4>{col.title}</h4>
            <ul>
              {col.links.map(([label, href]) => (
                <li key={href}><a href={href}>{label}</a></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="footer-bottom">
        <p className="muted small">© {new Date().getFullYear()} Lumière Booth. All rights reserved.</p>
        <p className="muted small footer-sign">
          Crafted with care by <Monogram />
        </p>
      </div>
    </footer>
  );
}
