import { TEMPLATE_LIST } from '../lib/booth.js';
import { useArt } from '../context.js';
import { today } from '../lib/media.js';
import StripCanvas from './StripCanvas.jsx';

const PICKS = [
  ['goldleaf', 'Happily Ever After'],
  ['gatsby', 'The Roaring Night'],
  ['orchid', 'With Love'],
];

export default function Hero() {
  const { placeholders: ph } = useArt();
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">The online photo booth</p>
        <h1>Moments,<br /><em>beautifully</em> framed.</h1>
        <p className="lede">Strike a pose at home, at the party or across the world. Lumière Booth turns your webcam into a studio: snap a strip, dress it in a designer template, and keep a print‑ready photo strip in seconds.</p>
        <div className="hero-cta">
          <a className="btn btn-dark" href="#booth">Start snapping</a>
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
