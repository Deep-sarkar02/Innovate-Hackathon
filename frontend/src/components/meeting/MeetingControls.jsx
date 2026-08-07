import { Mic, MicOff, PhoneOff, Circle } from 'lucide-react';

export default function MeetingControls({
  isMuted,
  isConnected,
  isRecording,
  onToggleMute,
  onEndCall,
  onToggleRecording,
  ending,
}) {
  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <button
        onClick={onToggleMute}
        disabled={!isConnected}
        className={`p-4 rounded-full transition ${
          isMuted
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'bg-slate-800 text-white hover:bg-slate-700'
        } disabled:opacity-40`}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
      </button>

      <button
        onClick={onToggleRecording}
        disabled={!isConnected}
        className={`p-4 rounded-full transition ${
          isRecording
            ? 'bg-red-500/20 text-red-400 animate-pulse'
            : 'bg-slate-800 text-white hover:bg-slate-700'
        } disabled:opacity-40`}
        title={isRecording ? 'Stop Recording' : 'Start Recording'}
      >
        <Circle className={`w-6 h-6 ${isRecording ? 'fill-red-400' : ''}`} />
      </button>

      <button
        onClick={onEndCall}
        disabled={ending}
        className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
        title="End Call"
      >
        <PhoneOff className="w-6 h-6" />
      </button>
    </div>
  );
}
