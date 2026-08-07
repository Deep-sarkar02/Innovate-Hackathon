import { useEffect, useRef } from 'react';

const SPEAKER_LABELS = {
  customer: 'Customer',
  ai: 'AI',
  sales_executive: 'Sales Executive',
};

const SPEAKER_COLORS = {
  customer: 'text-blue-400',
  ai: 'text-emerald-400',
  sales_executive: 'text-amber-400',
};

export default function TranscriptPanel({ transcript, onExport }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  function exportTranscript() {
    const text = transcript
      .map((t) => `[${new Date(t.timestamp).toLocaleTimeString()}] ${SPEAKER_LABELS[t.speaker]}: ${t.text}`)
      .join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onExport?.();
  }

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col h-full backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <h3 className="font-semibold text-white">Live Transcript</h3>
        <button
          onClick={exportTranscript}
          disabled={transcript.length === 0}
          className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-slate-300 hover:text-white disabled:opacity-40 transition"
        >
          Export
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[200px] max-h-[320px]">
        {transcript.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">Waiting for conversation...</p>
        ) : (
          transcript.map((entry, i) => (
            <div key={i} className="animate-fade-in">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-sm font-medium ${SPEAKER_COLORS[entry.speaker]}`}>
                  {SPEAKER_LABELS[entry.speaker]}
                </span>
                <span className="text-xs text-slate-600">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-slate-200 text-sm leading-relaxed">{entry.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
