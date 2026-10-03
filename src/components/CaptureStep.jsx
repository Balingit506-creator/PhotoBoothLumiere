import { useEffect, useRef } from 'react';
import { LAYOUTS } from '../lib/booth.js';
import { LOOKS } from '../lib/looks.js';
import { useToast } from '../context.js';
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

function RemoteVideo({ stream, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    v.srcObject = stream;
    if (stream) v.play().catch(() => {});
  }, [stream]);
  return <video ref={ref} className="cam them" style={style} playsInline muted autoPlay></video>;
}

const canShareLink = typeof navigator !== 'undefined' && !!navigator.share;

function TogetherPanel({ booth }) {
  const toast = useToast();
  const { together, joinRoom, invite, joinFriend, leaveTogether } = booth;
  const { status, role, link, error } = together;

  const copy = () => navigator.clipboard.writeText(link).then(() => toast('Invite link copied.'), () => toast('Copy the link from the box above.'));
  const share = () => navigator.share({ title: 'Join my photo booth', text: "Let's take photos together on Lumière Booth!", url: link }).catch(() => {});

  return (
    <div className="field together">
      <span className="label">Shoot together <small>beta</small></span>
      {status === 'off' && !joinRoom && (
        <>
          <p className="hint">Far apart? Invite a friend and take turns: you shoot one frame, they shoot the next.</p>
          <button className="btn btn-ghost btn-sm btn-block" type="button" onClick={invite}>Invite a friend</button>
        </>
      )}
      {status === 'off' && joinRoom && (
        <>
          <p className="hint">A friend invited you to their booth.</p>
          <button className="btn btn-dark btn-sm btn-block" type="button" onClick={joinFriend}>Join your friend</button>
          <button className="btn btn-link btn-sm" type="button" onClick={leaveTogether}>Shoot on my own</button>
        </>
      )}
      {(status === 'starting' || status === 'joining') && <p className="together-status"><span className="dot wait"></span>Connecting…</p>}
      {status === 'waiting' && (
        <>
          <p className="hint">Send this link to your friend:</p>
          <div className="invite">
            <input className="input" readOnly value={link} aria-label="Invite link" onFocus={(e) => e.target.select()} />
            <button className="btn btn-dark btn-sm" type="button" onClick={copy}>Copy</button>
          </div>
          <p className="together-status"><span className="dot wait"></span>Waiting for your friend to join…</p>
          <div className="row">
            {canShareLink && <button className="btn btn-ghost btn-sm" type="button" onClick={share}>Share</button>}
            <button className="btn btn-link btn-sm" type="button" onClick={leaveTogether}>Cancel</button>
          </div>
        </>
      )}
      {status === 'connected' && (
        <>
          <p className="together-status"><span className="dot"></span>Connected. Either of you can press the shutter; you take turns frame by frame.</p>
          <button className="btn btn-link btn-sm" type="button" onClick={leaveTogether}>Leave</button>
        </>
      )}
      {status === 'error' && (
        <>
          <p className="hint together-error">{error}</p>
          <div className="row">
            <button className="btn btn-ghost btn-sm" type="button" onClick={role === 'guest' ? joinFriend : invite}>Try again</button>
            <button className="btn btn-link btn-sm" type="button" onClick={leaveTogether}>Close</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function CaptureStep({ booth }) {
  const {
    hidden, videoRef, flashRef, live, busy, countdown, hud, active,
    layout, photos, looked, look, setLook, timer, setTimer, mirror, setMirror, sound, setSound, facing,
    startCamera, flipCamera, startSession, pickPhotos, onShot, go,
    together, remoteMirror, joinRoom, joinFriend, turn,
  } = booth;
  const duo = together.status === 'connected';
  const guest = together.role === 'guest';
  const invited = joinRoom && together.status === 'off';

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
          <div className={'stage' + (duo ? ' duo' : '') + (guest ? ' guest' : '') + (duo && turn ? ' turn-' + turn : '')}>
            <video ref={videoRef} className="cam me" style={videoStyle} playsInline muted autoPlay></video>
            {duo && (
              <>
                <RemoteVideo stream={together.remoteStream} style={{ filter: videoStyle.filter, transform: remoteMirror ? 'scaleX(-1)' : undefined }} />
                {!together.remoteStream && <div className="them-wait">Connecting video…</div>}
                <div className="duo-split" aria-hidden="true"></div>
                <span className="tag me-tag">{turn === 'me' ? 'Your turn' : 'You'}</span>
                <span className="tag them-tag">{turn === 'them' ? 'Friend’s turn' : 'Friend'}</span>
              </>
            )}
            <div className="stage-empty" hidden={live}>
              <div className="lens" aria-hidden="true"></div>
              {invited ? (
                <>
                  <h3>You're invited</h3>
                  <p>Your friend is waiting in their booth. Turn on your camera to join them.</p>
                  <div className="row">
                    <button className="btn btn-light" type="button" onClick={joinFriend}>Join the booth</button>
                  </div>
                </>
              ) : (
                <>
                  <h3>Ready when you are</h3>
                  <p>Allow camera access to begin, or upload photos you already love.</p>
                  <div className="row">
                    <button className="btn btn-light" type="button" onClick={() => startCamera()}>Enable camera</button>
                    <button className="btn btn-outline-light" type="button" onClick={() => pickPhotos(null)}>Upload photos</button>
                  </div>
                </>
              )}
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
          <TogetherPanel booth={booth} />
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
