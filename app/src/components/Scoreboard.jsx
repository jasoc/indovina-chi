import { useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { X, Trophy, RefreshCw, Loader2, Swords } from 'lucide-react';

// Formatta una data ISO in italiano
function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

// Percentuale vittorie
function winRate(wins, played) {
  if (!played) return '—';
  return `${Math.round((wins / played) * 100)}%`;
}

// Medaglia per posizione
function medal(i) {
  if (i === 0) return '🥇';
  if (i === 1) return '🥈';
  if (i === 2) return '🥉';
  return `#${i + 1}`;
}

export default function Scoreboard({ onClose }) {
  const { scoreboard, fetchScoreboard, loadingScoreboard } = useGame();

  useEffect(() => { fetchScoreboard(); }, []);

  const players = scoreboard
    ? Object.entries(scoreboard.players)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
    : [];

  const matches = scoreboard?.recentMatches ?? [];

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="bg-slate-800 px-5 py-4 flex items-center gap-3 border-b border-white/10 sticky top-0 z-10">
        <Trophy size={20} className="text-yellow-400 flex-shrink-0" />
        <h2 className="text-white font-extrabold text-lg flex-1">Classifica Globale</h2>
        <button
          onClick={fetchScoreboard}
          disabled={loadingScoreboard}
          className="p-2 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/10 disabled:opacity-30"
        >
          <RefreshCw size={16} className={loadingScoreboard ? 'animate-spin' : ''} />
        </button>
        <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/10">
          <X size={20} />
        </button>
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {loadingScoreboard && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="text-indigo-400 animate-spin" />
          </div>
        )}

        {!loadingScoreboard && players.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🏆</div>
            <p className="text-white/50 font-medium">Nessuna partita ancora giocata.</p>
            <p className="text-white/30 text-sm mt-1">Gioca il tuo primo match per apparire qui!</p>
          </div>
        )}

        {/* ── Leaderboard tabella ─────────────────────────────── */}
        {players.length > 0 && (
          <section>
            <h3 className="text-purple-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Trophy size={12} /> Classifica Giocatori
            </h3>
            <div className="space-y-2">
              {players.map((p, i) => (
                <div
                  key={p.name}
                  className={`flex items-center gap-3 rounded-2xl p-4 border ${
                    i === 0 ? 'bg-yellow-950/40 border-yellow-700/40' :
                    i === 1 ? 'bg-slate-700/60 border-white/10' :
                    i === 2 ? 'bg-orange-950/30 border-orange-800/30' :
                    'bg-slate-800 border-white/5'
                  }`}
                >
                  {/* Medaglia */}
                  <span className="text-xl w-8 text-center flex-shrink-0">{medal(i)}</span>

                  {/* Avatar iniziale */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                    i === 0 ? 'bg-yellow-600' : i === 1 ? 'bg-slate-500' : i === 2 ? 'bg-orange-700' : 'bg-indigo-700'
                  }`}>
                    {p.name[0]?.toUpperCase()}
                  </div>

                  {/* Nome + stats */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold truncate leading-tight">{p.name}</p>
                    <p className="text-white/40 text-xs">
                      {p.matchesPlayed} partit{p.matchesPlayed === 1 ? 'a' : 'e'}
                      {p.roundsWon !== undefined && ` · ${p.roundsWon}R vinti`}
                    </p>
                  </div>

                  {/* Vittorie / sconfitte / % */}
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-emerald-400 font-black text-lg">{p.wins}</span>
                      <span className="text-white/20 text-sm">–</span>
                      <span className="text-red-400 font-black text-lg">{p.losses}</span>
                    </div>
                    <p className="text-white/35 text-xs">{winRate(p.wins, p.matchesPlayed)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Partite recenti ─────────────────────────────────── */}
        {matches.length > 0 && (
          <section>
            <h3 className="text-purple-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Swords size={12} /> Partite Recenti
            </h3>
            <div className="space-y-2">
              {matches.slice(0, 20).map((m, i) => (
                <div key={i} className="bg-slate-800 rounded-xl px-4 py-3 border border-white/5 flex items-center gap-3">
                  {/* Vincitore */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🏆</span>
                      <span className="text-white font-semibold text-sm truncate">{m.winner}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-sm opacity-50">😔</span>
                      <span className="text-white/50 text-xs truncate">{m.loser}</span>
                    </div>
                  </div>

                  {/* Punteggio */}
                  <div className="text-center flex-shrink-0">
                    <span className="text-white font-black text-base tabular-nums">{m.score}</span>
                  </div>

                  {/* Data */}
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-white/30 text-xs">{formatDate(m.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="h-6" />
      </div>
    </div>
  );
}
