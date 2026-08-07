import { Mic, MicOff, AlertCircle } from 'lucide-react';

export default function SpeechStatus({ listening, supported, error, aiSpeaking }) {
  if (aiSpeaking) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs">
        <Mic className="w-4 h-4 shrink-0 animate-pulse" />
        AI is speaking — mic paused to avoid echo
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
        <AlertCircle className="w-4 h-4 shrink-0" />
        Speech-to-text not supported in this browser. Use Chrome or Edge, or type manually below.
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
        <AlertCircle className="w-4 h-4 shrink-0" />
        Speech recognition error: {error}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
      listening
        ? 'bg-green-500/10 border-green-500/30 text-green-400'
        : 'bg-slate-800 border-slate-700 text-slate-400'
    }`}>
      {listening ? (
        <>
          <Mic className="w-4 h-4 shrink-0 animate-pulse" />
          Listening — speak and your words will appear in the transcript
        </>
      ) : (
        <>
          <MicOff className="w-4 h-4 shrink-0" />
          Starting speech recognition...
        </>
      )}
    </div>
  );
}
