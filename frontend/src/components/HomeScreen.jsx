import { useState } from 'react';
import { useGame } from '../contexts/GameContext';
import Scoreboard from './Scoreboard';
import { Plus, LogIn, Gamepad2, Trophy } from 'lucide-react';

export default function HomeScreen() {
  const { playerName, setPlayerName, createRoom, joinRoom, joinError, setJoinError } = useGame();
  const [mode, setMode]             = useState(null); // null | 'create' | 'join'
  const [joinCode, setJoinCode]     = useState('');
  const [showScoreboard, setShowScoreboard] = useState(false);

  const nameOk = playerName.trim().length > 0;

  const handleCreate = () => { if (nameOk) createRoom(); };

  const handleJoin = () => {
    if (!nameOk || joinCode.length !== 4) return;
    joinRoom(joinCode);
  };

  const handleCodeInput = (val) => {
    setJoinCode(val.replace(/\D/g, '').slice(0, 4));
    if (joinError) setJoinError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex items-center justify-center p-5">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-6xl mb-3 select-none">🎭</div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Indovina Chi?</h1>
          <p className="text-purple-400 text-sm mt-1 font-medium">Multiplayer personalizzabile · LAN</p>
        </div>

        {/* Name input */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 mb-4 border border-white/10">
          <label className="text-purple-300 text-xs font-semibold uppercase tracking-wider mb-2 block">
            Il tuo nome
          </label>
          <input
            type="text"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && nameOk && !mode && setMode('create')}
            placeholder="Come ti chiami?"
            maxLength={20}
            autoFocus
            className="w-full bg-white/15 text-white placeholder-white/40 rounded-xl px-4 py-3.5 text-lg outline-none focus:ring-2 focus:ring-purple-500 border border-white/10 transition-all"
          />
        </div>

        {/* Buttons */}
        {!mode && (
          <div className="space-y-3 animate-fade-in">
            <button
              onClick={() => nameOk && setMode('create')}
              disabled={!nameOk}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-900/50"
            >
              <Plus size={22} strokeWidth={2.5} />
              Crea Partita
            </button>
            <button
              onClick={() => nameOk && setMode('join')}
              disabled={!nameOk}
              className="w-full bg-white/15 hover:bg-white/25 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-lg flex items-center justify-center gap-3 transition-all border border-white/20"
            >
              <LogIn size={22} strokeWidth={2.5} />
              Unisciti alla Partita
            </button>
            {!nameOk && (
              <p className="text-white/30 text-xs text-center pt-1">Inserisci il tuo nome per continuare</p>
            )}

            {/* Classifica */}
            <button
              onClick={() => setShowScoreboard(true)}
              className="w-full flex items-center justify-center gap-2 text-yellow-400/70 hover:text-yellow-400 py-3 text-sm font-medium transition-colors"
            >
              <Trophy size={16} />
              Classifica Globale
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-3 animate-fade-in">
            <div className="bg-white/10 rounded-2xl p-4 text-center border border-white/10">
              <Gamepad2 size={32} className="text-indigo-400 mx-auto mb-2" />
              <p className="text-white font-semibold">Crea una nuova stanza</p>
              <p className="text-white/50 text-sm mt-1">Verrà generato un codice da condividere con l'avversario</p>
            </div>
            <button onClick={handleCreate} className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold py-4 rounded-2xl text-lg transition-all shadow-lg shadow-indigo-900/50">
              🚀 Crea Stanza
            </button>
            <button onClick={() => setMode(null)} className="w-full text-white/40 hover:text-white py-2 text-sm transition-colors">
              ← Indietro
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-3 animate-fade-in">
            <div className="bg-white/10 rounded-2xl p-5 border border-white/10">
              <label className="text-purple-300 text-xs font-semibold uppercase tracking-wider mb-3 block">
                Codice Stanza (4 cifre)
              </label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={joinCode}
                onChange={e => handleCodeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && joinCode.length === 4 && handleJoin()}
                placeholder="· · · ·"
                className={`w-full bg-white/15 text-white placeholder-white/30 rounded-xl px-4 py-4 text-3xl text-center font-bold tracking-[0.5em] outline-none border transition-all
                  ${joinError ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-white/10 focus:ring-2 focus:ring-purple-500'}`}
              />
              {joinError && <p className="text-red-400 text-sm mt-2 text-center font-medium">⚠️ {joinError}</p>}
            </div>
            <button
              onClick={handleJoin}
              disabled={joinCode.length !== 4}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-lg flex items-center justify-center gap-3 transition-all"
            >
              <LogIn size={22} strokeWidth={2.5} /> Entra
            </button>
            <button onClick={() => { setMode(null); setJoinError(null); setJoinCode(''); }} className="w-full text-white/40 hover:text-white py-2 text-sm transition-colors">
              ← Indietro
            </button>
          </div>
        )}
      </div>

      {/* Scoreboard overlay */}
      {showScoreboard && <Scoreboard onClose={() => setShowScoreboard(false)} />}
    </div>
  );
}
