const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app = express();
app.use(cors());
// app.use(express.json());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve static files from Vite build
app.use(express.static(path.join(__dirname, '../public')));

// Fallback to index.html for client-side routing
app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

// ─── Scoreboard file persistence ────────────────────────────────────────────
const SCOREBOARD_PATH = path.join(__dirname, 'config', 'scoreboard.json');

function loadScoreboard() {
  try {
    return JSON.parse(fs.readFileSync(SCOREBOARD_PATH, 'utf8'));
  } catch {
    return { players: {}, recentMatches: [] };
  }
}

function saveScoreboard(data) {
  try { fs.writeFileSync(SCOREBOARD_PATH, JSON.stringify(data, null, 2)); }
  catch (e) { console.error('[Scoreboard] Errore salvataggio:', e.message); }
}

function recordMatch(winnerName, loserName, winnerScore, loserScore) {
  const sb = loadScoreboard();

  // Init entries if missing
  [winnerName, loserName].forEach(name => {
    if (!sb.players[name]) {
      sb.players[name] = { wins: 0, losses: 0, matchesPlayed: 0, roundsWon: 0, roundsLost: 0 };
    }
  });

  sb.players[winnerName].wins++;
  sb.players[winnerName].matchesPlayed++;
  sb.players[winnerName].roundsWon   += winnerScore;
  sb.players[winnerName].roundsLost  += loserScore;

  sb.players[loserName].losses++;
  sb.players[loserName].matchesPlayed++;
  sb.players[loserName].roundsWon    += loserScore;
  sb.players[loserName].roundsLost   += winnerScore;

  sb.recentMatches.unshift({
    date:   new Date().toISOString(),
    winner: winnerName,
    loser:  loserName,
    score:  `${winnerScore}-${loserScore}`
  });
  sb.recentMatches = sb.recentMatches.slice(0, 100); // keep last 100

  saveScoreboard(sb);
  console.log(`[Scoreboard] ${winnerName} batte ${loserName} (${winnerScore}-${loserScore})`);
}

// ─── Sets file persistence ────────────────────────────────────────────────────
const SETS_PATH = path.join(__dirname, 'sets.json');

function loadSets() {
  try { return JSON.parse(fs.readFileSync(SETS_PATH, 'utf8')); }
  catch { return {}; }
}

function saveSets(data) {
  try { fs.writeFileSync(SETS_PATH, JSON.stringify(data, null, 2)); }
  catch (e) { console.error('[Sets] Errore salvataggio:', e.message); }
}

// ─── REST endpoints ──────────────────────────────────────────────────────────
app.get('/api/scoreboard', (_, res) => res.json(loadScoreboard()));

// GET  /api/sets           → tutti i set salvati
app.get('/api/sets', (_, res) => res.json(loadSets()));

// POST /api/sets           → { name, characters }  — crea o sovrascrive
app.post('/api/sets', (req, res) => {
  const { name, characters } = req.body;
  if (!name || !Array.isArray(characters)) {
    return res.status(400).json({ error: '"name" e "characters" sono obbligatori' });
  }
  const sets = loadSets();
  sets[name] = characters;
  saveSets(sets);
  console.log(`[Sets] Salvato: "${name}" (${characters.length} personaggi)`);
  res.json({ success: true });
});

// DELETE /api/sets/:name   → elimina un set
app.delete('/api/sets/:name', (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const sets = loadSets();
  if (!(name in sets)) return res.status(404).json({ error: 'Set non trovato' });
  delete sets[name];
  saveSets(sets);
  console.log(`[Sets] Eliminato: "${name}"`);
  res.json({ success: true });
});

// ─── In-memory room store ─────────────────────────────────────────────────────
const rooms = new Map();

function generateRoomCode() {
  let code;
  do { code = Math.floor(1000 + Math.random() * 9000).toString(); }
  while (rooms.has(code));
  return code;
}

