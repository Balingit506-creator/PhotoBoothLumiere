import { useState } from 'react';
import { DONATE, PLATFORMS, WALLETS } from '../donate.config.js';
import { useToast } from '../context.js';
import WalletDialog from './WalletDialog.jsx';
import PayPalCheckout from './PayPalCheckout.jsx';
import { clearAdFree, grantAdFree, isAdFree } from '../lib/adfree.js';

const TIERS = [
  { amount: 3, icon: '☕', name: 'A coffee' },
  { amount: 5, icon: '🎞️', name: 'A roll of film' },
  { amount: 10, icon: '🥂', name: 'A toast' },
];

// With a Client ID, PayPal's own checkout confirms payment; otherwise PayPal.Me works on trust.
const checkout = !!DONATE.paypalClientId;
const configured = PLATFORMS.filter((p) => DONATE[p.key] && !(checkout && p.key === 'paypal'));
const primary = checkout ? null : configured.find((p) => p.key === 'paypal') || configured[0];
// Show every configured platform; before setup, show them all as a preview.
const listed = configured.length || checkout ? configured : PLATFORMS.filter((p) => p.key !== 'stripe');
const wallets = WALLETS.filter((w) => w.enabled && (w.number || w.qr));

export default function Support() {
  const toast = useToast();
  const [amount, setAmount] = useState(5);
  const [custom, setCustom] = useState('');
  const [selected, setSelected] = useState(5); // a tier amount, or 'custom'
  const [wallet, setWallet] = useState(null);
  // A PayPal/card tip turns ads off for good once PayPal confirms the payment.
  const [adFree] = useState(isAdFree);

  const linkFor = (p) => p.url(DONATE[p.key], amount);
  const notReady = (e) => {
    e.preventDefault();
    toast('Donations are coming soon. Thank you for wanting to help!');
  };
  const linkProps = (p) => (p && DONATE[p.key]
    ? { href: linkFor(p) }
    : { href: '#support', onClick: notReady });

  const goAdFree = () => {
    grantAdFree();
    toast('Payment received. Thank you! Ads are off for good ✦');
    setTimeout(() => location.reload(), 1800);
  };
  const adsBackOn = () => {
    clearAdFree();
    toast('Ads are back on. Reloading…');
    setTimeout(() => location.reload(), 1200);
  };

  const pickTier = (amt) => { setAmount(amt); setCustom(''); setSelected(amt); };
  const onCustom = (e) => {
    setCustom(e.target.value);
    const v = Math.round(Number(e.target.value));
    if (v >= 1) { setAmount(Math.min(v, 999)); setSelected('custom'); }
  };

  return (
    <section className="section" id="support">
      <div className="support">
        <div className="support-copy">
          <p className="eyebrow">Support the booth</p>
          <h2>Keep the flash <em>firing</em></h2>
          <p className="muted">Lumière Booth is free and never asks for your photos. If it made your day a little brighter, a small tip keeps it running and pays for new templates.</p>
          <ul className="support-perks">
            <li>Any tip turns off the ads for you, for good</li>
            <li>New seasonal templates every few months</li>
            <li>No watermarks, no sign‑ups, ever</li>
            <li>Hosting and upkeep paid for by people like you</li>
          </ul>
        </div>

        <div className="support-card">
          <span className="label">Choose an amount</span>
          <div className="tiers" role="radiogroup" aria-label="Donation amount">
            {TIERS.map((t) => (
              <button key={t.amount} type="button" className={'tier' + (selected === t.amount ? ' on' : '')} role="radio" aria-checked={selected === t.amount} onClick={() => pickTier(t.amount)}>
                <span className="tier-icon" aria-hidden="true">{t.icon}</span>
                <span className="tier-amt">${t.amount}</span>
                <span className="tier-name">{t.name}</span>
              </button>
            ))}
            <label className={'tier tier-custom' + (selected === 'custom' ? ' on' : '')} aria-checked={selected === 'custom'}>
              <span className="tier-amt">
                <span>$</span>
                <input type="number" min="1" max="999" step="1" placeholder="Other" inputMode="numeric" aria-label="Custom amount in dollars"
                  value={custom} onChange={onCustom} onFocus={() => { if (custom) setSelected('custom'); }} />
              </span>
              <span className="tier-name">Your choice</span>
            </label>
          </div>

          {adFree ? (
            <div className="adfree adfree-on" role="status">
              <span>✦ Ad‑free for life on this device. Thank you!</span>
              <button className="btn btn-link" type="button" onClick={adsBackOn}>Turn ads back on</button>
            </div>
          ) : (
            <p className="adfree-note">✦ Any tip = <strong>ad‑free for life</strong></p>
          )}

          {checkout ? (
            <PayPalCheckout amount={amount} onPaid={goAdFree}
              onError={() => toast('PayPal hit a snag. No money was taken. Please try again.')}
              fallback={<a className="btn btn-dark btn-block" target="_blank" rel="noopener"
                href={PLATFORMS[0].url(DONATE.paypal, amount)}>Donate ${amount}</a>} />
          ) : (
            <a className="btn btn-dark btn-block" target="_blank" rel="noopener" {...linkProps(primary)}>
              {primary && primary.key !== 'paypal' ? `Donate on ${primary.name}` : `Donate $${amount}`}
            </a>
          )}
          {listed.length + wallets.length > 0 && <div className="donate-divider"><span>or support on</span></div>}
          <div className="donate-links" hidden={!listed.length && !wallets.length}>
            {listed.map((p) => (
              <a key={p.key} className="btn btn-ghost btn-sm" target="_blank" rel="noopener" {...linkProps(p)}>{p.name}</a>
            ))}
            {wallets.map((w) => (
              <button key={w.key} className="btn btn-ghost btn-sm wallet-btn" type="button" style={{ '--wallet': w.color }}
                aria-haspopup="dialog" onClick={() => setWallet(w)}>
                <span className="wallet-dot" aria-hidden="true"></span>{w.name}
              </button>
            ))}
          </div>
          <WalletDialog wallet={wallet} onClose={() => setWallet(null)} />
          <p className="hint center">Payments are handled securely by the platform you choose. Lumière Booth never sees your card details.</p>
        </div>
      </div>
    </section>
  );
}
