import { GEAR, gearUrl } from '../affiliate.config.js';

export default function Gear() {
  return (
    <section className="section" id="gear">
      <div className="section-head center">
        <p className="eyebrow">Recommended gear</p>
        <h2>Bring the booth home</h2>
        <p className="muted">A few favourites for brighter shots and real prints you can hold.</p>
      </div>
      <ul className="gear">
        {GEAR.map((g) => (
          <li key={g.name}>
            <a className="gear-card" href={gearUrl(g)} target="_blank" rel="sponsored noopener">
              <span className="gear-icon" aria-hidden="true">{g.icon}</span>
              <h3>{g.name}</h3>
              <p>{g.text}</p>
              <span className="gear-link">View on Amazon <span aria-hidden="true">↗</span></span>
            </a>
          </li>
        ))}
      </ul>
      <p className="hint center gear-note">As an Amazon Associate, Lumière Booth earns from qualifying purchases, at no extra cost to you.</p>
    </section>
  );
}
