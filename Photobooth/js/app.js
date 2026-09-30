/* Lumière Booth — page and booth controller. */
(function () {
  'use strict';

  const B = window.Booth, Looks = window.Looks;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const LAYOUT_ORDER = ['strip3', 'strip4', 'double', 'grid4', 'single'];

  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const state = {
    step: 1,
    layout: 'strip3',
    template: 'gatsby',
    photos: [], // { src: canvas, cache: { [look]: canvas } } | null
    look: 'none',
    caption: B.TEMPLATES.gatsby.caption,
    captionEdited: false,
    sub: today,
    showCaption: true,
    overlay: null,
    timer: 3,
    mirror: true,
    sound: true,
    facing: 'user',
    stream: null,
    busy: false,
    cancel: false,
    galleryCat: 'all',
    designCat: 'all',
  };

  let placeholders = [];

  /* ------------------------------------------------------------ helpers */

  const count = () => B.LAYOUTS[state.layout].count;
  const filled = () => state.photos.filter(Boolean).length;

  function resizePhotos() {
    const n = count();
    state.photos = Array.from({ length: n }, (_, i) => state.photos[i] || null);
  }

  function lookOf(p) {
    if (!p) return null;
    if (!p.cache[state.look]) p.cache[state.look] = Looks.apply(p.src, state.look);
    return p.cache[state.look];
  }

  function renderOpts(extra) {
    return {
      layout: state.layout,
      template: state.template,
      photos: state.photos.map(lookOf),
      caption: state.caption,
      sub: state.sub,
      showCaption: state.showCaption,
      overlay: state.overlay,
      ...extra,
    };
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3600);
  }

  let actx;
  function audio() {
    if (!state.sound) return null;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); return actx; } catch (e) { return null; }
  }
  function beep(freq = 880, dur = 0.09) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.07, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + dur);
  }
  function shutterSound() {
    const a = audio(); if (!a) return;
    const len = Math.floor(a.sampleRate * 0.12), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = a.createBufferSource(), g = a.createGain();
    src.buffer = buf; g.gain.value = 0.35;
    src.connect(g).connect(a.destination); src.start();
  }

  function loadImage(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not read that image.')); };
      img.src = url;
    });
  }

  function toCanvas(source, sw, sh, mirror) {
    const max = 1600, s = Math.min(1, max / Math.max(sw, sh));
    const c = document.createElement('canvas');
    c.width = Math.round(sw * s); c.height = Math.round(sh * s);
    const ctx = c.getContext('2d');
    if (mirror) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(source, 0, 0, c.width, c.height);
    return c;
  }

  /* ------------------------------------------------------------ gallery */

  function chips(el, active, onPick) {
    el.innerHTML = '';
    B.CATEGORIES.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (c.id === active ? ' on' : '');
      b.textContent = c.name;
      b.setAttribute('aria-pressed', String(c.id === active));
      b.addEventListener('click', () => onPick(c.id));
      el.appendChild(b);
    });
  }

  function visibleTemplates(cat) {
    return B.TEMPLATE_LIST.filter((t) => cat === 'all' || t.cats.includes(cat));
  }

  function buildGallery() {
    chips($('#galleryChips'), state.galleryCat, (id) => { state.galleryCat = id; buildGallery(); });
    const g = $('#gallery');
    g.innerHTML = '';
    visibleTemplates(state.galleryCat).forEach((t) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'tcard';
      card.setAttribute('aria-label', `Use the ${t.name} template`);
      const c = document.createElement('canvas');
      B.render(c, { layout: 'strip3', template: t.id, photos: placeholders, caption: t.caption, sub: today, scale: 0.34 });
      card.appendChild(c);
      const meta = document.createElement('span');
      meta.className = 'tmeta';
      meta.innerHTML = `<span class="tname">${t.name}</span><span class="tcat">${t.cats.map((id) => B.CATEGORIES.find((c) => c.id === id).name).join(' · ')}</span>`;
      card.appendChild(meta);
      const use = document.createElement('span');
      use.className = 'tuse';
      use.textContent = 'Use this design';
      card.appendChild(use);
      card.addEventListener('click', () => {
        setTemplate(t.id);
        $('#booth').scrollIntoView({ behavior: 'smooth' });
        toast(`${t.name} selected`);
      });
      g.appendChild(card);
    });
  }

  function buildHero() {
    const picks = [
      ['goldleaf', 'Happily Ever After'],
      ['gatsby', 'The Roaring Night'],
      ['orchid', 'With Love'],
    ];
    $$('.hero-strip').forEach((c, i) => {
      const [id, cap] = picks[i];
      const ph = [placeholders[i % 4], placeholders[(i + 1) % 4], placeholders[(i + 2) % 4]];
      B.render(c, { layout: 'strip3', template: id, photos: ph, caption: cap, sub: today, scale: 0.42 });
    });
  }

  /* ------------------------------------------------------------ step 1 */

  function buildLayouts() {
    const wrap = $('#layouts');
    wrap.innerHTML = '';
    LAYOUT_ORDER.forEach((id) => {
      const L = B.LAYOUTS[id];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'layout' + (id === state.layout ? ' on' : '');
      b.setAttribute('aria-pressed', String(id === state.layout));
      const c = document.createElement('canvas');
      const photos = Array.from({ length: L.count }, (_, i) => lookOf(state.photos[i]) || placeholders[i % 4]);
      B.render(c, { layout: id, template: state.template, photos, caption: state.caption, sub: state.sub, showCaption: state.showCaption, scale: 0.14 });
      const cw = document.createElement('span'); cw.className = 'layout-art'; cw.appendChild(c);
      b.appendChild(cw);
      b.insertAdjacentHTML('beforeend', `<span class="layout-name">${L.name}</span><span class="layout-detail">${L.detail}</span>`);
      b.addEventListener('click', () => setLayout(id));
      wrap.appendChild(b);
    });
  }

  function setLayout(id) {
    state.layout = id;
    resizePhotos();
    buildLayouts();
    updateCaptureUI();
    scheduleDesign(true);
  }

  /* ------------------------------------------------------------ step nav */

  function go(step) {
    step = Number(step);
    if (step === 3 && filled() === 0) { toast('Take or upload at least one photo first.'); return; }
    state.step = step;
    $$('.panel').forEach((p) => (p.hidden = Number(p.dataset.step) !== step));
    $$('#stepper li').forEach((li, i) => {
      li.classList.toggle('on', i + 1 === step);
      li.classList.toggle('done', i + 1 < step);
    });
    if (step === 1) buildLayouts();
    if (step === 2) { updateCaptureUI(); if (state.wantCamera && !state.stream) startCamera(); }
    if (step === 3) { stopCamera(true); scheduleDesign(true); }
    const top = $('#booth').getBoundingClientRect().top;
    if (top < -40 || top > window.innerHeight * 0.5) $('#booth').scrollIntoView({ behavior: 'smooth' });
  }

  /* ------------------------------------------------------------ camera */

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast('This browser cannot open the camera here. Try uploading photos, or open the page over https or localhost.');
      return false;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: state.facing, width: { ideal: 1920 }, height: { ideal: 1440 } },
        audio: false,
      });
      state.stream = stream;
      state.wantCamera = true;
      const v = $('#video');
      v.srcObject = stream;
      await v.play().catch(() => {});
      $('#stageEmpty').hidden = true;
      $('#flipCam').disabled = false;
      applyVideoStyle();
      return true;
    } catch (e) {
      const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      toast(denied ? 'Camera access was blocked. Allow it in your browser settings, or upload photos instead.' : 'No camera found. You can still upload photos.');
      return false;
    }
  }

  function stopCamera(keepIntent) {
    if (state.stream) state.stream.getTracks().forEach((t) => t.stop());
    state.stream = null;
    if (!keepIntent) state.wantCamera = false;
    const v = $('#video');
    if (v) v.srcObject = null;
    $('#stageEmpty').hidden = false;
    $('#flipCam').disabled = true;
  }

  function applyVideoStyle() {
    const v = $('#video');
    const look = Looks.LOOKS.find((l) => l.id === state.look);
    v.style.filter = look.css === 'none' ? '' : look.css;
    v.style.transform = state.mirror && state.facing === 'user' ? 'scaleX(-1)' : '';
  }

  async function countdown(n) {
    const el = $('#countdown');
    for (let i = n; i > 0; i--) {
      if (state.cancel) break;
      el.textContent = i;
      el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick');
      beep(i === 1 ? 1175 : 880);
      await sleep(1000);
    }
    el.textContent = '';
    el.classList.remove('tick');
  }

  function snap(index) {
    const v = $('#video');
    if (!v.videoWidth) return false;
    const mirror = state.mirror && state.facing === 'user';
    state.photos[index] = { src: toCanvas(v, v.videoWidth, v.videoHeight, mirror), cache: {} };
    const f = $('#flash');
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    shutterSound();
    return true;
  }

  async function shoot(indices) {
    if (state.busy) return;
    if (!state.stream && !(await startCamera())) return;
    state.busy = true; state.cancel = false;
    updateCaptureUI();
    const hud = $('#hud');
    hud.hidden = false;
    for (let j = 0; j < indices.length; j++) {
      const idx = indices[j];
      $('#hudText').textContent = `Frame ${idx + 1} of ${count()}`;
      markActive(idx);
      await countdown(state.timer);
      if (state.cancel || !state.stream) break;
      snap(idx);
      renderTray();
      if (j < indices.length - 1) await sleep(900);
    }
    hud.hidden = true;
    state.busy = false;
    markActive(-1);
    updateCaptureUI();
    scheduleDesign(true);
    if (!state.cancel && filled() === count() && indices.length > 1) {
      await sleep(700);
      if (state.step === 2) go(3);
    }
  }

  function startSession() {
    if (state.busy) { state.cancel = true; return; }
    const n = count();
    let targets = state.photos.map((p, i) => (p ? -1 : i)).filter((i) => i >= 0);
    if (!targets.length) { state.photos = Array(n).fill(null); targets = [...Array(n).keys()]; renderTray(); }
    shoot(targets);
  }

  /* ------------------------------------------------------------ uploads */

  let uploadTarget = null;
  function pickPhotos(target) {
    uploadTarget = target;
    const input = $('#photoInput');
    input.multiple = target == null;
    input.value = '';
    input.click();
  }

  async function onPhotos(files) {
    files = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    let idx = uploadTarget != null ? uploadTarget : state.photos.findIndex((p) => !p);
    if (idx < 0) idx = 0;
    for (const f of files) {
      if (idx >= count()) break;
      try {
        const img = await loadImage(f);
        state.photos[idx] = { src: toCanvas(img, img.naturalWidth, img.naturalHeight, false), cache: {} };
        idx++;
      } catch (e) { toast(e.message); }
    }
    renderTray();
    updateCaptureUI();
    scheduleDesign(true);
    if (state.step === 1) go(2);
    if (filled() === count() && uploadTarget == null && state.step === 2) go(3);
  }

  /* ------------------------------------------------------------ tray */

  function renderTray() {
    const tray = $('#tray');
    tray.innerHTML = '';
    const L = B.LAYOUTS[state.layout];
    state.photos.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'shot' + (p ? ' has' : '');
      b.dataset.index = i;
      b.setAttribute('aria-label', p ? `Retake frame ${i + 1}` : `Frame ${i + 1}, empty`);
      if (p) {
        const c = document.createElement('canvas');
        const src = lookOf(p);
        const slot = (L.slots || B.LAYOUTS[L.composite].slots)[i];
        const ar = slot.w / slot.h;
        c.width = 160; c.height = Math.round(160 / ar);
        const ctx = c.getContext('2d');
        const s = Math.max(c.width / src.width, c.height / src.height);
        const sw = c.width / s, sh = c.height / s;
        ctx.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, c.width, c.height);
        b.appendChild(c);
        b.insertAdjacentHTML('beforeend', '<span class="retake">Retake</span>');
      } else {
        b.insertAdjacentHTML('beforeend', `<span class="shot-num">${i + 1}</span>`);
      }
      b.addEventListener('click', () => {
        if (state.busy) return;
        if (state.stream) shoot([i]);
        else pickPhotos(i);
      });
      tray.appendChild(b);
    });
  }

  function markActive(idx) {
    $$('.shot').forEach((s, i) => s.classList.toggle('active', i === idx));
  }

  function updateCaptureUI() {
    resizePhotos();
    if ($('#tray').children.length !== count()) renderTray();
    $('#frameCount').textContent = `${filled()} / ${count()}`;
    $('#toDesign').disabled = filled() === 0 || state.busy;
    const sh = $('#shutter');
    sh.classList.toggle('busy', state.busy);
    sh.setAttribute('aria-label', state.busy ? 'Stop session' : 'Start photo session');
  }

  /* ------------------------------------------------------------ looks */

  function buildLooks(el) {
    el.innerHTML = '';
    const sample = placeholders[0];
    Looks.LOOKS.forEach((l) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'look' + (l.id === state.look ? ' on' : '');
      b.dataset.look = l.id;
      const c = document.createElement('canvas');
      c.width = 72; c.height = 72;
      const src = Looks.apply(sample, l.id);
      c.getContext('2d').drawImage(src, 100, 0, 600, 600, 0, 0, 72, 72);
      b.appendChild(c);
      b.insertAdjacentHTML('beforeend', `<span>${l.name}</span>`);
      b.addEventListener('click', () => setLook(l.id));
      el.appendChild(b);
    });
  }

  function setLook(id) {
    state.look = id;
    $$('.look').forEach((b) => b.classList.toggle('on', b.dataset.look === id));
    applyVideoStyle();
    renderTray();
    scheduleDesign(true);
  }

  /* ------------------------------------------------------------ step 3 */

  function setTemplate(id) {
    state.template = id;
    if (!state.captionEdited) {
      state.caption = B.TEMPLATES[id].caption;
      $('#captionInput').value = state.caption;
    }
    $$('.tpl').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
    if (state.step === 1) buildLayouts();
    scheduleDesign(false);
  }

  function buildTemplatePicker() {
    chips($('#designChips'), state.designCat, (cat) => { state.designCat = cat; buildTemplatePicker(); });
    const grid = $('#tplGrid');
    grid.innerHTML = '';
    visibleTemplates(state.designCat).forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tpl' + (t.id === state.template ? ' on' : '');
      b.dataset.id = t.id;
      b.title = t.name;
      b.setAttribute('aria-label', t.name);
      b.appendChild(document.createElement('canvas'));
      b.insertAdjacentHTML('beforeend', `<span>${t.name}</span>`);
      b.addEventListener('click', () => setTemplate(t.id));
      grid.appendChild(b);
    });
    renderThumbs();
  }

  function renderThumbs() {
    const base = B.LAYOUTS[state.layout];
    const layout = base.composite || state.layout;
    const scale = B.LAYOUTS[layout].w > 600 ? 0.1 : 0.16;
    const photos = state.photos.map((p, i) => lookOf(p) || placeholders[i % 4]);
    $$('.tpl').forEach((b) => {
      const t = B.TEMPLATES[b.dataset.id];
      B.render(b.querySelector('canvas'), {
        layout, template: t.id, photos,
        caption: state.captionEdited ? state.caption : t.caption,
        sub: state.sub, showCaption: state.showCaption, scale,
      });
    });
  }

  let raf = 0, thumbTimer = 0;
  function scheduleDesign(withThumbs) {
    if (state.step !== 3) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      B.render($('#preview'), renderOpts({ scale: B.LAYOUTS[state.layout].w > 600 ? 0.5 : 0.7 }));
      const L = B.LAYOUTS[state.layout];
      $('#preview').dataset.shape = L.w > 600 ? 'wide' : 'strip';
      $('#printInfo').textContent = `${L.w} × ${L.h} px · ${L.w > 600 ? '4×6' : '2×6'} in at 300 dpi`;
    });
    if (withThumbs) {
      clearTimeout(thumbTimer);
      thumbTimer = setTimeout(renderThumbs, 120);
    }
  }

  function exportBlob() {
    const c = document.createElement('canvas');
    B.render(c, renderOpts({ scale: 1 }));
    return new Promise((res) => c.toBlob(res, 'image/png'));
  }

  function fileName() {
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    return `lumiere-booth-${state.template}-${stamp}.png`;
  }

  async function download() {
    const blob = await exportBlob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Saved. Enjoy your keepsake!');
  }

  async function share() {
    const blob = await exportBlob();
    const file = new File([blob], fileName(), { type: 'image/png' });
    try { await navigator.share({ files: [file], title: 'My Lumière Booth strip' }); }
    catch (e) { if (e.name !== 'AbortError') toast('Sharing is not available here. Use Download instead.'); }
  }

  function startOver() {
    state.photos = [];
    state.overlay = null;
    state.captionEdited = false;
    state.caption = B.TEMPLATES[state.template].caption;
    $('#captionInput').value = state.caption;
    $('#overlayName').textContent = '';
    $('#overlayClear').hidden = true;
    resizePhotos();
    renderTray();
    go(1);
  }

  /* ------------------------------------------------------------ theme */

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('lumiere-theme'); } catch (e) { /* storage unavailable */ }
    if (saved) document.documentElement.dataset.theme = saved;
    $('#themeToggle').addEventListener('click', () => {
      const dark = document.documentElement.dataset.theme === 'dark' ||
        (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
      const next = dark ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('lumiere-theme', next); } catch (e) { /* storage unavailable */ }
    });
  }

  /* ------------------------------------------------------------ wire up */

  function bind() {
    $$('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
    $$('[data-upload]').forEach((b) => b.addEventListener('click', () => pickPhotos(null)));
    $('#photoInput').addEventListener('change', (e) => onPhotos(e.target.files));
    $('#enableCam').addEventListener('click', startCamera);
    $('#shutter').addEventListener('click', startSession);
    $('#flipCam').addEventListener('click', () => {
      state.facing = state.facing === 'user' ? 'environment' : 'user';
      startCamera();
    });

    $$('#timerSeg button').forEach((b) => b.addEventListener('click', () => {
      state.timer = Number(b.dataset.timer);
      $$('#timerSeg button').forEach((x) => x.classList.toggle('on', x === b));
    }));
    $('#mirrorToggle').addEventListener('change', (e) => { state.mirror = e.target.checked; applyVideoStyle(); });
    $('#soundToggle').addEventListener('change', (e) => { state.sound = e.target.checked; });

    const cap = $('#captionInput');
    cap.value = state.caption;
    cap.addEventListener('input', () => {
      state.caption = cap.value;
      state.captionEdited = true;
      scheduleDesign(true);
    });
    const sub = $('#subInput');
    sub.value = state.sub;
    sub.addEventListener('input', () => { state.sub = sub.value; scheduleDesign(true); });
    $('#captionToggle').addEventListener('change', (e) => { state.showCaption = e.target.checked; scheduleDesign(true); });

    $('#overlayInput').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        state.overlay = await loadImage(f);
        const L = B.LAYOUTS[state.layout];
        const ratio = state.overlay.naturalWidth / state.overlay.naturalHeight;
        const warn = Math.abs(ratio - L.w / L.h) > 0.04 ? ' (its shape differs from this layout, so it will be stretched)' : '';
        $('#overlayName').textContent = `${f.name}${warn}`;
        $('#overlayClear').hidden = false;
        scheduleDesign(false);
      } catch (err) { toast(err.message); }
      e.target.value = '';
    });
    $('#overlayClear').addEventListener('click', () => {
      state.overlay = null;
      $('#overlayName').textContent = '';
      $('#overlayClear').hidden = true;
      scheduleDesign(false);
    });

    $('#downloadBtn').addEventListener('click', download);
    if (navigator.canShare && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] })) {
      $('#shareBtn').hidden = false;
      $('#shareBtn').addEventListener('click', share);
    }
    $('#startOver').addEventListener('click', startOver);

    document.addEventListener('keydown', (e) => {
      if (state.step !== 2 || e.code !== 'Space') return;
      if (/INPUT|TEXTAREA|BUTTON|SELECT/.test(document.activeElement.tagName)) return;
      e.preventDefault();
      startSession();
    });

    $('#year').textContent = new Date().getFullYear();
  }

  async function init() {
    initTheme();
    placeholders = B.makePlaceholders();
    resizePhotos();
    bind();
    buildLooks($('#filterList'));
    buildLooks($('#filterList2'));
    renderTray();
    updateCaptureUI();
    go(1);
    window.scrollTo(0, 0);

    // Draw once immediately, then again when the webfonts are ready.
    const drawAll = () => { buildHero(); buildGallery(); buildLayouts(); buildTemplatePicker(); scheduleDesign(true); };
    drawAll();
    try {
      await Promise.race([Promise.all(B.FONT_LOADS.map((f) => document.fonts.load(f))), sleep(4000)]);
      await document.fonts.ready;
    } catch (e) { /* fall back to system fonts */ }
    drawAll();
  }

  init();
})();
