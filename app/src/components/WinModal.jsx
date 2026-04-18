import { useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { RotateCcw, Home, ChevronRight, ImageOff, Trophy } from 'lucide-react';

// ─── Minicard personaggio rivelato ─────────────────────────────────────────
function RevealCard({ label, character, ring }) {
  const [ok, setOk] = useState(true);
  if (!character) return null;
  return (
    <div className="text-center animate-pop-in">
      <p className="text-white/40 text-xs mb-2 font-medium">{label}</p>
      <div className={`w-20 h-24 rounded-2xl overflow-hidden mx-auto border-2 ${ring} bg-slate-700 flex items-center justify-center`}>
        {ok && character.imageUrl ? (
          <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" onError={() => setOk(false)} />
        ) : (
          <ImageOff size={24} className="text-slate-500" />
        )}
      </div>
      <p className="text-white text-sm font-semibold mt-1.5 max-w-[80px] mx-auto truncate">
        {character.name}
      </p>
    </div>
  );
}

// ─── Punteggio a pips ──────────────────────────────────────────────────────
function MatchScore({ scores, matchTarget, highlightName }) {
  const players = Object.entries(scores);
  return (
    <div className="flex items-center justify-center gap-4 py-3 px-4 bg-white/5 rounded-2xl">
      {players.map(([name, pts]) => (
        <div key={name} className="text-center">
          <p className={`text-xs font-semibold mb-1.5 truncate max-w-[70px] ${name === highlightName ? 'text-yellow-400' : 'text-white/50'}`}>
            {name}
          </p>
          <div className="flex gap-1 justify-center">
            {Array.from({ length: matchTarget }).map((_, i) => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
                i < pts
                  ? (name === highlightName ? 'bg-yellow-400 border-yellow-400' : 'bg-indigo-500 border-indigo-500')
                  : 'bg-transparent border-white/20'
              }`} />
            ))}
          </div>
          <p className="text-2xl font-black text-white mt-1">{pts}</p>
        </div>
      ))}
    </div>
  );
}

// ─── WinModal ──────────────────────────────────────────────────────────────
export default function WinModal() {
  const { gameOver, socketId, myCharacter, matchScores, matchTarget, requestRematch, goHome } = useGame();
  if (!gameOver) return null;

  const { claimerId, claimerName, isCorrect, opponentSecret, roundWinnerName, isMatchOver, matchWinnerName, roundNumber } = gameOver;

  const iAmClaimer    = claimerId    === socketId;
  const iAmRoundWinner = roundWinnerName === (iAmClaimer ? claimerName : Object.keys(matchScores).find(n => n !== claimerName));
  const iAmMatchWinner = matchWinnerName && matchWinnerName !== claimerName
    ? false
    : matchWinnerName === claimerName && iAmClaimer;

  // ── Testo del risultato ──────────────────────────────────────────
  let emoji, title, subtitle;

  if (isMatchOver) {
    const iWonMatch = matchWinnerName && matchScores[matchWinnerName] &&
      Object.keys(matchScores).find(n => n === matchWinnerName) &&
      socketId === gameOver.claimerId
        ? (isCorrect && roundWinnerName === claimerName) || (!isCorrect && roundWinnerName !== claimerName)
        : false;

    // Semplifica: confronta il nome del vincitore del match con il nome del giocatore corrente
    const myName    = Object.entries(matchScores).length > 0
      ? Object.keys(matchScores).find(n => n !== claimerName) ?? ''
      : '';
    const isMine    = matchWinnerName === claimerName ? iAmClaimer : !iAmClaimer;

    if (isMine) {
      emoji    = '🏆';
      title    = 'Hai vinto la Partita!';
      subtitle = `Punteggio finale: ${matchScores[matchWinnerName] ?? '?'}–${Object.values(matchScores).find((_, i) => Object.keys(matchScores)[i] !== matchWinnerName) ?? '?'}`;
    } else {
      emoji    = '😢';
      title    = `${matchWinnerName} vince la Partita!`;
      subtitle = `Meglio fortuna la prossima volta!`;
    }
  } else {
    // Solo il round è finito
    const roundWon = roundWinnerName === claimerName ? iAmClaimer : !iAmClaimer;
    if (roundWon) {
      emoji    = isCorrect ? '🎯' : '🤦';
      title    = isCorrect ? `Round ${roundNumber} — Hai vinto!` : `Round ${roundNumber} — L'avversario ha sbagliato!`;
      subtitle = isCorrect ? 'Hai indovinato il personaggio segreto!' : `${claimerName} ha sbagliato la risposta — punto a te!`;
    } else {
      emoji    = isCorrect ? '😮' : '🎉';
      title    = isCorrect ? `Round ${roundNumber} — Hai perso!` : `Round ${roundNumber} — Hai vinto!`;
      subtitle = isCorrect ? `${claimerName} ha indovinato il tuo personaggio!` : 'Il tuo avversario ha sbagliato la risposta!';
    }
  }

  // ── Sfondo glow ─────────────────────────────────────────────────
  const bgGlow = isMatchOver
    ? (matchWinnerName === claimerName ? (iAmClaimer ? 'from-yellow-900/30' : 'from-slate-900/60')
                                       : (!iAmClaimer ? 'from-yellow-900/30' : 'from-slate-900/60'))
    : 'from-slate-900/40';

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className={`bg-gradient-to-b ${bgGlow} to-slate-800 rounded-3xl p-6 w-full max-w-sm border border-white/10 shadow-2xl animate-pop-in`}>

        {/* Emoji */}
        <div className="text-6xl text-center mb-3 select-none">{emoji}</div>

        {/* Titolo + sottotitolo */}
        <h2 className="text-2xl font-extrabold text-white text-center mb-1">{title}</h2>
        <p className="text-white/55 text-sm text-center mb-5 leading-relaxed">{subtitle}</p>

        {/* Punteggio multi-round */}
        {Object.keys(matchScores).length > 0 && (
          <div className="mb-5">
            <MatchScore
              scores={matchScores}
              matchTarget={matchTarget}
              highlightName={roundWinnerName}
            />
            {!isMatchOver && (
              <p className="text-center text-white/40 text-xs mt-2">
                Prima a {matchTarget} round — continua!
              </p>
            )}
          </div>
        )}

        {/* Rivelazione personaggi */}
        {(opponentSecret || myCharacter) && (
          <div className="flex justify-center gap-6 mb-6">
            {opponentSecret && (
              <RevealCard
                label="Personaggio avversario"
                character={opponentSecret}
                ring="border-indigo-500"
              />
            )}
            {myCharacter && (
              <RevealCard
                label="Il tuo personaggio"
                character={myCharacter}
                ring="border-yellow-500"
              />
            )}
          </div>
        )}

        {/* CTA */}
        <div className="space-y-3">
          <button
            onClick={requestRematch}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2.5 text-lg transition-all shadow-lg shadow-indigo-900/50"
          >
            {isMatchOver ? (
              <><RotateCcw size={20} strokeWidth={2.5} /> Nuova Partita</>
            ) : (
              <>Round {(roundNumber || 1) + 1} <ChevronRight size={20} strokeWidth={2.5} /></>
            )}
          </button>
          <button
            onClick={goHome}
            className="w-full text-white/35 hover:text-white/70 py-2 text-sm flex items-center justify-center gap-1.5 transition-colors"
          >
            <Home size={14} /> Torna al Menu
          </button>
        </div>

        {/* Badge match winner */}
        {isMatchOver && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-900 font-black text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
            <Trophy size={13} /> PARTITA TERMINATA
          </div>
        )}
      </div>
    </div>
  );
}
