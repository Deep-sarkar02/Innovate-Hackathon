import { Lightbulb, CheckCircle2 } from 'lucide-react';

export default function SuggestionsPanel({ suggestions }) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-amber-400" />
        <h3 className="font-semibold text-white">AI Suggestions</h3>
        <span className="text-xs text-slate-500 ml-auto">Updated every 5s</span>
      </div>

      {suggestions.length === 0 ? (
        <p className="text-slate-500 text-sm">Suggestions will appear during conversation...</p>
      ) : (
        <ul className="space-y-2">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-sm text-slate-200"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
