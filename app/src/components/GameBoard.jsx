import { useState, useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
import CharacterCard from './CharacterCard';
import WinModal from './WinModal';
import { LogOut, Eye, EyeOff, Target } from 'lucide-react';

// ─── Score pip ─────────────────────────────────────────────────────────────
function ScorePip({ filled, color }) {
  return (
    <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
      filled
        ? `${color} scale-110`
        : 'border-white/20 bg-transparent'
    }`} />
  );
}

// ─── Score Display nella topbar ────────────────────────────────────────────
function ScoreBar({ matchScores, matchTarget, gameData }) {
  if (!gameData) return null;
  const { myName, opponentName } = gameData;
  const myPts  = matchScores[myName]       || 0;
  const oppPts = matchScores[opponentName] || 0;

  return (
    <div className="flex items-center gap-2">
      {/* Miei punti (pips) */}
      <div className="flex gap-0.5 items-center">
        {Array.from({ length: matchTarget }).map((_, i) => (
          <ScorePip key={i} filled={i < myPts}  color="bg-indigo-400 border-indigo-400" />
        ))}
      </div>

      {/* Punteggio numerico */}
      <span className="text-white font-black text-base tabular-nums">
        {myPts}
        <span className="text-white/30 mx-1">–</span>
        {oppPts}
      </span>

      {/* Punti avversario */}
      <div className="flex gap-0.5 items-center">
        {Array.from({ length: matchTarget }).map((_, i) => (
          <ScorePip key={i} filled={i < oppPts} color="bg-red-400 border-red-400" />
        ))}
      </div>
    </div>
  );
}

// ─── Guess Modal ────────────────────────────────────────────────────────────
function GuessModal({ characters, opponentName, onConfirm, onClose }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="fixed inset-0 bg-black/85 z-40 flex items-end">
      <div className="bg-slate-800 w-full rounded-t-3xl animate-slide-up border-t border-white/10">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-4" />
        <div className="px-4 pb-2">
          <h3 className="text-white font-bold text-lg text-center">
            🎯 Chi è il personaggio di {opponentName}?
          </h3>
          <p className="text-white/45 text-sm text-center mt-1 mb-4">
            {characters.length} candidat{characters.length === 1 ? 'o' : 'i'} rimanent{characters.length === 1 ? 'e' : 'i'}
          </p>
        </div>

        <div className="overflow-y-auto px-4" style={{ maxHeight: '52vh' }}>
          <div className="grid grid-cols-4 gap-2 pb-4">
            {characters.map(char => (
              <CharacterCard
                key={char.id}
                character={char}
                size="small"
                selectable
                selected={selected === char.id}
                onClick={() => setSelected(prev => prev === char.id ? null : char.id)}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 p-4 bg-slate-900/50 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white/80 font-medium py-3.5 rounded-2xl transition-all"
          >
            Annulla
          </button>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition-all"
          >
            Conferma!
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main GameBoard ─────────────────────────────────────────────────────────
export default function GameBoard() {
  const { gameData, secretCharacter, claimWin, gameOver, goHome, phase, matchScores, matchTarget } = useGame();
  const [eliminated, setEliminated] = useState(new Set());
  const [showGuess, setShowGuess]   = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  if (!gameData) return null;
  const { characters, opponentName, roundNumber } = gameData;

  const toggleCard = (id) => {
    setEliminated(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const guessableChars = useMemo(() => {
    const active = characters.filter(c => !eliminated.has(c.id));
    return active.length > 0 ? active : characters;
  }, [characters, eliminated]);

  const handleConfirmGuess = (charId) => {
    claimWin(charId);
    setShowGuess(false);
  };

  const remaining = characters.length - eliminated.size;
  const pct       = Math.round((eliminated.size / Math.max(characters.length, 1)) * 100);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="bg-slate-800 px-3 py-2 flex items-center gap-2 border-b border-white/10 sticky top-0 z-10">
        {/* Avversario + round */}
        <div className="flex-1 min-w-0">
          <p className="text-white/40 text-[10px] leading-none">vs {opponentName}</p>
          <p className="text-indigo-400 text-xs font-semibold leading-tight">Round {roundNumber}</p>
        </div>

        {/* Score centrale */}
        <ScoreBar matchScores={matchScores} matchTarget={matchTarget} gameData={gameData} />

        {/* Progress + exit */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-white/50 text-[10px]">{remaining} rimasti</p>
            <div className="w-14 h-1 bg-slate-700 rounded-full mt-0.5 overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <button onClick={goHome} className="p-1.5 text-white/30 hover:text-white/70 transition-colors rounded-lg hover:bg-white/10">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* ── Card grid ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {characters.map(char => (
            <CharacterCard
              key={char.id}
              character={char}
              isEliminated={eliminated.has(char.id)}
              onClick={() => toggleCard(char.id)}
            />
          ))}
        </div>
        <div className="h-4" />
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────── */}
      <div className="bg-slate-800 border-t border-white/10 p-3 flex items-center gap-3">
        {/* Personaggio segreto */}
        <div className="flex-shrink-0">
          <p className="text-white/35 text-[10px] mb-1 leading-none font-medium">Il tuo segreto</p>
          <button
            onClick={() => setShowSecret(v => !v)}
            className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-700 flex items-center justify-center border border-white/10 active:scale-90 transition-all"
          >
            {showSecret ? (
              <img src={secretCharacter?.imageUrl} alt={secretCharacter?.name} className="w-full h-full object-cover" />
            ) : (
              <EyeOff size={20} className="text-yellow-400" />
            )}
            <div className="absolute bottom-0.5 right-0.5 bg-slate-900/80 rounded-full p-0.5">
              <Eye size={8} className="text-white/50" />
            </div>
          </button>
          {showSecret && (
            <p className="text-yellow-400 text-[10px] text-center mt-1 font-semibold max-w-[48px] truncate">
              {secretCharacter?.name}
            </p>
          )}
        </div>

        <div className="flex-1" />

        {/* Bottone Indovina */}
        <button
          onClick={() => setShowGuess(true)}
          className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold px-5 py-3.5 rounded-2xl flex items-center gap-2 text-sm transition-all shadow-lg shadow-emerald-900/40"
        >
          <Target size={18} strokeWidth={2.5} />
          Indovina!
        </button>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────── */}
      {showGuess && (
        <GuessModal
          characters={guessableChars}
          opponentName={opponentName}
          onConfirm={handleConfirmGuess}
          onClose={() => setShowGuess(false)}
        />
      )}

      {phase === 'gameover' && <WinModal />}
    </div>
  );
}
