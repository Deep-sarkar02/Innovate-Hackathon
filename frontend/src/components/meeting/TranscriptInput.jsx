import { useState } from 'react';
import { Send } from 'lucide-react';

const COPILOT_SPEAKERS = [
  { value: 'customer', label: 'Customer' },
  { value: 'sales_executive', label: 'Sales Executive' },
  { value: 'ai', label: 'AI' },
];

const TRAINING_SPEAKERS = [
  { value: 'sales_executive', label: 'Sales Executive (You)' },
];

export default function TranscriptInput({ onSubmit, disabled, mode = 'copilot' }) {
  const speakers = mode === 'training' ? TRAINING_SPEAKERS : COPILOT_SPEAKERS;
  const [text, setText] = useState('');
  const [speaker, setSpeaker] = useState(speakers[0].value);

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit(speaker, text.trim());
    setText('');
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
      <p className="text-xs text-slate-500 mb-3">
        {mode === 'training'
          ? 'Speech is transcribed automatically. Type your side of the conversation below.'
          : 'Speech is transcribed automatically. You can also type corrections below.'}
      </p>
      <div className="flex gap-2">
        {mode !== 'training' && (
          <select
            id="transcript-speaker"
            name="speaker"
            value={speaker}
            onChange={(e) => setSpeaker(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {speakers.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        )}
        <input
          id="transcript-text"
          name="text"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mode === 'training' ? 'Type what you said as the sales rep...' : 'Type what was said...'}
          disabled={disabled}
          className="flex-1 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
