import { useState } from 'react';
import { CATEGORIES, TEMPLATE_LIST } from '../lib/booth.js';
import { useArt } from '../context.js';
import { today } from '../lib/media.js';
import Chips from './Chips.jsx';
import StripCanvas from './StripCanvas.jsx';

export const visibleTemplates = (cat) => TEMPLATE_LIST.filter((t) => cat === 'all' || t.cats.includes(cat));
const catName = (id) => CATEGORIES.find((c) => c.id === id).name;

export default function Gallery({ onUse }) {
  const [cat, setCat] = useState('all');
  const { placeholders } = useArt();
  return (
    <section className="section" id="templates">
      <div className="section-head split">
        <div>
          <p className="eyebrow">The collection</p>
          <h2>Designed for every occasion</h2>
          <p className="muted">Weddings, proms, birthdays and holiday soirées. Every template is drawn at print resolution, so it stays crisp on paper.</p>
        </div>
        <Chips active={cat} onPick={setCat} role="tablist" aria-label="Filter templates" />
      </div>
      <div className="gallery">
        {visibleTemplates(cat).map((t) => (
          <button key={t.id} type="button" className="tcard" aria-label={`Use the ${t.name} template`} onClick={() => onUse(t)}>
            <StripCanvas opts={{ layout: 'strip3', template: t.id, photos: placeholders, caption: t.caption, sub: today, scale: 0.34 }} />
            <span className="tmeta">
              <span className="tname">{t.name}</span>
              <span className="tcat">{t.cats.map(catName).join(' · ')}</span>
            </span>
            <span className="tuse">Use this design</span>
          </button>
        ))}
      </div>
    </section>
  );
}
