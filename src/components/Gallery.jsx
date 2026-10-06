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
  // Phones only: the 30-card grid is long, so it can be folded away.
  const [collapsed, setCollapsed] = useState(false);
  const { placeholders } = useArt();
  return (
    <section className={'section' + (collapsed ? ' gallery-collapsed' : '')} id="templates">
      <div className="section-head split">
        <div>
          <p className="eyebrow">The collection</p>
          <h2>Designed for every occasion</h2>
          <p className="muted">Weddings, proms, birthdays and holiday soirées. Every template is drawn at print resolution, so it stays crisp on paper.</p>
        </div>
        <Chips active={cat} onPick={setCat} role="tablist" aria-label="Filter templates" />
        <button className="btn btn-ghost btn-sm gallery-toggle" type="button" aria-expanded={!collapsed} aria-controls="gallery-grid"
          onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? `Show templates (${visibleTemplates(cat).length})` : 'Minimize templates'}
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="m6 15 6-6 6 6" /></svg>
        </button>
      </div>
      <div className="gallery" id="gallery-grid">
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
