import { useEffect } from 'react';
import { ADSTERRA_SOCIAL_BAR } from '../ads.config.js';
import { isAdFree } from '../lib/adfree.js';

/** Adsterra Social Bar: one script that draws its own floating ads, so nothing renders here. */
export default function SocialBar() {
  useEffect(() => {
    const src = isAdFree() ? '' : ADSTERRA_SOCIAL_BAR; // tippers turned ads off
    // Load once; StrictMode runs effects twice in development.
    if (!src || document.querySelector(`script[src="${src}"]`)) return;
    const s = document.createElement('script');
    s.async = true;
    s.dataset.cfasync = 'false';
    s.src = src;
    document.body.appendChild(s);
  }, []);
  return null;
}
