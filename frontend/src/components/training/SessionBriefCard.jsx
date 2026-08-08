export default function SessionBriefCard({ sessionBrief, variant = 'dark' }) {
  if (!sessionBrief) return null;

  const light = variant === 'light';
  const wrap = light
    ? 'bg-white border border-slate-200 rounded-xl p-6 shadow-sm'
    : 'bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-2xl p-6';
  const eyebrow = light ? 'text-[#24408E]' : 'text-indigo-400';
  const heading = light ? 'text-slate-900' : 'text-white';
  const label = light ? 'text-slate-400' : 'text-slate-500';
  const value = light ? 'text-slate-800' : 'text-white';
  const goal = light ? 'text-slate-600' : 'text-slate-400';

  const title = sessionBrief.displayName
    ?? sessionBrief.customerName
    ?? sessionBrief.objective?.replace(/_/g, ' ');

  return (
    <div className={wrap}>
      <p className={`${eyebrow} text-xs font-semibold uppercase tracking-wider mb-2`}>Today&apos;s Training Plan</p>
      <h2 className={`text-2xl font-bold mb-1 ${heading}`}>{title}</h2>
      {sessionBrief.objective && (
        <p className={`text-sm capitalize mb-4 ${label}`}>
          Focus: {sessionBrief.objective.replace(/_/g, ' ')}
          {sessionBrief.difficultyLabel && ` · ${sessionBrief.difficultyLabel} difficulty`}
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p className={`${label} text-xs`}>Persona</p>
          <p className={`${value} capitalize`}>{String(sessionBrief.persona ?? '').replace(/_/g, ' ')}</p>
        </div>
        <div>
          <p className={`${label} text-xs`}>Child</p>
          <p className={value}>
            {sessionBrief.childName
              ? `${sessionBrief.childName}, Grade ${sessionBrief.childGrade}`
              : '—'}
          </p>
        </div>
        <div>
          <p className={`${label} text-xs`}>Location</p>
          <p className={value}>
            {[sessionBrief.city, sessionBrief.state].filter(Boolean).join(', ') || '—'}
          </p>
        </div>
        <div>
          <p className={`${label} text-xs`}>Brand awareness</p>
          <p className={`${value} capitalize`}>{sessionBrief.brandAwareness?.replace(/_/g, ' ') ?? '—'}</p>
        </div>
      </div>
      {(sessionBrief.summary || sessionBrief.goal) && (
        <p className={`${goal} text-sm mt-4`}>{sessionBrief.summary ?? sessionBrief.goal}</p>
      )}
    </div>
  );
}
