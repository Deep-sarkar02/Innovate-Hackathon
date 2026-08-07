import './voice-orb.css';

export const AI_PERSONAS = [
  {
    id: 'arbor',
    name: 'Arbor',
    tagline: 'Easygoing and versatile',
    accent: '#38bdf8',
    deep: '#0284c7',
  },
  {
    id: 'nova',
    name: 'Nova',
    tagline: 'Confident and persuasive',
    accent: '#818cf8',
    deep: '#4f46e5',
  },
  {
    id: 'ember',
    name: 'Ember',
    tagline: 'Warm and empathetic',
    accent: '#fb923c',
    deep: '#ea580c',
  },
];

export function getVoiceState({ connected, muted, listening, aiSpeaking, thinking, error }) {
  if (error) return 'idle';
  if (!connected) return 'connecting';
  if (muted) return 'muted';
  if (aiSpeaking) return 'speaking';
  if (thinking) return 'thinking';
  if (listening) return 'listening';
  return 'idle';
}

const STATE_LABELS = {
  connecting: 'Connecting to room…',
  idle: 'Ready — start speaking',
  listening: 'Listening to you',
  thinking: 'Thinking…',
  speaking: 'AI is responding',
  muted: 'Microphone muted',
};

export function getStateLabel(state) {
  return STATE_LABELS[state] || STATE_LABELS.idle;
}

export default function VoiceOrb({ state = 'idle', persona = AI_PERSONAS[0], size = 'md' }) {
  return (
    <div
      className={`voice-orb-scene ${size === 'lg' ? 'voice-orb-scene--lg' : ''}`}
      data-state={state}
      style={{
        '--orb-accent': persona.accent,
        '--orb-deep': persona.deep,
      }}
      aria-hidden="true"
    >
      <div className="voice-orb-ring" />
      <div className="voice-orb-ring" />
      <div className="voice-orb-ring" />
      <div
        className="voice-orb-glow"
        style={{ background: `radial-gradient(circle, ${persona.accent} 0%, transparent 70%)` }}
      />
      <div className="voice-orb-core">
        <div className="voice-orb-base" />
        <div className="voice-orb-layer voice-orb-layer--1" />
        <div className="voice-orb-layer voice-orb-layer--2" />
        <div className="voice-orb-layer voice-orb-layer--3" />
      </div>
    </div>
  );
}
