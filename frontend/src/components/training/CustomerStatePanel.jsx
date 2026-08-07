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

export default function CustomerStatePanel({ customerState }) {
  if (!customerState) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Customer State</h3>
      <div className="space-y-3">
        {Object.entries(STATE_LABELS).map(([key, label]) => {
          const value = customerState[key] ?? 0;
          const color = key === 'academicAnxiety' || key === 'competitorAffinity'
            ? value > 60 ? 'bg-red-500' : 'bg-emerald-500'
            : value > 60 ? 'bg-emerald-500' : 'bg-amber-500';

          return (
            <div key={key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">{label}</span>
                <span className="text-slate-300 font-mono">{value}</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${value}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
