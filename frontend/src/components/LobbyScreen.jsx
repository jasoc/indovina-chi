import { useState } from 'react';
import { useGame } from '../contexts/GameContext';
import AdminPanel from './AdminPanel';
import Scoreboard from './Scoreboard';
import { Copy, Check, Users, Play, Settings, Loader2, ImageOff, Trophy } from 'lucide-react';

// ─── Slot giocatore ────────────────────────────────────────────────────────
function PlayerSlot({ name, role, score, target, isOnline = true }) {
  const isHost = role === 'HOST';
  return (
    <div className={`flex items-center gap-3 rounded-xl p-3 ${isOnline ? 'bg-white/10' : 'bg-white/5 border border-dashed border-white/15'}`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
        !name ? 'bg-white/10' : isHost ? 'bg-indigo-600' : 'bg-purple-600'
      }`}>
        {name ? name[0].toUpperCase() : <Loader2 size={16} className="animate-spin text-white/30" />}
      </div>
      <span className={`font-medium flex-1 truncate text-sm ${name ? 'text-white' : 'text-white/40 italic'}`}>
        {name || 'In attesa...'}
      </span>
      {/* Punteggio (visibile solo se ci sono match in corso) */}
      {name && score !== undefined && target && (
        <div className="flex gap-1 items-center mr-1">
          {Array.from({ length: target }).map((_, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full border ${
              i < score
                ? (isHost ? 'bg-indigo-400 border-indigo-400' : 'bg-purple-400 border-purple-400')
                : 'bg-transparent border-white/20'
            }`} />
          ))}
        </div>
      )}
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
        isHost       ? 'bg-yellow-500/20 text-yellow-400' :
        isOnline     ? 'bg-green-500/20 text-green-400'   :
        'bg-white/10 text-white/30'
      }`}>
        {isHost ? 'HOST' : isOnline ? '● Online' : '—'}
      </span>
    </div>
  );
}

// ─── Character thumbnail ────────────────────────────────────────────────────
function CharThumb({ char }) {
  const [ok, setOk] = useState(true);
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center border border-white/10 flex-shrink-0">
      {ok && char.imageUrl ? (
        <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" onError={() => setOk(false)} />
      ) : (
        <ImageOff size={14} className="text-slate-500" />
      )}
    </div>
  );
}

// ─── LobbyScreen ──────────────────────────────────────────────────────────
export default function LobbyScreen() {
  const { room, playerRole, matchScores, matchTarget, startGame, goHome } = useGame();
  const [showAdmin, setShowAdmin]           = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [copied, setCopied]                 = useState(false);

  const isHost   = playerRole === 'host';
  const canStart = isHost && room?.playerCount === 2;

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(room?.code ?? ''); }
    catch { /* noop */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Punteggi del match in corso (se esistono)
  const hasOngoingMatch = Object.values(matchScores).some(v => v > 0);

  if (showAdmin && isHost) return <AdminPanel onBack={() => setShowAdmin(false)} />;
  if (showScoreboard)       return <Scoreboard onClose={() => setShowScoreboard(false)} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex items-center justify-center p-5">
      <div className="w-full max-w-sm space-y-4">

        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-1 select-none">🎭</div>
          <h2 className="text-2xl font-extrabold text-white">
            {isHost ? 'La tua Stanza' : 'In Attesa…'}
          </h2>
          <p className="text-purple-400 text-sm">
            {isHost
              ? 'Condividi il codice con l\'avversario'
              : `Aspetta che ${room?.hostName} avvii la partita`}
          </p>
        </div>

        {/* Punteggio match in corso */}
        {hasOngoingMatch && room?.hostName && room?.guestName && (
          <div className="bg-white/10 rounded-2xl p-4 border border-indigo-500/30 text-center">
            <p className="text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Punteggio match in corso
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-white font-bold text-sm truncate">{room.hostName}</span>
              <div className="flex items-center gap-2">
                <span className="text-indigo-400 font-black text-2xl tabular-nums">{matchScores[room.hostName] || 0}</span>
                <span className="text-white/20">–</span>
                <span className="text-purple-400 font-black text-2xl tabular-nums">{matchScores[room.guestName] || 0}</span>
              </div>
              <span className="text-white font-bold text-sm truncate">{room.guestName}</span>
            </div>
            <p className="text-white/30 text-xs mt-1.5">Prima a {matchTarget} vince</p>
          </div>
        )}

        {/* Codice stanza */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center border border-white/10">
          <p className="text-purple-400 text-xs font-semibold uppercase tracking-widest mb-2">Codice Stanza</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-5xl font-black text-white tracking-[0.15em] font-mono select-all">{room?.code}</span>
            <button onClick={copyCode} className="p-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/10" title="Copia codice">
              {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
            </button>
          </div>
          {copied && <p className="text-green-400 text-xs mt-1 animate-fade-in">Copiato!</p>}
        </div>

        {/* Giocatori */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Users size={15} className="text-purple-400" />
            <span className="text-purple-300 text-sm font-semibold">Giocatori — {room?.playerCount || 1}/2</span>
          </div>
          <div className="space-y-2">
            <PlayerSlot
              name={room?.hostName}
              role="HOST"
              score={matchScores[room?.hostName]}
              target={hasOngoingMatch ? matchTarget : undefined}
            />
            <PlayerSlot
              name={room?.guestName}
              role="GUEST"
              score={matchScores[room?.guestName]}
              target={hasOngoingMatch ? matchTarget : undefined}
              isOnline={!!room?.guestName}
            />
          </div>
        </div>

        {/* Anteprima personaggi */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-purple-300 text-sm font-semibold">🎴 {room?.characters?.length || 0} Personaggi</span>
            {isHost && (
              <button onClick={() => setShowAdmin(true)} className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors">
                <Settings size={13} /> Modifica
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {room?.characters?.slice(0, 16).map(char => <CharThumb key={char.id} char={char} />)}
            {(room?.characters?.length ?? 0) > 16 && (
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white/60 text-xs font-bold border border-white/10">
                +{room.characters.length - 16}
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        {isHost ? (
          <button
            onClick={startGame}
            disabled={!canStart}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:bg-slate-700 disabled:text-white/30 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-900/40"
          >
            <Play size={22} strokeWidth={2.5} />
            {canStart
              ? (hasOngoingMatch ? `▶ Round ${Object.values(matchScores).reduce((a, b) => a + b, 0) + 1}` : 'Inizia la Partita!')
              : 'Aspetta l\'avversario…'}
          </button>
        ) : (
          <div className="bg-white/10 rounded-2xl p-4 text-center border border-white/10">
            <Loader2 size={22} className="text-purple-400 animate-spin mx-auto mb-2" />
            <p className="text-white/60 text-sm">L'host sta configurando la partita…</p>
          </div>
        )}

        {/* Footer links */}
        <div className="flex items-center justify-between">
          <button onClick={goHome} className="text-white/35 hover:text-white/70 text-sm transition-colors">
            ← Esci
          </button>
          <button onClick={() => setShowScoreboard(true)} className="flex items-center gap-1.5 text-yellow-400/50 hover:text-yellow-400 text-sm transition-colors font-medium">
            <Trophy size={14} /> Classifica
          </button>
        </div>
      </div>
    </div>
  );
}
