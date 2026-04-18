import { useState } from 'react';

/**
 * Carta con animazione flip 3D.
 *
 * Props:
 *  character    – { id, name, imageUrl }
 *  isEliminated – se true la carta si capovolge (backface = X rossa)
 *  onClick      – callback al tap (toggle eliminazione)
 *  size         – 'normal' (aspect 3:4) | 'small' (aspect 1:1)
 *  selected     – bordo giallo (modal indovina)
 *  selectable   – disabilita il flip, abilita la selezione
 */
export default function CharacterCard({
  character,
  isEliminated = false,
  onClick,
  size       = 'normal',
  selected   = false,
  selectable = false,
}) {
  const [imgError, setImgError] = useState(false);
  const isSmall = size === 'small';

  // Il flip avviene solo per le carte normali del tabellone (non nel modal)
  const shouldFlip = isEliminated && !selectable;

  return (
    <div
      onClick={onClick}
      className={[
        'card-perspective',
        isSmall ? 'aspect-square' : 'aspect-[3/4]',
        'relative select-none',
        onClick ? 'cursor-pointer' : '',
      ].join(' ')}
    >
      {/* ── Flipper ─────────────────────────────────────────────── */}
      <div className={[
        'card-inner rounded-xl',
        shouldFlip ? 'is-flipped' : '',
        // selezione nel modal (ring + scale)
        selected   ? 'scale-95'   : '',
        // hover interattivo nel modal
        selectable && !selected ? 'opacity-70 transition-opacity hover:opacity-100' : '',
        // tap feedback nel tabellone
        !shouldFlip && !selectable && onClick ? 'active:scale-90 transition-transform' : '',
      ].join(' ')}>

        {/* ═══ FACCIA ANTERIORE ═══════════════════════════════════ */}
        <div className="card-face flex flex-col bg-slate-800">
          {/* Immagine */}
          <div className={`${isSmall ? 'flex-1' : 'flex-[4]'} min-h-0 bg-slate-700`}>
            {!imgError && character.imageUrl ? (
              <img
                src={character.imageUrl}
                alt={character.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-600 to-slate-800 text-3xl">
                👤
              </div>
            )}
          </div>
          {/* Nome */}
          <div className="flex-[1] flex items-center justify-center px-1 py-0.5 bg-slate-800 min-h-0">
            <p className={`font-medium truncate text-white/90 leading-tight ${isSmall ? 'text-[9px]' : 'text-[11px]'}`}>
              {character.name}
            </p>
          </div>
        </div>

        {/* ═══ FACCIA POSTERIORE (carta eliminata) ════════════════ */}
        <div className="card-back card-face flex flex-col items-center justify-center gap-0.5 bg-slate-950 border border-red-900/30">
          {/* X rossa */}
          <svg
            viewBox="0 0 40 40"
            className={`text-red-600/75 ${isSmall ? 'w-8 h-8' : 'w-10 h-10'}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={4.5}
            strokeLinecap="round"
          >
            <line x1="8"  y1="8"  x2="32" y2="32" />
            <line x1="32" y1="8"  x2="8"  y2="32" />
          </svg>
          {/* Nome sbiadito */}
          <p className={`text-red-500/40 font-medium truncate px-1 ${isSmall ? 'text-[8px]' : 'text-[10px]'}`}>
            {character.name}
          </p>
        </div>
      </div>

      {/* ── Ring di selezione (modal indovina) ──────────────────── */}
      {selected && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900 pointer-events-none" />
      )}

      {/* ── Checkmark selezione ──────────────────────────────────── */}
      {selected && (
        <div className="absolute top-1 right-1 z-10 bg-yellow-400 rounded-full p-0.5 pointer-events-none shadow-md">
          <svg viewBox="0 0 24 24" className="w-3 h-3 text-slate-900" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  );
}
