const STEPS = [
  ['Choose a layout', 'A classic 3‑frame strip, a four‑frame strip, a double print, a postcard grid or a single portrait.'],
  ['Strike a pose', 'A gentle countdown, a soft flash, and the booth snaps every frame for you. Or upload from your gallery.'],
  ['Make it yours', 'Pick a template, a film look and write your own caption. Bring your own PNG overlay if you like.'],
  ['Keep it forever', 'Download a full‑resolution print file, or share it straight from your phone.'],
];

export default function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="section-head">
        <p className="eyebrow">How it works</p>
        <h2>Four steps to a keepsake</h2>
      </div>
      <ol className="steps">
        {STEPS.map(([title, text], i) => (
          <li key={title}><span className="num">{String(i + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{text}</p></li>
        ))}
      </ol>
    </section>
  );
}
