import { useEffect, useRef } from 'react';
import { LAYOUTS } from '../lib/booth.js';
import { LOOKS } from '../lib/looks.js';
import LookPicker from './LookPicker.jsx';

// A frame in the tray, cropped to the shape of its slot in the layout.
function ShotThumb({ src, ar }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    c.width = 160; c.height = Math.round(160 / ar);
    const ctx = c.getContext('2d');
    const s = Math.max(c.width / src.width, c.height / src.height);
    const sw = c.width / s, sh = c.height / s;
    ctx.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, c.width, c.height);
  }, [src, ar]);
  return <canvas ref={ref} />;
}

export default function CaptureStep({ booth }) {
  const {
    hidden, videoRef, flashRef, live, busy, countdown, hud, active,
    layout, photos, looked, look, setLook, timer, setTimer, mirror, setMirror, sound, setSound, facing,
    startCamera, flipCamera, startSession, pickPhotos, onShot, go,
  } = booth;

  const L = LAYOUTS[layout];
  const slots = L.slots || LAYOUTS[L.composite].slots;
  const filled = photos.filter(Boolean).length;
  const css = LOOKS.find((l) => l.id === look).css;
  const videoStyle = {
    filter: css === 'none' ? undefined : css,
    transform: mirror && facing === 'user' ? 'scaleX(-1)' : undefined,
  };

  return (
    <div className="panel" hidden={hidden}>
      <div className="capture">
        <div className="stage-col">
          <div className="stage">
            <video ref={videoRef} style={videoStyle} playsInline muted autoPlay></video>
            <div className="stage-empty" hidden={live}>
              <div className="lens" aria-hidden="true"></div>
              <h3>Ready when you are</h3>
              <p>Allow camera access to begin, or upload photos you already love.</p>
              <div className="row">
                <button className="btn btn-light" type="button" onClick={() => startCamera()}>Enable camera</button>
                <button className="btn btn-outline-light" type="button" onClick={() => pickPhotos(null)}>Upload photos</button>
              </div>
            </div>
            <div key={countdown.id} className={'countdown' + (countdown.n ? ' tick' : '')} aria-live="assertive">{countdown.n || ''}</div>
            <div className="flash" ref={flashRef}></div>
            <div className="stage-hud" hidden={!busy}>
              <span className="rec"></span><span>{hud}</span>
            </div>
          </div>

          <div className="shoot-bar">
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => pickPhotos(null)}>
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M19 13v6H5v-6H3v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6zM11 4.8V16h2V4.8l3.6 3.6L18 7l-6-6-6 6 1.4 1.4z" /></svg>
              Upload
            </button>
            <button className={'shutter' + (busy ? ' busy' : '')} type="button" aria-label={busy ? 'Stop session' : 'Start photo session'} onClick={startSession}>
              <span></span>
            </button>
            <button className="btn btn-ghost btn-sm" type="button" disabled={!live} onClick={flipCamera}>
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M20 5h-3.2L15 3H9L7.2 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m-8 13a5 5 0 0 1-4.9-4H5l3-3 3 3H9.1A3 3 0 0 0 15 13h2a5 5 0 0 1-5 5m3-5-3-3h1.9A3 3 0 0 0 9 11H7a5 5 0 0 1 9.9-1H19z" /></svg>
              Flip
            </button>
          </div>
        </div>

        <aside className="capture-side">
          <div className="field">
            <span className="label">Timer</span>
            <div className="seg">
              {[3, 5, 10].map((t) => (
                <button key={t} type="button" className={t === timer ? 'on' : undefined} onClick={() => setTimer(t)}>{t}s</button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="label">Film look</span>
            <LookPicker look={look} onPick={setLook} />
          </div>
          <div className="field toggles">
            <label className="switch"><input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} /><span></span>Mirror preview</label>
            <label className="switch"><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /><span></span>Shutter sound</label>
          </div>
          <div className="field">
            <span className="label">Your frames <small>{filled} / {photos.length}</small></span>
            <div className="tray">
              {photos.map((p, i) => (
                <button key={i} type="button" className={'shot' + (p ? ' has' : '') + (i === active ? ' active' : '')}
                  aria-label={p ? `Retake frame ${i + 1}` : `Frame ${i + 1}, empty`} onClick={() => onShot(i)}>
                  {p
                    ? <><ShotThumb src={looked[i]} ar={slots[i].w / slots[i].h} /><span className="retake">Retake</span></>
                    : <span className="shot-num">{i + 1}</span>}
                </button>
              ))}
            </div>
            <p className="hint">Tap a frame to retake it. Press <kbd>Space</kbd> to start.</p>
          </div>
          <button className="btn btn-dark btn-block" type="button" disabled={filled === 0 || busy} onClick={() => go(3)}>Continue to design</button>
        </aside>
      </div>
    </div>
  );
}
