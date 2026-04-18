import { useState, useCallback, useRef, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import ImageCropper from './ImageCropper';
import {
  Plus, Trash2, Edit2, Check, X, RefreshCw,
  ChevronDown, ChevronUp, ImageOff, Upload,
  Save, FolderOpen, Folder, AlertCircle, Loader2, ServerCrash
} from 'lucide-react';

// ─── Server URL (stessa logica del socket) ──────────────────────────────────
const SERVER_URL = import.meta.env.VITE_SOCKET_URL || `${window.location.protocol}//${window.location.hostname}:3001`;

// ─── API helpers ────────────────────────────────────────────────────────────
async function apiFetchSets() {
  const res = await fetch(`${SERVER_URL}/api/sets`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // { nome: [...chars], ... }
}

async function apiSaveSet(name, characters) {
  const res = await fetch(`${SERVER_URL}/api/sets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, characters })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function apiDeleteSet(name) {
  const res = await fetch(`${SERVER_URL}/api/sets/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// ─── Built-in presets (URL esterne, solo di default) ───────────────────────
const buildPreset = (names, imgOffset = 0) =>
  names.map((name, i) => ({
    id: `preset-${Date.now()}-${i}`,
    name,
    imageUrl: `https://i.pravatar.cc/300?img=${((i + imgOffset) % 70) + 1}`
  }));

const BUILTIN_PRESETS = {
  '🧑‍🤝‍🧑 Classici': buildPreset(['Alice','Bruno','Carla','Diego','Elena','Franco','Giulia','Hugo','Irene','Luca','Marco','Nina','Omar','Paola','Rocco','Sara','Tomas','Ursula','Valentina','Walter','Xena','Yara','Zeno','Aria'], 0),
  '⚔️ Fantasy':     buildPreset(['Aragorn','Gandalf','Legolas','Gimli','Frodo','Sam','Galadriel','Bilbo','Boromir','Pippin','Merry','Elrond','Saruman','Theoden','Eowyn','Faramir','Arwen','Radagast','Treebeard','Thranduil','Bard','Thorin','Dwalin','Balin'], 10),
  '🦸 Eroi':        buildPreset(['Tony Stark','Steve Rogers','Thor','Hulk','Natasha','Clint','Wanda','Vision','Peter Parker','T\'Challa','Carol','Scott','Sam Wilson','Bucky','Stephen Strange','Bruce Banner','Shuri','Okoye','Rocket','Gamora','Drax','Nebula','Groot','Star-Lord'], 25),
  '🎬 Cinema':      buildPreset(['Luke','Leia','Han Solo','Darth Vader','Yoda','Obi-Wan','Hermione','Ron','Dumbledore','Voldemort','Snape','McGonagall','Katniss','Peeta','Haymitch','Effie','Finnick','Johanna','Gandalf B','Bilbo B','Gollum','Sauron','Thranduil B','Bard B'], 40),
};

// ─── Canvas resize → Base64 ─────────────────────────────────────────────────
function resizeImage(file, maxSize = 250, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize; }
        } else {
          if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── Character Editor inline ────────────────────────────────────────────────
function CharEditor({ char, onSave, onCancel }) {
  const [name, setName]         = useState(char.name);
  const [url, setUrl]           = useState(char.imageUrl);
  const [imgOk, setImgOk]       = useState(true);
  const [cropSrc, setCropSrc]   = useState(null);   // data-URL to pass to ImageCropper
  const fileRef                 = useRef();
  const isBase64                = url?.startsWith('data:');

  // Open native file picker → read as data-URL → open cropper
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // reset input so picking the same file again still fires onChange
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
  };

  // Called by ImageCropper with the cropped JPEG base64
  const handleCropConfirm = (b64) => {
    setUrl(b64);
    setImgOk(true);
    setCropSrc(null);
  };

  return (
    <>
      <div className="bg-slate-700 rounded-2xl p-4 border-2 border-indigo-500">
        <div className="flex gap-3 mb-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-600 flex-shrink-0 flex items-center justify-center group cursor-pointer border-2 border-dashed border-white/20 hover:border-indigo-400 transition-colors"
          >
            {imgOk && url ? (
              <>
                <img src={url} alt="anteprima" className="w-full h-full object-cover" onError={() => setImgOk(false)} />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Upload size={16} className="text-white" />
                </div>
              </>
            ) : (
              <Upload size={20} className="text-slate-400" />
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <div className="flex-1 space-y-2">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome personaggio..."
              maxLength={24}
              className="w-full bg-slate-600 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {!isBase64 ? (
              <input
                value={url}
                onChange={e => { setUrl(e.target.value); setImgOk(true); }}
                placeholder="Oppure incolla URL immagine..."
                className="w-full bg-slate-600 text-white/60 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            ) : (
              <p className="text-xs text-emerald-400 px-1 flex items-center gap-1">
                <Check size={12} /> Foto dal dispositivo caricata
              </p>
            )}
          </div>
        </div>
        <p className="text-white/35 text-xs mb-3 text-center">📷 Tocca la foto per caricarla e ritagliarla dal tuo dispositivo</p>
        <div className="flex gap-2">
          <button
            onClick={() => onSave({ ...char, name: name.trim() || 'Personaggio', imageUrl: url })}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-sm font-semibold transition-all"
          >
            <Check size={16} /> Salva
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-600 hover:bg-slate-500 text-white/70 rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-sm transition-all"
          >
            <X size={16} /> Annulla
          </button>
        </div>
      </div>

      {/* Image cropper modal */}
      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </>
  );
}

// ─── Character Row ──────────────────────────────────────────────────────────
function CharRow({ char, index, onEdit, onDelete }) {
  const [ok, setOk] = useState(true);
  return (
    <div className="flex items-center gap-3 bg-slate-800 rounded-xl p-3 border border-white/5">
      <span className="text-white/25 text-xs w-5 text-center flex-shrink-0">{index + 1}</span>
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0 flex items-center justify-center">
        {ok && char.imageUrl
          ? <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" onError={() => setOk(false)} />
          : <ImageOff size={16} className="text-slate-500" />}
      </div>
      <span className="text-white font-medium flex-1 truncate text-sm">{char.name}</span>
      <button onClick={() => onEdit(char.id)} className="p-2 text-indigo-400 hover:text-indigo-300 transition-colors"><Edit2 size={16} /></button>
      <button onClick={() => onDelete(char.id)} className="p-2 text-red-400 hover:text-red-300 transition-colors"><Trash2 size={16} /></button>
    </div>
  );
}

// ─── Save Set Modal ─────────────────────────────────────────────────────────
function SaveSetModal({ existingName, onSave, onClose }) {
  const [name, setName] = useState(existingName || '');
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl p-5 w-full max-w-xs border border-white/10">
        <h3 className="text-white font-bold text-lg mb-1">💾 Salva Set</h3>
        <p className="text-white/45 text-sm mb-4">Scegli un nome per questo set di personaggi — verrà salvato sul server e resterà disponibile anche dopo il riavvio.</p>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name.trim())}
          placeholder="Es: Amici di classe, Colleghi..."
          autoFocus
          maxLength={30}
          className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 bg-slate-700 text-white/60 py-3 rounded-xl text-sm">Annulla</button>
          <button
            onClick={() => name.trim() && onSave(name.trim())}
            disabled={!name.trim()}
            className="flex-1 bg-indigo-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm active:scale-95 transition-all"
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main AdminPanel ────────────────────────────────────────────────────────
export default function AdminPanel({ onBack }) {
  const { room, updateCharacters } = useGame();

  const [chars, setChars]           = useState(room?.characters || []);
  const [editingId, setEditingId]   = useState(null);
  const [showPresets, setShowPresets] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Set salvati sul server
  const [savedSets, setSavedSets]     = useState({});
  const [loadingSets, setLoadingSets] = useState(true);
  const [setsError, setSetsError]     = useState(false);

  // Toast locale
  const [toast, setToast] = useState(null);
  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // ── Carica i set dal server all'apertura ──────────────────────────
  const refreshSets = useCallback(async () => {
    setLoadingSets(true);
    setSetsError(false);
    try {
      const data = await apiFetchSets();
      setSavedSets(data);
    } catch {
      setSetsError(true);
    } finally {
      setLoadingSets(false);
    }
  }, []);

  useEffect(() => { refreshSets(); }, [refreshSets]);

  // ── Helpers ───────────────────────────────────────────────────────
  const applyChars = useCallback((updated) => {
    setChars(updated);
    updateCharacters(updated);
  }, [updateCharacters]);

  const saveChar = (updated) => {
    applyChars(chars.map(c => c.id === updated.id ? updated : c));
    setEditingId(null);
  };

  const deleteChar = (id) => {
    applyChars(chars.filter(c => c.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const addChar = () => {
    const newChar = { id: `custom-${Date.now()}`, name: 'Nuovo', imageUrl: `https://i.pravatar.cc/300?img=${Math.floor(Math.random() * 70) + 1}` };
    const updated = [...chars, newChar];
    setChars(updated);
    updateCharacters(updated);
    setEditingId(newChar.id);
  };

  const newEmptySet = () => {
    if (chars.length > 0 && !confirm('Svuotare il set attuale e ricominciare da zero?')) return;
    applyChars([]);
    setEditingId(null);
    flash('✨ Set svuotato — aggiungi i tuoi personaggi!');
  };

  const loadPreset = (name, preset) => {
    if (chars.length > 0 && !confirm(`Sostituire il set attuale con "${name}"?`)) return;
    applyChars(preset.map((c, i) => ({ ...c, id: `loaded-${Date.now()}-${i}` })));
    setShowPresets(false);
    flash(`✅ Set "${name}" caricato`);
  };

  // ── Salva set sul server ──────────────────────────────────────────
  const handleSaveSet = async (name) => {
    setShowSaveModal(false);
    flash('⏳ Salvataggio in corso…');
    try {
      await apiSaveSet(name, chars);
      await refreshSets();
      flash(`💾 Set "${name}" salvato sul server!`);
    } catch {
      flash('❌ Errore durante il salvataggio. Il server è acceso?');
    }
  };

  // ── Elimina set dal server ────────────────────────────────────────
  const handleDeleteSet = async (name) => {
    if (!confirm(`Eliminare il set "${name}" dal server?`)) return;
    flash('⏳ Eliminazione…');
    try {
      await apiDeleteSet(name);
      await refreshSets();
      flash(`🗑️ Set "${name}" eliminato`);
    } catch {
      flash('❌ Errore durante l\'eliminazione.');
    }
  };

  const countColor = chars.length === 24 ? 'text-emerald-400' : chars.length > 24 ? 'text-red-400' : 'text-yellow-400';
  const savedSetNames = Object.keys(savedSets);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="bg-slate-800 px-4 py-3 flex items-center gap-3 border-b border-white/10 sticky top-0 z-10">
        <button onClick={onBack} className="text-white/50 hover:text-white p-1.5 rounded-lg transition-colors">←</button>
        <h2 className="text-white font-bold flex-1">🎴 Gestisci Personaggi</h2>
        <span className={`text-sm font-bold tabular-nums ${countColor}`}>{chars.length}/24</span>
      </div>

      {/* ── Toast locale ───────────────────────────────── */}
      {toast && (
        <div className="mx-4 mt-3 bg-slate-700 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-medium text-center animate-fade-in">
          {toast}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* ── Bottoni azione ──────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          <button onClick={newEmptySet} className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-xl p-3 flex flex-col items-center gap-1 text-xs font-medium border border-white/10 transition-all">
            <Plus size={18} className="text-indigo-400" />
            Nuovo Set
          </button>
          <button
            onClick={() => chars.length > 0 && setShowSaveModal(true)}
            disabled={chars.length === 0}
            className="bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-40 text-white rounded-xl p-3 flex flex-col items-center gap-1 text-xs font-medium border border-white/10 transition-all"
          >
            <Save size={18} className="text-emerald-400" />
            Salva Set
          </button>
          <button
            onClick={() => setShowPresets(v => !v)}
            className={`bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-xl p-3 flex flex-col items-center gap-1 text-xs font-medium border transition-all ${showPresets ? 'border-indigo-500 bg-indigo-900/20' : 'border-white/10'}`}
          >
            <FolderOpen size={18} className="text-purple-400" />
            Carica
          </button>
        </div>

        {/* ── Pannello preset / set salvati ───────────── */}
        {showPresets && (
          <div className="bg-slate-800 rounded-2xl p-4 border border-white/10 space-y-3 animate-fade-in">

            {/* Set salvati sul server */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Folder size={12} /> I miei set (server)
                </p>
                <button onClick={refreshSets} disabled={loadingSets} className="text-white/30 hover:text-white p-1 transition-colors disabled:opacity-30">
                  <RefreshCw size={13} className={loadingSets ? 'animate-spin' : ''} />
                </button>
              </div>

              {loadingSets && (
                <div className="flex items-center gap-2 text-white/40 text-xs py-2">
                  <Loader2 size={14} className="animate-spin" /> Caricamento dal server…
                </div>
              )}

              {!loadingSets && setsError && (
                <div className="flex items-center gap-2 text-red-400 text-xs py-2 bg-red-900/20 rounded-xl px-3">
                  <ServerCrash size={14} /> Impossibile connettersi al server. Riprova.
                </div>
              )}

              {!loadingSets && !setsError && savedSetNames.length === 0 && (
                <p className="text-white/30 text-xs py-2 italic">Nessun set salvato ancora.</p>
              )}

              {!loadingSets && savedSetNames.length > 0 && (
                <div className="space-y-1.5">
                  {savedSetNames.map(name => (
                    <div key={name} className="flex items-center gap-2">
                      <button
                        onClick={() => loadPreset(name, savedSets[name])}
                        className="flex-1 bg-emerald-900/40 hover:bg-emerald-900/70 active:scale-95 text-emerald-300 rounded-xl px-3 py-2.5 text-sm font-medium text-left border border-emerald-800/40 transition-all flex items-center gap-2"
                      >
                        <Folder size={14} />
                        <span className="flex-1 truncate">{name}</span>
                        <span className="text-emerald-600 text-xs flex-shrink-0">{savedSets[name]?.length ?? 0} pers.</span>
                      </button>
                      <button onClick={() => handleDeleteSet(name)} className="p-2 text-red-400 hover:text-red-300 transition-colors flex-shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-white/10 mt-3" />
            </div>

            {/* Preset integrati */}
            <div>
              <p className="text-purple-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <RefreshCw size={12} /> Preset integrati
              </p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(BUILTIN_PRESETS).map(([name, preset]) => (
                  <button
                    key={name}
                    onClick={() => loadPreset(name, preset)}
                    className="bg-indigo-950/60 hover:bg-indigo-900/60 active:scale-95 text-indigo-300 rounded-xl p-3 text-sm font-medium border border-indigo-800/40 transition-all text-left"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Hint foto locali ────────────────────────── */}
        {chars.length > 0 && chars.some(c => !c.imageUrl?.startsWith('data:')) && (
          <div className="bg-blue-950/50 border border-blue-800/40 rounded-2xl p-4 flex gap-3">
            <AlertCircle size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-200/70 text-xs leading-relaxed">
              <strong className="text-blue-300">📷 Come usare le tue foto:</strong> clicca ✏️ su un personaggio e tocca la sua immagine per aprire il file picker. L'immagine viene compressa e salvata — nessun upload online!
            </p>
          </div>
        )}

        {/* ── Lista personaggi ─────────────────────────── */}
        <div className="space-y-2">
          {chars.length === 0 && (
            <div className="text-center py-10 text-white/30">
              <p className="text-4xl mb-3">👤</p>
              <p className="text-sm">Nessun personaggio.</p>
              <p className="text-xs mt-1">Aggiungi personaggi qui sotto o carica un preset.</p>
            </div>
          )}
          {chars.map((char, i) => (
            editingId === char.id
              ? <CharEditor key={char.id} char={char} onSave={saveChar} onCancel={() => setEditingId(null)} />
              : <CharRow key={char.id} char={char} index={i} onEdit={setEditingId} onDelete={deleteChar} />
          ))}
        </div>

        {/* ── Aggiungi personaggio ──────────────────────── */}
        <button
          onClick={addChar}
          className="w-full border-2 border-dashed border-white/15 hover:border-indigo-500 active:scale-95 text-white/40 hover:text-indigo-400 rounded-2xl p-5 flex items-center justify-center gap-2 transition-all"
        >
          <Plus size={20} /> Aggiungi Personaggio
        </button>
        <div className="h-4" />
      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <div className="p-4 bg-slate-800 border-t border-white/10">
        <button
          onClick={onBack}
          className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold py-4 rounded-2xl text-lg transition-all"
        >
          ✓ Fatto — {chars.length} personaggi
        </button>
      </div>

      {/* ── Modal salva set ─────────────────────────────── */}
      {showSaveModal && (
        <SaveSetModal
          onSave={handleSaveSet}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  );
}
