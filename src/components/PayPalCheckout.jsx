import { useEffect, useRef, useState } from 'react';
import { DONATE } from '../donate.config.js';

let sdk = null;
function loadSdk() {
  sdk ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(DONATE.paypalClientId)}&currency=${DONATE.currency}&intent=capture`;
    s.dataset.namespace = 'paypalCheckout';
    s.onload = () => resolve(window.paypalCheckout);
    s.onerror = () => { sdk = null; reject(new Error('PayPal failed to load')); };
    document.head.appendChild(s);
  });
  return sdk;
}

/**
 * PayPal's own checkout buttons. The tip is captured inside PayPal's window and
 * `onPaid(dollars)` only runs once PayPal reports it COMPLETED. `fallback` renders
 * if the SDK can't load (offline, blocked).
 */
export default function PayPalCheckout({ amount, onPaid, onError, fallback }) {
  const box = useRef(null);
  const amountRef = useRef(amount);
  const paidRef = useRef(onPaid);
  const [failed, setFailed] = useState(false);
  amountRef.current = amount;
  paidRef.current = onPaid;

  useEffect(() => {
    let buttons;
    let alive = true;
    loadSdk().then((paypal) => {
      if (!alive || !box.current) return;
      buttons = paypal.Buttons({
        style: { layout: 'vertical', color: 'black', shape: 'pill', label: 'paypal', height: 48 },
        createOrder: (data, actions) => actions.order.create({
          purchase_units: [{
            description: 'Tip for Lumière Booth',
            amount: { value: amountRef.current.toFixed(2), currency_code: DONATE.currency },
          }],
        }),
        onApprove: async (data, actions) => {
          const order = await actions.order.capture();
          if (order.status !== 'COMPLETED') throw new Error(`Payment ${order.status}`);
          const paid = Number(order.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || amountRef.current);
          paidRef.current(paid);
        },
        onError: (err) => onError?.(err),
      });
      buttons.render(box.current);
    }).catch(() => alive && setFailed(true));
    return () => { alive = false; buttons?.close?.(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (failed) return fallback;
  return <div className="paypal-box" ref={box}></div>;
}
