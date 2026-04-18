import { useGame } from '../contexts/GameContext';

const STYLES = {
  info:    'bg-slate-700 border-slate-500 text-white',
  success: 'bg-emerald-800 border-emerald-600 text-emerald-100',
  warning: 'bg-amber-800 border-amber-600 text-amber-100',
  error:   'bg-red-800 border-red-600 text-red-100',
};

const ICONS = {
  info:    'ℹ️',
  success: '✅',
  warning: '⚠️',
  error:   '❌',
};

export default function Toast() {
  const { toast } = useGame();
  if (!toast) return null;

  const type  = toast.type || 'info';
  const style = STYLES[type] ?? STYLES.info;
  const icon  = ICONS[type]  ?? ICONS.info;

  return (
    <div
      key={toast.id}
      className="fixed top-5 left-1/2 z-[9999] animate-bounce-in pointer-events-none"
      style={{ transform: 'translateX(-50%)' }}
    >
      <div className={`flex items-start gap-2.5 px-4 py-3 rounded-2xl border max-w-xs shadow-2xl ${style}`}>
        <span className="text-base flex-shrink-0">{icon}</span>
        <p className="text-sm font-medium leading-snug">{toast.message}</p>
      </div>
    </div>
  );
}
