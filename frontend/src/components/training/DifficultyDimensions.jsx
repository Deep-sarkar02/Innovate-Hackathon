const DIM_LABELS = {
  knowledge: 'Knowledge',
  emotion: 'Emotion',
  budget: 'Budget',
  timePressure: 'Time Pressure',
  competitorLoyalty: 'Competitor Loyalty',
  decisionAuthority: 'Decision Authority',
};

function StarRating({ value, max = 5, light = false }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < value ? (light ? 'text-amber-500' : 'text-amber-400') : (light ? 'text-slate-300' : 'text-slate-700')}>★</span>
      ))}
    </div>
  );
}

export default function DifficultyDimensions({ difficulty, variant = 'dark' }) {
  if (!difficulty) return null;
  const light = variant === 'light';

  return (
    <div className={light ? 'bg-white border border-slate-200 rounded-xl p-5 shadow-sm' : 'bg-slate-900 border border-slate-800 rounded-2xl p-5'}>
      <h3 className={`text-sm font-semibold mb-4 ${light ? 'text-slate-900' : 'text-white'}`}>Difficulty Profile</h3>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(DIM_LABELS).map(([key, label]) => (
          <div key={key} className="flex flex-col gap-1">
            <span className={`text-xs ${light ? 'text-slate-500' : 'text-slate-400'}`}>{label}</span>
            <StarRating value={difficulty[key] ?? 3} light={light} />
          </div>
        ))}
      </div>
    </div>
  );
}
