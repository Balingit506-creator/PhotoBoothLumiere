/*
 * ─── SET UP YOUR DONATION LINKS HERE ───────────────────────────────────
 * Fill in the accounts you use; leave the rest as ''.
 *   paypal:        your PayPal.Me name   (https://paypal.me/<name>)  → gets the chosen amount
 *   kofi:          your Ko-fi page name  (https://ko-fi.com/<name>)
 *   buymeacoffee:  your BMC page name    (https://buymeacoffee.com/<name>)
 *   github:        your GitHub username  (https://github.com/sponsors/<name>)
 *   stripe:        a full Stripe Payment Link URL (https://buy.stripe.com/...)
 * The big button uses PayPal when set (it can pre-fill the amount), otherwise
 * the first platform you filled in.
 */
export const DONATE = {
  currency: 'USD',
  paypal: 'JuarenBalingit',
  kofi: '',
  buymeacoffee: '',
  github: '',
  stripe: '',
};

export const PLATFORMS = [
  { key: 'paypal', name: 'PayPal', url: (v, amt) => `https://paypal.me/${encodeURIComponent(v)}/${amt}${DONATE.currency}` },
  { key: 'kofi', name: 'Ko‑fi', url: (v) => `https://ko-fi.com/${encodeURIComponent(v)}` },
  { key: 'buymeacoffee', name: 'Buy Me a Coffee', url: (v) => `https://buymeacoffee.com/${encodeURIComponent(v)}` },
  { key: 'github', name: 'GitHub Sponsors', url: (v) => `https://github.com/sponsors/${encodeURIComponent(v)}` },
  { key: 'stripe', name: 'Card (Stripe)', url: (v) => v },
];
