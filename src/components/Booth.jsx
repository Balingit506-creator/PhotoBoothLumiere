/* Lumière Booth — the 3-step booth: layout, capture, design & download. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { LAYOUTS, TEMPLATES, render } from '../lib/booth.js';
import { beep, fileName, loadImage, lookOf, replay, shutterSound, sleep, toCanvas, today } from '../lib/media.js';
import { useArt, useToast } from '../context.js';
import StripCanvas from './StripCanvas.jsx';
import CaptureStep from './CaptureStep.jsx';
import DesignStep from './DesignStep.jsx';

const LAYOUT_ORDER = ['strip3', 'strip4', 'double', 'grid4', 'single'];
const STEPS = ['Layout', 'Capture', 'Design & download'];

const resize = (photos, n) => Array.from({ length: n }, (_, i) => photos[i] || null);
const filledOf = (photos) => photos.filter(Boolean).length;

export default function Booth({ template, setTemplate, tipNudge, onDownloaded }) {
  const toast = useToast();
  const { placeholders } = useArt();

  const [step, setStep] = useState(1);
  const [layout, setLayoutId] = useState('strip3');
  const [photos, setPhotosState] = useState(() => resize([], LAYOUTS.strip3.count)); // { src: canvas, cache: { [look]: canvas } } | null
  const [look, setLook] = useState('none');
  const [customCaption, setCustomCaption] = useState(null); // null follows the template's caption
  const [sub, setSub] = useState(today);
  const [showCaption, setShowCaption] = useState(true);
  const [overlay, setOverlay] = useState(null); // { img, label }
  const [timer, setTimer] = useState(3);
  const [mirror, setMirror] = useState(true);
  const [sound, setSound] = useState(true);
  const [facing, setFacing] = useState('user');
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(-1);
  const [hud, setHud] = useState('');
  const [countdown, setCountdown] = useState({ n: 0, id: 0 });

  const caption = customCaption ?? TEMPLATES[template].caption;
  const count = LAYOUTS[layout].count;
  const looked = useMemo(() => photos.map((p) => lookOf(p, look)), [photos, look]);

  // The photo session is a long async loop, so it reads live values through refs.
  const videoRef = useRef(null);
  const flashRef = useRef(null);
  const inputRef = useRef(null);
  const photosRef = useRef(photos);
  const stepRef = useRef(step);
  const streamRef = useRef(null);
  const wantCameraRef = useRef(false);
  const busyRef = useRef(false);
  const cancelRef = useRef(false);
  const uploadTargetRef = useRef(null);
  const latest = useRef();
  latest.current = { timer, sound, mirror, facing, layout };

  function updatePhotos(fn) {
    photosRef.current = fn(photosRef.current);
    setPhotosState(photosRef.current);
  }

  /* ------------------------------------------------------------ step nav */

  function go(n) {
    if (n === 3 && filledOf(photosRef.current) === 0) { toast('Take or upload at least one photo first.'); return; }
    stepRef.current = n;
    setStep(n);
    if (n === 2 && wantCameraRef.current && !streamRef.current) startCamera();
    if (n === 3) stopCamera(true);
    const el = document.getElementById('booth');
    const top = el.getBoundingClientRect().top;
    if (top < -40 || top > window.innerHeight * 0.5) el.scrollIntoView({ behavior: 'smooth' });
  }

  function setLayout(id) {
    setLayoutId(id);
    updatePhotos((p) => resize(p, LAYOUTS[id].count));
  }

  /* ------------------------------------------------------------ camera */

  async function startCamera(facingMode = latest.current.facing) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast('This browser cannot open the camera here. Try uploading photos, or open the page over https or localhost.');
      return false;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1440 } },
        audio: false,
      });
      streamRef.current = stream;
      wantCameraRef.current = true;
      const v = videoRef.current;
      v.srcObject = stream;
      await v.play().catch(() => {});
      setLive(true);
      return true;
    } catch (e) {
      const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      toast(denied ? 'Camera access was blocked. Allow it in your browser settings, or upload photos instead.' : 'No camera found. You can still upload photos.');
      return false;
    }
  }

  function stopCamera(keepIntent) {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (!keepIntent) wantCameraRef.current = false;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLive(false);
  }

  function flipCamera() {
    const next = facing === 'user' ? 'environment' : 'user';
    setFacing(next);
    startCamera(next);
  }

  useEffect(() => () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
  }, []);

  /* ------------------------------------------------------------ session */

  async function runCountdown(n) {
    for (let i = n; i > 0; i--) {
      if (cancelRef.current) break;
      setCountdown((c) => ({ n: i, id: c.id + 1 }));
      if (latest.current.sound) beep(i === 1 ? 1175 : 880);
      await sleep(1000);
    }
    setCountdown((c) => ({ n: 0, id: c.id }));
  }

  function snap(index) {
    const v = videoRef.current;
    if (!v.videoWidth) return false;
    const { mirror: m, facing: f, sound: s } = latest.current;
    const shot = { src: toCanvas(v, v.videoWidth, v.videoHeight, m && f === 'user'), cache: {} };
    updatePhotos((p) => p.map((x, i) => (i === index ? shot : x)));
    replay(flashRef.current, 'go');
    if (s) shutterSound();
    return true;
  }

  async function shoot(indices) {
    if (busyRef.current) return;
    if (!streamRef.current && !(await startCamera())) return;
    busyRef.current = true; cancelRef.current = false;
    setBusy(true);
    for (let j = 0; j < indices.length; j++) {
      const idx = indices[j];
      setHud(`Frame ${idx + 1} of ${LAYOUTS[latest.current.layout].count}`);
      setActive(idx);
      await runCountdown(latest.current.timer);
      if (cancelRef.current || !streamRef.current) break;
      snap(idx);
      if (j < indices.length - 1) await sleep(900);
    }
    busyRef.current = false;
    setBusy(false);
    setActive(-1);
    const p = photosRef.current;
    if (!cancelRef.current && filledOf(p) === p.length && indices.length > 1) {
      await sleep(700);
      if (stepRef.current === 2) go(3);
    }
  }

  function startSession() {
    if (busyRef.current) { cancelRef.current = true; return; }
    const n = photosRef.current.length;
    let targets = photosRef.current.map((p, i) => (p ? -1 : i)).filter((i) => i >= 0);
    if (!targets.length) { updatePhotos(() => resize([], n)); targets = [...Array(n).keys()]; }
    shoot(targets);
  }

  // Space starts a session on the capture step.
  const sessionRef = useRef(startSession);
  sessionRef.current = startSession;
  useEffect(() => {
    if (step !== 2) return;
    const onKey = (e) => {
      if (e.code !== 'Space') return;
      if (/INPUT|TEXTAREA|BUTTON|SELECT/.test(document.activeElement.tagName)) return;
      e.preventDefault();
      sessionRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [step]);

  /* ------------------------------------------------------------ uploads */

  function pickPhotos(target) {
    uploadTargetRef.current = target;
    const input = inputRef.current;
    input.multiple = target == null;
    input.value = '';
    input.click();
  }

  async function onPhotos(fileList) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    const target = uploadTargetRef.current;
    const next = [...photosRef.current];
    let idx = target != null ? target : next.findIndex((p) => !p);
    if (idx < 0) idx = 0;
    for (const f of files) {
      if (idx >= next.length) break;
      try {
        const img = await loadImage(f);
        next[idx] = { src: toCanvas(img, img.naturalWidth, img.naturalHeight, false), cache: {} };
        idx++;
      } catch (e) { toast(e.message); }
    }
    updatePhotos(() => next);
    if (stepRef.current === 1) go(2);
    if (filledOf(next) === next.length && target == null && stepRef.current === 2) go(3);
  }

  function onShot(i) {
    if (busyRef.current) return;
    if (streamRef.current) shoot([i]);
    else pickPhotos(i);
  }

  /* ------------------------------------------------------------ export */

  const renderOpts = (extra) => ({
    layout, template, photos: looked, caption, sub, showCaption,
    overlay: overlay ? overlay.img : null,
    ...extra,
  });

  function exportBlob() {
    const c = document.createElement('canvas');
    render(c, renderOpts({ scale: 1 }));
    return new Promise((res) => c.toBlob(res, 'image/png'));
  }

  async function download() {
    const blob = await exportBlob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName(template);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Saved. Enjoy your keepsake!');
    onDownloaded();
  }

  async function share() {
    const blob = await exportBlob();
    const file = new File([blob], fileName(template), { type: 'image/png' });
    try { await navigator.share({ files: [file], title: 'My Lumière Booth strip' }); }
    catch (e) { if (e.name !== 'AbortError') toast('Sharing is not available here. Use Download instead.'); }
  }

  function startOver() {
    updatePhotos((p) => resize([], p.length));
    setOverlay(null);
    setCustomCaption(null);
    go(1);
  }

  const booth = {
    hidden: step !== 2, videoRef, flashRef, live, busy, countdown, hud, active,
    layout, template, setTemplate, photos, looked, look, setLook,
    timer, setTimer, mirror, setMirror, sound, setSound, facing,
    caption, captionEdited: customCaption !== null, setCaption: setCustomCaption,
    sub, setSub, showCaption, setShowCaption, overlay, setOverlay,
    startCamera, flipCamera, startSession, pickPhotos, onShot, go,
    renderOpts, download, share, startOver, tipNudge,
  };

  return (
    <section className="section booth-wrap" id="booth">
      <div className="section-head center">
        <p className="eyebrow">The booth</p>
        <h2>Step inside</h2>
      </div>

      <div className="booth">
        <ol className="stepper">
          {STEPS.map((name, i) => (
            <li key={name} className={i + 1 === step ? 'on' : i + 1 < step ? 'done' : undefined}>
              <button type="button" onClick={() => go(i + 1)}><span>{i + 1}</span> {name}</button>
            </li>
          ))}
        </ol>

        {step === 1 && (
          <div className="panel">
            <p className="panel-intro">How would you like your prints?</p>
            <div className="layouts">
              {LAYOUT_ORDER.map((id) => {
                const L = LAYOUTS[id];
                const art = Array.from({ length: L.count }, (_, i) => looked[i] || placeholders[i % 4]);
                return (
                  <button key={id} type="button" className={'layout' + (id === layout ? ' on' : '')} aria-pressed={id === layout} onClick={() => setLayout(id)}>
                    <span className="layout-art">
                      <StripCanvas opts={{ layout: id, template, photos: art, caption, sub, showCaption, scale: 0.14 }} />
                    </span>
                    <span className="layout-name">{L.name}</span>
                    <span className="layout-detail">{L.detail}</span>
                  </button>
                );
              })}
            </div>
            <div className="panel-foot">
              <button className="btn btn-dark" type="button" onClick={() => go(2)}>Continue to camera</button>
            </div>
          </div>
        )}

        {/* Always mounted so the camera stream survives stepping back to layouts. */}
        <CaptureStep booth={booth} />

        {step === 3 && <DesignStep booth={booth} />}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => onPhotos(e.target.files)} />
    </section>
  );
}
