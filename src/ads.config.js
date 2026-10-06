/*
 * ─── SET UP YOUR ADS HERE ──────────────────────────────────────────────
 * Adsterra Native Banner: copy the two values from the code Adsterra gives you.
 *   src:        the script's src  (https://…/<key>/invoke.js style URL)
 *   container:  the div's id      (container-<key>)
 * Leave src empty to hide the ad spot entirely.
 */
export const ADSTERRA_NATIVE = {
  src: 'https://bauval.org/21/17295f1b0dd18be6e916e1dc67402212',
  container: 'container-17295f1b0dd18be6e916e1dc67402212',
};

/*
 * Adsterra Social Bar: paste the script's src from the code Adsterra gives you,
 * e.g. '//pl12345678.example.com/ab/cd/ef/abcdef0123456789.js'.
 * It loads once on every page view. Leave it '' to turn it off.
 */
export const ADSTERRA_SOCIAL_BAR = 'https://bauval.org/14/527e525e84541e63864c02dc23c5d6d1';

/*
 * Adsterra Banner: create a Banner unit in Adsterra (one 728x90 for desktop and
 * one 320x50 for phones), then copy from each code snippet:
 *   key:  the 'key' value inside atOptions
 *   src:  the second script's src  (…/<key>/invoke.js)
 * A slot with an empty key is skipped; with both empty the banner space is hidden.
 */
export const ADSTERRA_BANNER = {
  desktop: { key: '2535bd619c6e708a67dfc9b3186a438a', src: 'https://bauval.org/22/2535bd619c6e708a67dfc9b3186a438a', width: 728, height: 90 },
  mobile: { key: '88eaef5f3df460d0fd1b62980d420199', src: 'https://bauval.org/22/88eaef5f3df460d0fd1b62980d420199', width: 320, height: 50 },
};

/*
 * Adsterra Smartlink: the link from your Adsterra dashboard. Shown as one small
 * "Sponsored" line under the Download button. Leave it '' to turn it off.
 */
export const ADSTERRA_SMARTLINK = 'https://araplhn.org/4/3b7652a34e57aee9842c7d4142d9856f';
