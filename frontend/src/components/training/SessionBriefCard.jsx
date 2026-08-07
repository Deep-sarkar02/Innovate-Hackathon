export default function SessionBriefCard({ sessionBrief }) {
  if (!sessionBrief) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-2xl p-6">
      <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">Today&apos;s Training Plan</p>
      <h2 className="text-2xl font-bold text-white capitalize mb-4">
        {sessionBrief.objective?.replace(/_/g, ' ')}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-slate-500 text-xs">Persona</p>
          <p className="text-white capitalize">{sessionBrief.persona}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Mood</p>
          <p className="text-white capitalize">{sessionBrief.mood}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Objection</p>
          <p className="text-white capitalize">{sessionBrief.primaryObjection?.replace(/_/g, ' ')}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Cohort</p>
          <p className="text-white">{sessionBrief.cohortId} v{sessionBrief.cohortVersion}</p>
        </div>
      </div>
      <p className="text-slate-400 text-sm mt-4">{sessionBrief.goal}</p>
    </div>
  );
}
