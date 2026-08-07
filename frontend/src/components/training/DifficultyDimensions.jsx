const DIM_LABELS = {
  knowledge: 'Knowledge',
  emotion: 'Emotion',
  budget: 'Budget',
  timePressure: 'Time Pressure',
  competitorLoyalty: 'Competitor Loyalty',
  decisionAuthority: 'Decision Authority',
};

function StarRating({ value, max = 5 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < value ? 'text-amber-400' : 'text-slate-700'}>★</span>
      ))}
    </div>
  );
}

export default function DifficultyDimensions({ difficulty }) {
  if (!difficulty) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Difficulty Profile</h3>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(DIM_LABELS).map(([key, label]) => (
          <div key={key} className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">{label}</span>
            <StarRating value={difficulty[key] ?? 3} />
          </div>
        ))}
      </div>
    </div>
  );
}
