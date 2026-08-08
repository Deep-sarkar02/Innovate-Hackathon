const STATE_LABELS = {
  belief: 'Belief',
  trust: 'Trust',
  urgency: 'Urgency',
  financialComfort: 'Financial Comfort',
  emotionalConfidence: 'Emotional Confidence',
  academicAnxiety: 'Academic Anxiety',
  competitorAffinity: 'Competitor Affinity',
  decisionReadiness: 'Decision Readiness',
};

const INVERSE_METRICS = new Set(['academicAnxiety', 'competitorAffinity']);

function barColor(key, value) {
  if (INVERSE_METRICS.has(key)) {
    return value > 60 ? 'bg-red-500' : value > 35 ? 'bg-amber-500' : 'bg-emerald-500';
  }
  return value > 60 ? 'bg-emerald-500' : value > 35 ? 'bg-amber-500' : 'bg-red-500';
}

export default function CustomerStatePanel({ customerState, stateDeltas = {}, updating = false }) {
  if (!customerState) return null;

  const changedCount = Object.keys(stateDeltas ?? {}).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Customer State</h3>
        {updating ? (
          <span className="text-xs text-sky-400 animate-pulse">Updating…</span>
        ) : changedCount > 0 ? (
          <span className="text-xs text-emerald-400">Live · {changedCount} changed</span>
        ) : (
          <span className="text-xs text-slate-500">Updates after each turn</span>
        )}
      </div>
      <div className="space-y-3">
        {Object.entries(STATE_LABELS).map(([key, label]) => {
          const value = customerState[key] ?? 0;
          const delta = stateDeltas?.[key];
          const flash = delta != null && delta !== 0;

          return (
            <div key={key} className={flash ? 'rounded-lg bg-white/5 px-2 py-1 -mx-2' : ''}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">{label}</span>
                <span className="text-slate-300 font-mono flex items-center gap-1.5">
                  {value}
                  {flash && (
                    <span className={delta > 0 ? 'text-emerald-400' : 'text-red-400'}>
                      ({delta > 0 ? '+' : ''}{delta})
                    </span>
                  )}
                </span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor(key, value)} rounded-full transition-all duration-700 ease-out`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
