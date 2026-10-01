import { useEffect, useRef } from 'react';
import * as Looks from '../lib/looks.js';
import { useArt } from '../context.js';

function LookThumb({ id }) {
  const ref = useRef(null);
  const { placeholders } = useArt();
  useEffect(() => {
    const src = Looks.apply(placeholders[0], id);
    ref.current.getContext('2d').drawImage(src, 100, 0, 600, 600, 0, 0, 72, 72);
  }, [id, placeholders]);
  return <canvas ref={ref} width={72} height={72} />;
}

export default function LookPicker({ look, onPick }) {
  return (
    <div className="filters">
      {Looks.LOOKS.map((l) => (
        <button key={l.id} type="button" className={'look' + (l.id === look ? ' on' : '')} onClick={() => onPick(l.id)}>
          <LookThumb id={l.id} />
          <span>{l.name}</span>
        </button>
      ))}
    </div>
  );
}
