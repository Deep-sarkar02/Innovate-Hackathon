import { Flame, Thermometer, Snowflake } from 'lucide-react';

const STATUS_CONFIG = {
  hot: { icon: Flame, label: 'Hot Lead', color: 'text-red-400', bg: 'bg-red-500/10' },
  warm: { icon: Thermometer, label: 'Warm Lead', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  cold: { icon: Snowflake, label: 'Cold Lead', color: 'text-blue-400', bg: 'bg-blue-500/10' },
};

export default function LeadScoreCard({ score, status, reasons }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.warm;
  const Icon = config.icon;

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
      <h3 className="font-semibold text-white mb-4">Lead Qualification</h3>

      <div className="flex items-center gap-4 mb-4">
        <div className="text-4xl font-bold text-white">{score ?? '—'}</div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg}`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
        </div>
      </div>

      <div className="w-full bg-slate-800 rounded-full h-2 mb-4">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-500"
          style={{ width: `${score ?? 0}%` }}
        />
      </div>

      {reasons?.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-2">Reasons</p>
          <ul className="space-y-1">
            {reasons.map((r, i) => (
              <li key={i} className="text-sm text-slate-300 flex items-center gap-2">
                <span className="text-green-400">✓</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
