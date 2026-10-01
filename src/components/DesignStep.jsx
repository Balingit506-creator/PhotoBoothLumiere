import { useEffect, useState } from 'react';
import { LAYOUTS, TEMPLATES } from '../lib/booth.js';
import { loadImage } from '../lib/media.js';
import { useArt, useToast } from '../context.js';
import { visibleTemplates } from './Gallery.jsx';
import Chips from './Chips.jsx';
import LookPicker from './LookPicker.jsx';
import StripCanvas from './StripCanvas.jsx';

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const canShareFiles = (() => {
  try { return !!(navigator.canShare && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] })); }
  catch (e) { return false; }
})();

export default function DesignStep({ booth }) {
  const {
    layout, template, setTemplate, looked, look, setLook,
    caption, captionEdited, setCaption, sub, setSub, showCaption, setShowCaption,
    overlay, setOverlay, renderOpts, download, share, startOver, tipNudge, go,
  } = booth;
  const toast = useToast();
  const { placeholders } = useArt();
  const [cat, setCat] = useState('all');

  const L = LAYOUTS[layout];
  const wide = L.w > 600;

  // Thumbnails trail typing slightly so the preview stays responsive.
  const thumbCaption = useDebounced(caption, 120);
  const thumbSub = useDebounced(sub, 120);
  const thumbLayout = L.composite || layout;
  const thumbScale = LAYOUTS[thumbLayout].w > 600 ? 0.1 : 0.16;
  const thumbPhotos = looked.map((p, i) => p || placeholders[i % 4]);

  async function onOverlay(e) {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const img = await loadImage(f);
      const ratio = img.naturalWidth / img.naturalHeight;
      const warn = Math.abs(ratio - L.w / L.h) > 0.04 ? ' (its shape differs from this layout, so it will be stretched)' : '';
      setOverlay({ img, label: `${f.name}${warn}` });
    } catch (err) { toast(err.message); }
  }

  return (
    <div className="panel">
      <div className="design">
        <div className="preview-col">
          <div className="preview-frame">
            <StripCanvas id="preview" aria-label="Photo strip preview" data-shape={wide ? 'wide' : 'strip'}
              opts={renderOpts({ scale: wide ? 0.5 : 0.7 })} />
          </div>
        </div>
        <aside className="design-side">
          <div className="field">
            <span className="label">Template</span>
            <Chips className="chips small" active={cat} onPick={setCat} />
            <div className="tpl-grid">
              {visibleTemplates(cat).map((t) => (
                <button key={t.id} type="button" className={'tpl' + (t.id === template ? ' on' : '')} title={t.name} aria-label={t.name} onClick={() => setTemplate(t.id)}>
                  <StripCanvas opts={{
                    layout: thumbLayout, template: t.id, photos: thumbPhotos,
                    caption: captionEdited ? thumbCaption : TEMPLATES[t.id].caption,
                    sub: thumbSub, showCaption, scale: thumbScale,
                  }} />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="captionInput">Caption</label>
            <input className="input" id="captionInput" type="text" maxLength={40} placeholder="Our Moments" value={caption} onChange={(e) => setCaption(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="subInput">Subtitle</label>
            <input className="input" id="subInput" type="text" maxLength={48} value={sub} onChange={(e) => setSub(e.target.value)} />
          </div>
          <div className="field toggles">
            <label className="switch"><input type="checkbox" checked={showCaption} onChange={(e) => setShowCaption(e.target.checked)} /><span></span>Show caption</label>
          </div>

          <div className="field">
            <span className="label">Film look</span>
            <LookPicker look={look} onPick={setLook} />
          </div>

          <details className="field overlay-box">
            <summary className="label">Bring your own template <small>optional</small></summary>
            <p className="hint">Upload a transparent PNG made for photo booths. It is laid over the finished strip, so pair it with <em>Blank Canvas</em> for a clean base. Best sizes: 600×1800 for strips, 1200×1800 for 4×6.</p>
            <div className="row">
              <label className="btn btn-ghost btn-sm file-btn">Choose PNG<input type="file" accept="image/png,image/webp" hidden onChange={onOverlay} /></label>
              <button className="btn btn-link btn-sm" type="button" hidden={!overlay} onClick={() => setOverlay(null)}>Remove</button>
            </div>
            <p className="hint">{overlay ? overlay.label : ''}</p>
          </details>

          <div className="download">
            <button className="btn btn-dark btn-block" type="button" onClick={download}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M19 12v7H5v-7H3v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7zm-6 .7 2.6-2.6L17 11.5l-5 5-5-5 1.4-1.4 2.6 2.6V3h2z" /></svg>
              Download print file
            </button>
            <div className="row">
              {canShareFiles && <button className="btn btn-ghost btn-sm" type="button" onClick={share}>Share</button>}
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => go(2)}>Retake photos</button>
              <button className="btn btn-link btn-sm" type="button" onClick={startOver}>Start over</button>
            </div>
            <p className="hint">{L.w} × {L.h} px · {wide ? '4×6' : '2×6'} in at 300 dpi</p>
            <p className="hint tip-nudge" hidden={!tipNudge}>Love your strip? <a href="#support">Buy the booth a coffee</a> ☕</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
