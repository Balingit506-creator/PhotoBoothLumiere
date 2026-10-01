const FEATURES = [
  ['Private by design', 'Your camera feed and photos never leave your device. There are no uploads, no accounts and no servers involved.'],
  ['Print‑perfect', 'Strips export at 600×1800 (2×6 in) and prints at 1200×1800 (4×6 in), both at 300 dpi, ready for any photo lab.'],
  ['Film looks', 'Eight hand‑tuned looks, from luminous Natural to moody Noir, applied the same way on screen and on paper.'],
  ['Your own artwork', 'Designed a template for your event? Drop in a transparent PNG and the booth frames every strip with it.'],
];

export default function Features() {
  return (
    <section className="section features">
      {FEATURES.map(([title, text]) => (
        <div className="feature" key={title}><h3>{title}</h3><p>{text}</p></div>
      ))}
    </section>
  );
}
