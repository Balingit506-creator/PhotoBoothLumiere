import { useEffect, useRef } from 'react';
import { useToast } from '../context.js';

// GCash / Maya card: QR code, account name and a copyable mobile number.
export default function WalletDialog({ wallet, onClose }) {
  const ref = useRef(null);
  const toast = useToast();

  useEffect(() => {
    const d = ref.current;
    if (wallet && !d.open) d.showModal();
    if (!wallet && d.open) d.close();
  }, [wallet]);

  const copy = async () => {
    const digits = wallet.number.replace(/\s+/g, '');
    try {
      await navigator.clipboard.writeText(digits);
      toast(`${wallet.name} number copied`);
    } catch (e) {
      toast(`${wallet.name}: ${wallet.number}`);
    }
  };

  return (
    <dialog ref={ref} className="wallet-dialog" onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) ref.current.close(); }}
      style={wallet ? { '--wallet': wallet.color } : undefined} aria-labelledby="wallet-title">
      {wallet && (
        <div className="wallet-card">
          <button className="icon-btn wallet-close" type="button" aria-label="Close" onClick={() => ref.current.close()}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
          <span className="wallet-badge">{wallet.name}</span>
          <h3 id="wallet-title">Send a tip with {wallet.name}</h3>
          {wallet.qr && <img className="wallet-qr" src={wallet.qr} alt={`${wallet.name} QR code`} width="220" height="220" />}
          {wallet.accountName && <p className="wallet-name">{wallet.accountName}</p>}
          {wallet.number && (
            <div className="wallet-number">
              <span>{wallet.number}</span>
              <button className="btn btn-ghost btn-sm" type="button" onClick={copy}>Copy</button>
            </div>
          )}
          {wallet.qr && (
            <a className="btn btn-ghost btn-sm" href={wallet.qr} download={`${wallet.key}-qr.png`}>Save QR image</a>
          )}
          <ol className="wallet-steps">
            <li>Open the {wallet.name} app.</li>
            {wallet.qr && <li>Scan the QR code. On this phone? Save the image, then upload it from your gallery in the app’s QR scanner.</li>}
            {wallet.number && <li>{wallet.qr ? 'Or choose Send money and enter the number above.' : 'Choose Send money and enter the number above.'}</li>}
            <li>Send any amount you like. Salamat! 💛</li>
          </ol>
        </div>
      )}
    </dialog>
  );
}
