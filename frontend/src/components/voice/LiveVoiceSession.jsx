import { useState, useEffect } from 'react';
import { Mic, MicOff, PhoneOff, Circle } from 'lucide-react';
import VoiceOrb, { AI_PERSONAS, getVoiceState, getStateLabel } from './VoiceOrb.jsx';

export default function LiveVoiceSession({
  connected,
  muted,
  listening,
  aiSpeaking,
  thinking,
  error,
  personaIndex = 0,
  lockPersona = false,
  languageLabel,
  onPersonaChange,
  onToggleMute,
  onEndCall,
  onToggleRecording,
  isRecording,
  ending,
  showRecording = true,
  customerName,
  compact = false,
}) {
  const [localPersona, setLocalPersona] = useState(personaIndex);
  const persona = AI_PERSONAS[localPersona] ?? AI_PERSONAS[0];
  const voiceState = getVoiceState({ connected, muted, listening, aiSpeaking, thinking, error });
  const statusLabel = error ? error : getStateLabel(voiceState);

  useEffect(() => {
    setLocalPersona(personaIndex);
  }, [personaIndex]);
  function selectPersona(index) {
    setLocalPersona(index);
    onPersonaChange?.(index);
  }

  if (compact) {
    return (
      <div className="live-voice-panel flex flex-col items-center py-8 px-4">
        <VoiceOrb state={voiceState} persona={persona} size="md" />
        <h2 className="mt-6 text-2xl font-semibold text-white tracking-tight">{persona.name}</h2>
        <p className="mt-1 text-sm text-slate-400 italic">{persona.tagline}</p>
        <p className="mt-3 text-sm text-slate-300 live-voice-fade-in">{statusLabel}</p>
      </div>
    );
  }

  return (
    <section className="live-voice-panel relative overflow-hidden rounded-3xl border border-white/5 bg-black/40 backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-b from-sky-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative flex flex-col items-center pt-10 pb-6 px-6">
        <VoiceOrb state={voiceState} persona={persona} size="lg" />

        <div className="mt-8 text-center live-voice-fade-in">
          <h2 className="text-3xl font-semibold text-white tracking-tight">{persona.name}</h2>
          <p className="mt-1.5 text-base text-slate-400 italic font-light">{persona.tagline}</p>
        </div>

        <p
          key={statusLabel}
          className="mt-5 text-sm font-medium text-slate-300 live-voice-fade-in min-h-[20px]"
        >
          {customerName && voiceState === 'listening' && (
            <span className="text-slate-500">{customerName} · </span>
          )}
          {statusLabel}
        </p>

        {languageLabel && (
          <p className="mt-2 text-xs text-slate-500">{languageLabel} · {persona.name}</p>
        )}

        {!lockPersona && (
        <div className="flex items-center gap-2 mt-6">
          {AI_PERSONAS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => selectPersona(i)}
              className={`live-voice-dot ${i === localPersona ? 'live-voice-dot--active' : ''}`}
              aria-label={`Select ${p.name} voice`}
            />
          ))}
        </div>
        )}
      </div>

      <div className="relative flex items-center justify-center gap-5 pb-8 pt-2">
        <button
          type="button"
          onClick={onToggleMute}
          disabled={!connected}
          className={`group relative p-5 rounded-full transition-all duration-300 ${
            muted
              ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30'
              : 'bg-white/5 text-white hover:bg-white/10 ring-1 ring-white/10'
          } disabled:opacity-40`}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {showRecording && (
          <button
            type="button"
            onClick={onToggleRecording}
            disabled={!connected}
            className={`p-5 rounded-full transition-all duration-300 ring-1 ${
              isRecording
                ? 'bg-red-500/15 text-red-400 ring-red-500/30 animate-pulse'
                : 'bg-white/5 text-white hover:bg-white/10 ring-white/10'
            } disabled:opacity-40`}
            title={isRecording ? 'Stop recording' : 'Record'}
          >
            <Circle className={`w-6 h-6 ${isRecording ? 'fill-red-400' : ''}`} />
          </button>
        )}

        <button
          type="button"
          onClick={onEndCall}
          disabled={ending}
          className="p-5 rounded-full bg-white text-black hover:bg-slate-200 transition-all duration-300 disabled:opacity-50 shadow-lg shadow-white/10"
          title="End call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </section>
  );
}
