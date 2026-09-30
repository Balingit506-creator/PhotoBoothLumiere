/* Lumière Booth — donation section. */
(function () {
  'use strict';

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
  const DONATE = {
    currency: 'USD',
    paypal: '',
    kofi: '',
    buymeacoffee: '',
    github: '',
    stripe: '',
  };

  const PLATFORMS = [
    { key: 'paypal', name: 'PayPal', url: (v, amt) => `https://paypal.me/${encodeURIComponent(v)}/${amt}${DONATE.currency}` },
    { key: 'kofi', name: 'Ko‑fi', url: (v) => `https://ko-fi.com/${encodeURIComponent(v)}` },
    { key: 'buymeacoffee', name: 'Buy Me a Coffee', url: (v) => `https://buymeacoffee.com/${encodeURIComponent(v)}` },
    { key: 'github', name: 'GitHub Sponsors', url: (v) => `https://github.com/sponsors/${encodeURIComponent(v)}` },
    { key: 'stripe', name: 'Card (Stripe)', url: (v) => v },
  ];

  const $ = (s) => document.querySelector(s);
  const configured = PLATFORMS.filter((p) => DONATE[p.key]);
  let amount = 5;

  function notReady(e) {
    e.preventDefault();
    const t = $('#toast');
    if (!t) return;
    t.textContent = 'Donations are coming soon. Thank you for wanting to help!';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3200);
  }

  function linkFor(p) { return p.url(DONATE[p.key], amount); }

  function updatePrimary() {
    const btn = $('#donatePrimary');
    const primary = configured.find((p) => p.key === 'paypal') || configured[0];
    btn.textContent = primary && primary.key !== 'paypal' ? `Donate on ${primary.name}` : `Donate $${amount}`;
    if (primary) { btn.href = linkFor(primary); btn.onclick = null; }
    else { btn.href = '#support'; btn.onclick = notReady; }
  }

  function buildLinks() {
    const wrap = $('#donateLinks');
    // Show every configured platform; before setup, show them all as a preview.
    const list = configured.length ? configured : PLATFORMS.filter((p) => p.key !== 'stripe');
    wrap.innerHTML = '';
    list.forEach((p) => {
      const a = document.createElement('a');
      a.className = 'btn btn-ghost btn-sm';
      a.textContent = p.name;
      a.target = '_blank';
      a.rel = 'noopener';
      if (DONATE[p.key]) a.href = linkFor(p);
      else { a.href = '#support'; a.addEventListener('click', notReady); }
      wrap.appendChild(a);
    });
  }

  function select(el) {
    document.querySelectorAll('.tier').forEach((t) => {
      const on = t === el;
      t.classList.toggle('on', on);
      t.setAttribute('aria-checked', String(on));
    });
  }

  function init() {
    const custom = $('#customAmount');
    document.querySelectorAll('.tier[data-amount]').forEach((t) => {
      t.setAttribute('aria-checked', String(t.classList.contains('on')));
      t.addEventListener('click', () => {
        amount = Number(t.dataset.amount);
        custom.value = '';
        select(t);
        updatePrimary(); buildLinks();
      });
    });
    custom.addEventListener('input', () => {
      const v = Math.round(Number(custom.value));
      if (v >= 1) {
        amount = Math.min(v, 999);
        select(custom.closest('.tier'));
        updatePrimary(); buildLinks();
      }
    });
    custom.addEventListener('focus', () => { if (custom.value) select(custom.closest('.tier')); });

    // A gentle nudge in the design step once someone has saved a strip.
    const dl = $('#downloadBtn');
    if (dl) dl.addEventListener('click', () => { $('#tipNudge').hidden = false; });

    updatePrimary();
    buildLinks();
  }

  init();
})();
