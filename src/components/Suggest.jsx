import { useState } from 'react';
import { SUGGEST_ENDPOINT } from '../suggest.config.js';
import { useToast } from '../context.js';

const TOPICS = ['Template idea', 'New feature', 'Something broke', 'Other'];

export default function Suggest() {
  const toast = useToast();
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    if (!SUGGEST_ENDPOINT) {
      toast('The suggestion box opens soon. Thank you for the idea!');
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch(SUGGEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          topic, message: message.trim(), email: email.trim() || undefined,
          _subject: `Lumière Booth suggestion: ${topic}`,
          _gotcha: e.target.elements._gotcha.value,
        }),
      });
      if (!res.ok) throw new Error(res.status);
      setStatus('sent');
      setMessage('');
      setEmail('');
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <section className="section" id="suggest">
      <div className="suggest">
        {status === 'sent' ? (
          <div className="suggest-done" role="status">
            <span className="suggest-icon" aria-hidden="true">💌</span>
            <h3>Thank you!</h3>
            <p className="muted">Your suggestion landed safely. Every idea gets read.</p>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setStatus('idle')}>Send another</button>
          </div>
        ) : (
          <>
            <div className="suggest-copy">
              <p className="eyebrow">Suggestion box</p>
              <h2>Got an <em>idea?</em></h2>
              <p className="muted">A template you’d love, a feature you’re missing, or a bug. Every idea is read.</p>
            </div>
            <form onSubmit={submit}>
              <div className="chips" role="radiogroup" aria-label="Topic">
                {TOPICS.map((t) => (
                  <button key={t} type="button" role="radio" aria-checked={t === topic}
                    className={'chip' + (t === topic ? ' on' : '')} onClick={() => setTopic(t)}>{t}</button>
                ))}
              </div>
              <label className="field">
                <span className="label">Your idea</span>
                <span className="suggest-text">
                  <textarea className="input" rows={4} maxLength={600} required
                    placeholder="e.g. A wedding template in sage green, or a four-photo grid…"
                    value={message} onChange={(e) => setMessage(e.target.value)} />
                  <span className="suggest-count">{message.length} / 600</span>
                </span>
              </label>
              <label className="field">
                <span className="label">Email (optional, for a reply)</span>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" className="suggest-trap" aria-hidden="true" />
              {status === 'error' && <p className="suggest-error small">That didn’t send. Please try again in a moment.</p>}
              <button className="btn btn-dark suggest-send" type="submit" disabled={status === 'sending' || !message.trim()}>
                {status === 'sending' ? 'Sending…' : 'Send suggestion'}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
