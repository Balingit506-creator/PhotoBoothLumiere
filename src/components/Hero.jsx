import { useState } from 'react';
import { TEMPLATE_LIST } from '../lib/booth.js';
import { useArt } from '../context.js';
import { today } from '../lib/media.js';
import StripCanvas from './StripCanvas.jsx';

const PICKS = [
  ['goldleaf', 'Happily Ever After'],
  ['gatsby', 'The Roaring Night'],
  ['orchid', 'With Love'],
];

// The hero CTA: a gold shimmer and soft glow at rest, a blinking flash on hover,
// and a shutter flash on click.
function SnapButton() {
  const [shot, setShot] = useState(0);
  return (
    <a className="btn btn-dark btn-snap" href="#booth" onClick={() => setShot((n) => n + 1)}>
      <svg className="snap-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <rect className="snap-flashbulb" x="4.5" y="4" width="4" height="2.2" rx=".8" />
        <path className="snap-body" d="M3 8.5A2.5 2.5 0 0 1 5.5 6h2l1.2-1.6A1 1 0 0 1 9.5 4h5a1 1 0 0 1 .8.4L16.5 6h2A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />
        <circle className="snap-lens" cx="12" cy="13" r="3.6" />
      </svg>
      <span>Start snapping</span>
      <span className="snap-sparkle" aria-hidden="true">✦</span>
      {shot > 0 && <span key={shot} className="snap-shot" aria-hidden="true"></span>}
    </a>
  );
}

export default function Hero() {
  const { placeholders: ph } = useArt();
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">The online photo booth</p>
        <h1>Moments,<br /><em>beautifully</em> framed.</h1>
        <p className="lede">Strike a pose at home, at the party or across the world. Lumière Booth turns your webcam into a studio: snap a strip, dress it in a designer template, and keep a print‑ready photo strip in seconds.</p>
        <div className="hero-cta">
          <SnapButton />
          <a className="btn btn-ghost" href="#templates">Browse {TEMPLATE_LIST.length} templates</a>
        </div>
        <ul className="trust">
          <li><strong>{TEMPLATE_LIST.length}</strong> designer templates</li>
          <li><strong>300 dpi</strong> 2×6 &amp; 4×6 prints</li>
          <li><strong>100%</strong> private, in your browser</li>
        </ul>
      </div>
      <div className="hero-art" aria-hidden="true">
        {PICKS.map(([id, caption], i) => (
          <StripCanvas
            key={id}
            className={`hero-strip s${i + 1}`}
            opts={{ layout: 'strip3', template: id, photos: [ph[i % 4], ph[(i + 1) % 4], ph[(i + 2) % 4]], caption, sub: today, scale: 0.42 }}
          />
        ))}
        <div className="hero-glow"></div>
      </div>
    </section>
  );
}
