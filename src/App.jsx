import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as B from './lib/booth.js';
import { sleep } from './lib/media.js';
import { ArtContext, ToastContext } from './context.js';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import HowItWorks from './components/HowItWorks.jsx';
import Gallery from './components/Gallery.jsx';
import Booth from './components/Booth.jsx';
import Features from './components/Features.jsx';
import Gear from './components/Gear.jsx';
import Support from './components/Support.jsx';
import Faq from './components/Faq.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  const [placeholders] = useState(() => B.makePlaceholders());
  const [fontsVersion, setFontsVersion] = useState(0);
  const [template, setTemplate] = useState('gatsby');
  const [tipNudge, setTipNudge] = useState(false);
  const [toastMsg, setToastMsg] = useState({ text: '', show: false });
  const toastTimer = useRef(0);

  const toast = useCallback((text) => {
    setToastMsg({ text, show: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg((t) => ({ ...t, show: false })), 3600);
  }, []);

  // Canvases draw once immediately, then again when the webfonts are ready.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await Promise.race([Promise.all(B.FONT_LOADS.map((f) => document.fonts.load(f))), sleep(4000)]);
        await document.fonts.ready;
      } catch (e) { /* fall back to system fonts */ }
      if (alive) setFontsVersion((v) => v + 1);
    })();
    return () => { alive = false; };
  }, []);

  const art = useMemo(() => ({ placeholders, fontsVersion }), [placeholders, fontsVersion]);

  const pickTemplate = useCallback((t) => {
    setTemplate(t.id);
    document.getElementById('booth').scrollIntoView({ behavior: 'smooth' });
    toast(`${t.name} selected`);
  }, [toast]);

  return (
    <ToastContext.Provider value={toast}>
      <ArtContext.Provider value={art}>
        <a className="skip" href="#booth">Skip to the booth</a>
        <Nav />
        <main>
          <Hero />
          <HowItWorks />
          <Gallery onUse={pickTemplate} />
          <Booth template={template} setTemplate={setTemplate} tipNudge={tipNudge} onDownloaded={() => setTipNudge(true)} />
          <Features />
          <Gear />
          <Support />
          <Faq />
        </main>
        <Footer />
        <div className={'toast' + (toastMsg.show ? ' show' : '')} role="status" aria-live="polite">{toastMsg.text}</div>
      </ArtContext.Provider>
    </ToastContext.Provider>
  );
}
