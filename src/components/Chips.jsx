import { CATEGORIES } from '../lib/booth.js';

export default function Chips({ active, onPick, className = 'chips', ...props }) {
  return (
    <div className={className} {...props}>
      {CATEGORIES.map((c) => (
        <button key={c.id} type="button" className={'chip' + (c.id === active ? ' on' : '')} aria-pressed={c.id === active} onClick={() => onPick(c.id)}>
          {c.name}
        </button>
      ))}
    </div>
  );
}
