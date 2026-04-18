import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || `${window.location.protocol}//${window.location.hostname}:3001`;

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const socketRef = useRef(null);

  // Connessione
  const [socketId, setSocketId]       = useState(null);

  // Navigazione
  const [phase, setPhase]             = useState('home'); // 'home'|'lobby'|'game'|'gameover'

  // Giocatore
  const [playerName, setPlayerName]   = useState('');
  const [playerRole, setPlayerRole]   = useState(null);  // 'host'|'guest'

  // Stanza
  const [room, setRoom]               = useState(null);
  const [joinError, setJoinError]     = useState(null);

  // Partita corrente
  const [secretCharacter, setSecretCharacter] = useState(null);
  const [myCharacter, setMyCharacter] = useState(null);   // rivelato dopo game-over
  const [gameData, setGameData]       = useState(null);   // { characters, myName, opponentName, roundNumber }

  // Punteggio multi-round
  const [matchScores, setMatchScores] = useState({});     // { nome: punti }
  const [matchTarget, setMatchTarget] = useState(2);      // vittorie necessarie

  // Fine partita
  const [gameOver, setGameOver]       = useState(null);

  // Classifica
  const [scoreboard, setScoreboard]   = useState(null);
  const [loadingScoreboard, setLoadingScoreboard] = useState(false);

  // Toast
  const [toast, setToast]             = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Scoreboard fetch ───────────────────────────────────────────────────────
  const fetchScoreboard = useCallback(async () => {
    setLoadingScoreboard(true);
    try {
      const res = await fetch(`${SOCKET_URL}/api/scoreboard`);
      const data = await res.json();
      setScoreboard(data);
    } catch {
      showToast('Impossibile caricare la classifica.', 'error');
    } finally {
      setLoadingScoreboard(false);
    }
  }, [showToast]);

  // ── Socket setup ───────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(SOCKET_URL, { reconnection: true, reconnectionDelay: 1000, reconnectionAttempts: 10 });
    socketRef.current = socket;

    socket.on('connect',    () => setSocketId(socket.id));
    socket.on('disconnect', () => setSocketId(null));

    socket.on('room-created', ({ room }) => {
      setRoom(room);
      setPhase('lobby');
    });

    socket.on('room-updated', ({ room }) => setRoom(room));

    socket.on('characters-updated', ({ characters }) => {
      setRoom(prev => prev ? { ...prev, characters } : prev);
    });

    socket.on('join-error',  ({ message }) => setJoinError(message));
    socket.on('game-error',  ({ message }) => showToast(message, 'error'));

    socket.on('game-started', ({ secretCharacter, characters, playerRole, myName, opponentName, scores, matchTarget, roundNumber }) => {
      setSecretCharacter(secretCharacter);
      setPlayerRole(playerRole);
      setGameData({ characters, myName, opponentName, roundNumber: roundNumber || 1 });
      setMatchScores(scores || {});
      setMatchTarget(matchTarget || 2);
      setMyCharacter(null);
      setGameOver(null);
      setPhase('game');
    });

    // Il server invia il personaggio segreto rivelato a ogni giocatore individualmente
    socket.on('my-character', ({ myCharacter }) => {
      setMyCharacter(myCharacter);
    });

    socket.on('game-over', (data) => {
      setMatchScores(data.scores || {});
      setGameOver({ ...data, mySocketId: socket.id });
      setPhase('gameover');
    });

    socket.on('rematch-ready', ({ room }) => {
      setRoom(room);
      setMatchScores(room.scores || {});
      setGameOver(null);
      setMyCharacter(null);
      setSecretCharacter(null);
      setGameData(null);
      setPhase('lobby');
    });

    socket.on('player-left', ({ message, role }) => {
      showToast(message, role === 'host' ? 'error' : 'warning');
      if (role === 'host') {
        setTimeout(() => {
          setPhase('home');
          setRoom(null);
          setMatchScores({});
        }, 3000);
      }
    });

    return () => socket.disconnect();
  }, [showToast]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const emit = (event, data) => socketRef.current?.emit(event, data);

  const createRoom = useCallback(() => {
    if (!playerName.trim()) return;
    setPlayerRole('host');
    emit('create-room', { playerName: playerName.trim() });
  }, [playerName]);

  const joinRoom = useCallback((code) => {
    if (!playerName.trim()) return;
    setPlayerRole('guest');
    setJoinError(null);
    emit('join-room', { code, playerName: playerName.trim() });
  }, [playerName]);

  const updateCharacters = useCallback((characters) => {
    emit('update-characters', { characters });
    setRoom(prev => prev ? { ...prev, characters } : prev);
  }, []);

  const startGame      = useCallback(() => emit('start-game'), []);
  const claimWin       = useCallback((id) => emit('claim-win', { guessedCharacterId: id }), []);
  const requestRematch = useCallback(() => emit('request-rematch'), []);

  const goHome = useCallback(() => {
    setPhase('home');
    setRoom(null);
    setPlayerRole(null);
    setSecretCharacter(null);
    setMyCharacter(null);
    setGameData(null);
    setGameOver(null);
    setJoinError(null);
    setMatchScores({});
  }, []);

  return (
    <GameContext.Provider value={{
      socketId,
      phase,
      playerName, setPlayerName,
      playerRole,
      room,
      joinError, setJoinError,
      secretCharacter,
      myCharacter,
      gameData,
      matchScores,
      matchTarget,
      gameOver,
      scoreboard, fetchScoreboard, loadingScoreboard,
      toast,
      createRoom, joinRoom, updateCharacters,
      startGame, claimWin, requestRematch, goHome
    }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame deve essere usato dentro <GameProvider>');
  return ctx;
};
