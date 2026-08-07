import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Wifi, WifiOff } from 'lucide-react';
import MeetingRoom from '../../components/livekit/MeetingRoom.jsx';
import LiveVoiceSession from '../../components/voice/LiveVoiceSession.jsx';
import { AI_PERSONAS } from '../../components/voice/VoiceOrb.jsx';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition.js';
import { useTextToSpeech } from '../../hooks/useTextToSpeech.js';
import { getLanguageConfig } from '../../config/sessionPreferences.js';
import { livekitApi, aiApi } from '../../services/api.js';

function personaIndexFromId(id) {
  const idx = AI_PERSONAS.findIndex((p) => p.id === id);
  return idx >= 0 ? idx : 0;
}

export default function JoinPage() {
  const { inviteToken } = useParams();
  const [customerName, setCustomerName] = useState('');
  const [joined, setJoined] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const language = roomData?.language || 'en';
  const voiceGender = roomData?.voiceGender || 'female';
  const langConfig = getLanguageConfig(language);
  const personaIndex = personaIndexFromId(roomData?.voicePersona);

  const demoMode = joined && (!roomData?.token || roomData.token.startsWith('demo-'));
  const liveActive = joined && (isConnected || demoMode);

  const { speak, speaking: aiSpeaking } = useTextToSpeech({ language, voiceGender });

  const appendCustomerSpeech = useCallback(async (_speaker, text) => {
    if (!roomData?.meetingId) return;
    setThinking(true);
    try {
      const { data } = await aiApi.appendTranscript(roomData.meetingId, { speaker: 'customer', text });
      if (data.aiReply?.text) speak(data.aiReply.text);
    } catch (err) {
      console.error('Failed to save customer transcript', err);
    } finally {
      setThinking(false);
    }
  }, [roomData?.meetingId, speak]);

  const { listening, supported, error: speechError } = useSpeechRecognition({
    onResult: appendCustomerSpeech,
    enabled: liveActive && !isMuted && !aiSpeaking && !thinking,
    speaker: 'customer',
    lang: langConfig.speechLang,
  });

  async function handleJoin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await livekitApi.joinMeeting(inviteToken, { customerName });
      setRoomData(data);
      setJoined(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join meeting');
    } finally {
      setLoading(false);
    }
  }

  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <form onSubmit={handleJoin} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
          <h1 className="text-2xl font-semibold text-white mb-2">Join Meeting</h1>
          <p className="text-slate-400 mb-8 text-sm">You've been invited to a live sales consultation.</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <label className="block mb-6">
            <span className="text-sm text-slate-400 mb-2 block">Your Name</span>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-white text-black font-semibold hover:bg-slate-100 transition disabled:opacity-50"
          >
            {loading ? 'Joining…' : 'Join Meeting'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <header className="border-b border-white/5 bg-black/80 backdrop-blur-xl px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-medium text-white">Sales Consultation</h1>
            <p className="text-xs text-slate-500">{roomData.customerName}</p>
          </div>
          <div className={`flex items-center gap-1.5 text-xs ${isConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
            {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isConnected ? 'Live' : 'Connecting'}
          </div>
        </div>
      </header>

      <MeetingRoom
        token={roomData.token}
        serverUrl={roomData.livekitUrl || import.meta.env.VITE_LIVEKIT_URL}
        onConnected={() => setIsConnected(true)}
        onDisconnected={() => setIsConnected(false)}
      />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-lg mx-auto w-full">
        {liveActive && (
          <LiveVoiceSession
            connected={isConnected || demoMode}
            muted={isMuted}
            listening={listening && supported}
            aiSpeaking={aiSpeaking}
            thinking={thinking}
            error={speechError}
            personaIndex={personaIndex}
            lockPersona
            languageLabel={langConfig.label}
            onToggleMute={() => setIsMuted((m) => !m)}
            onEndCall={() => window.close()}
            showRecording={false}
          />
        )}
      </main>
    </div>
  );
}
