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

/*
 * GCash and Maya have no public pay links, so their buttons open a card with
 * your QR code, account name and mobile number (with a copy button).
 *   number:  the mobile number registered to the wallet, e.g. '0917 123 4567'
 *   accountName: the account name as the app shows it, e.g. 'Juaren B.'
 *   qr:      your "Receive money" QR image saved in public/donate/,
 *            e.g. 'donate/gcash-qr.png' (no leading slash). Optional.
 * A wallet appears on the site once its number or QR is filled in.
 */
export const WALLETS = [
  { key: 'gcash', name: 'GCash', color: '#007dfe', number: '', accountName: 'Juaren B.', qr: 'donate/gcash-qr.png' },
  { key: 'maya', name: 'Maya', color: '#00b14f', number: '', accountName: 'Juaren B.', qr: 'donate/maya-qr.png' },
];

export const PLATFORMS = [
  { key: 'paypal', name: 'PayPal', url: (v, amt) => `https://paypal.me/${encodeURIComponent(v)}/${amt}${DONATE.currency}` },
  { key: 'kofi', name: 'Ko‑fi', url: (v) => `https://ko-fi.com/${encodeURIComponent(v)}` },
  { key: 'buymeacoffee', name: 'Buy Me a Coffee', url: (v) => `https://buymeacoffee.com/${encodeURIComponent(v)}` },
  { key: 'github', name: 'GitHub Sponsors', url: (v) => `https://github.com/sponsors/${encodeURIComponent(v)}` },
  { key: 'stripe', name: 'Card (Stripe)', url: (v) => v },
];