function getScoresByName(room) {
  return {
    [room.hostName]:  room.matchScore[room.hostId]  || 0,
    [room.guestName]: room.matchScore[room.guestId] || 0
  };
}

function serializeRoom(room) {
  return {
    code:        room.code,
    hostName:    room.hostName,
    guestName:   room.guestName,
    characters:  room.characters,
    gameStarted: room.gameStarted,
    playerCount: 1 + (room.guestId ? 1 : 0),
    matchTarget: room.matchTarget,
    scores:      getScoresByName(room)
  };
}

function getDefaultCharacters() {
  const data = [
    ['Alice',1],['Bruno',2],['Carla',3],['Diego',4],['Elena',5],['Franco',6],
    ['Giulia',7],['Hugo',8],['Irene',9],['Luca',10],['Marco',11],['Nina',12],
    ['Omar',13],['Paola',14],['Rocco',15],['Sara',16],['Tomas',17],['Ursula',18],
    ['Valentina',19],['Walter',20],['Xena',21],['Yara',22],['Zeno',23],['Aria',24]
  ];
  return data.map(([name, img]) => ({ id: `default-${img}`, name, imageUrl: `https://i.pravatar.cc/300?img=${img}` }));
}

// ─── Socket.io ───────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] ${socket.id}`);

  // HOST: crea stanza
  socket.on('create-room', ({ playerName }) => {
    const code = generateRoomCode();
    const room = {
      code, hostId: socket.id, hostName: playerName,
      guestId: null, guestName: null,
      characters: getDefaultCharacters(),
      gameStarted: false, secretAssignments: {},
      matchScore: {}, matchTarget: 2,
      roundsPlayed: 0, matchOver: false
    };
    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.playerName = playerName;
    socket.emit('room-created', { code, room: serializeRoom(room) });
    console.log(`[ROOM] Creata ${code} da ${playerName}`);
  });

  // GUEST: si unisce
  socket.on('join-room', ({ code, playerName }) => {
    const room = rooms.get(code);
    if (!room)        { socket.emit('join-error', { message: 'Stanza non trovata!' }); return; }
    if (room.guestId) { socket.emit('join-error', { message: 'Stanza piena (2/2)!' }); return; }
    if (room.gameStarted) { socket.emit('join-error', { message: 'Partita già in corso!' }); return; }
    room.guestId = socket.id; room.guestName = playerName;
    socket.join(code); socket.data.roomCode = code; socket.data.playerName = playerName;
    io.to(code).emit('room-updated', { room: serializeRoom(room) });
    console.log(`[ROOM] ${playerName} si è unito a ${code}`);
  });

  // HOST: aggiorna personaggi
  socket.on('update-characters', ({ characters }) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || socket.id !== room.hostId) return;
    room.characters = characters;
    io.to(room.code).emit('characters-updated', { characters });
  });

  // HOST: avvia il gioco (o il round successivo)
  socket.on('start-game', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || socket.id !== room.hostId) return;
    if (!room.guestId)  { socket.emit('game-error', { message: 'Aspetta che un secondo giocatore si unisca!' }); return; }
    if (room.characters.length < 2) { socket.emit('game-error', { message: 'Servono almeno 2 personaggi!' }); return; }

    const shuffled = [...room.characters].sort(() => Math.random() - 0.5);
    room.secretAssignments[room.hostId]  = shuffled[0];
    room.secretAssignments[room.guestId] = shuffled[1];
    room.gameStarted = true;

    const scores = getScoresByName(room);
    const round  = room.roundsPlayed + 1;

    const base = { characters: room.characters, scores, matchTarget: room.matchTarget, roundNumber: round };

    io.to(room.hostId).emit('game-started', {
      ...base, secretCharacter: room.secretAssignments[room.hostId],
      playerRole: 'host', myName: room.hostName, opponentName: room.guestName
    });
    io.to(room.guestId).emit('game-started', {
      ...base, secretCharacter: room.secretAssignments[room.guestId],
      playerRole: 'guest', myName: room.guestName, opponentName: room.hostName
    });
    console.log(`[GAME] Round ${round} iniziato nella stanza ${room.code}`);
  });

  // GIOCATORE: dichiara la vittoria
  socket.on('claim-win', ({ guessedCharacterId }) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || !room.gameStarted) return;

    const opponentId  = socket.id === room.hostId ? room.guestId : room.hostId;
    const opponentSecret = room.secretAssignments[opponentId];
    const mySecret       = room.secretAssignments[socket.id];
    const isCorrect      = opponentSecret && opponentSecret.id === guessedCharacterId;

    const claimerName  = socket.id === room.hostId ? room.hostName : room.guestName;

    // Chi vince il round: se indovino → io; se sbaglio → l'avversario
    const roundWinnerId   = isCorrect ? socket.id   : opponentId;
    const roundLoserId    = isCorrect ? opponentId  : socket.id;
    const roundWinnerName = roundWinnerId === room.hostId ? room.hostName : room.guestName;
    const roundLoserName  = roundLoserId  === room.hostId ? room.hostName : room.guestName;

    room.matchScore[roundWinnerId] = (room.matchScore[roundWinnerId] || 0) + 1;
    room.roundsPlayed++;

    const winnerMatchPts = room.matchScore[roundWinnerId] || 0;
    const loserMatchPts  = room.matchScore[roundLoserId]  || 0;
    const isMatchOver    = winnerMatchPts >= room.matchTarget;

    const scores = getScoresByName(room);

    if (isMatchOver) {
      room.matchOver = true;
      room.gameStarted = false;
      recordMatch(roundWinnerName, roundLoserName, winnerMatchPts, loserMatchPts);
    } else {
      room.gameStarted = false;
    }

    io.to(room.code).emit('game-over', {
      claimerId:      socket.id,
      claimerName,
      isCorrect,
      opponentSecret,
      myCharacter:    mySecret,   // ← each player receives their own via separate messages below
      roundWinnerName,
      isMatchOver,
      matchWinnerName: isMatchOver ? roundWinnerName : null,
      scores,
      roundNumber: room.roundsPlayed
    });

    // Send personalised 'myCharacter' to each player
    io.to(socket.id).emit('my-character', { myCharacter: mySecret });
    io.to(opponentId).emit('my-character', { myCharacter: opponentSecret });

    console.log(`[GAME] Round ${room.roundsPlayed} — ${roundWinnerName} vince. Match over: ${isMatchOver}`);
  });

  // GIOCATORE: prossimo round / rivincita
  socket.on('request-rematch', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return;
    const wasMatchOver = room.matchOver;
    room.gameStarted = false;
    room.secretAssignments = {};
    if (room.matchOver) {
      room.matchScore  = {};
      room.roundsPlayed = 0;
      room.matchOver   = false;
    }
    io.to(room.code).emit('rematch-ready', { room: serializeRoom(room), wasMatchOver });
  });

  // Disconnessione
  socket.on('disconnect', () => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    const name = socket.data.playerName || 'Giocatore';
    if (socket.id === room.hostId) {
      io.to(code).emit('player-left', { name, role: 'host', message: `${name} (host) si è disconnesso. La stanza è chiusa.` });
      rooms.delete(code);
    } else if (socket.id === room.guestId) {
      room.guestId = room.guestName = null;
      room.gameStarted = false;
      room.secretAssignments = {};
      io.to(code).emit('player-left', { name, role: 'guest', message: `${name} si è disconnesso.` });
      io.to(code).emit('room-updated', { room: serializeRoom(room) });
    }
    console.log(`[-] ${socket.id} dalla stanza ${code}`);
  });
});


// ─── Avvio ───────────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', rooms: rooms.size }));

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🎮 Indovina Chi? Server avviato!');
  console.log(`📡 http://0.0.0.0:${PORT}`);
  console.log(`📊 Scoreboard: ${SCOREBOARD_PATH}\n`);
});
