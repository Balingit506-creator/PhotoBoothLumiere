import { Brand } from './Nav.jsx';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <Brand />
        <p className="muted">Made for moments that matter.</p>
        <p className="muted small">© {new Date().getFullYear()} Lumière Booth</p>
      </div>
    </footer>
  );
}
