import { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import MeetingRoom from '../../components/livekit/MeetingRoom.jsx';
import LiveVoiceSession from '../../components/voice/LiveVoiceSession.jsx';
import TranscriptPanel from '../../components/meeting/TranscriptPanel.jsx';
import TranscriptInput from '../../components/meeting/TranscriptInput.jsx';
import CustomerStatePanel from '../../components/training/CustomerStatePanel.jsx';
import SessionBriefCard from '../../components/training/SessionBriefCard.jsx';
import { useTrainingSession } from '../../hooks/useTrainingSession.js';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition.js';
import { useTextToSpeech } from '../../hooks/useTextToSpeech.js';
import { getLanguageConfig } from '../../config/sessionPreferences.js';
import { trainingApi } from '../../services/api.js';
import { logApiError } from '../../utils/apiError.js';

function SessionTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = startTime ? new Date(startTime).getTime() : Date.now();
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [startTime]);
  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const secs = (elapsed % 60).toString().padStart(2, '0');
  return (
    <div className="flex items-center gap-2 text-slate-400 text-sm">
      <Clock className="w-4 h-4" />
      <span className="font-mono">{mins}:{secs}</span>
    </div>
  );
}

export default function SimulationPage() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const sessionData = location.state?.sessionData;

  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [ending, setEnding] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  const language = location.state?.language ?? sessionData?.sessionBrief?.language ?? 'en';
  const langConfig = getLanguageConfig(language);

  const handleCustomerReplyRef = useRef(null);

  const { transcript, customerState, sessionBrief, thinking, aiMode, stateDeltas, appendTurn } = useTrainingSession(sessionId, {
    enabled: !sessionEnded,
    onCustomerReply: (text) => handleCustomerReplyRef.current?.(text),
  });

  const brief = sessionBrief ?? sessionData?.sessionBrief;
  const customerPersona = brief?.persona ?? 'father';
  const customerVoice = brief?.voiceGender ?? location.state?.voiceGender ?? 'female';

  const { speak, speaking: customerSpeaking, provider: ttsProvider, voiceInfo, ttsError } = useTextToSpeech({
    language,
    voiceGender: customerVoice,
    persona: customerPersona,
  });

  handleCustomerReplyRef.current = speak;

  const openingSpokenRef = useRef(false);
  const openingLine = location.state?.openingLine ?? sessionData?.openingLine;

  useEffect(() => {
    if (!openingLine || openingSpokenRef.current || sessionEnded) return;
    openingSpokenRef.current = true;
    speak(openingLine);
  }, [openingLine, speak, sessionEnded]);

  const demoMode = !sessionData?.tokens?.salesToken || sessionData.tokens.salesToken.startsWith('demo-');
  const liveActive = !sessionEnded;
  const livekitEnabled = Boolean(sessionData?.tokens?.salesToken && sessionData?.livekitUrl && !demoMode);

  const speechEnabled = liveActive && !isMuted && !customerSpeaking && !thinking;

  const { listening, supported, error: speechError, provider: sttProvider } = useSpeechRecognition({
    onResult: (_speaker, text) => appendTurn(text),
    enabled: speechEnabled,
    speaker: 'sales_executive',
    lang: langConfig.speechLang,
  });

  async function endSession() {
    if (!confirm('End this simulation? Your performance will be evaluated.')) return;
    setEnding(true);
    try {
      await trainingApi.endSession(sessionId);
      setSessionEnded(true);
      navigate(`/train/${sessionId}/debrief`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to end session');
    } finally {
      setEnding(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/train')} className="p-2 rounded-full hover:bg-white/5 text-slate-400">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-medium">Training Simulation</h1>
              <p className="text-xs text-slate-500">
                {brief?.displayName ?? brief?.customerName ?? 'Customer'}
                {brief?.objective && ` · ${brief.objective.replace(/_/g, ' ')}`}
              </p>
            </div>
          </div>
          {liveActive && <SessionTimer startTime={sessionData?.startTime} />}
        </div>
      </header>

      {liveActive && livekitEnabled && (
        <MeetingRoom
          token={sessionData.tokens.salesToken}
          serverUrl={sessionData.livekitUrl}
          onConnected={() => setIsConnected(true)}
          onDisconnected={() => setIsConnected(false)}
          onError={(err) => logApiError('livekit', err)}
        />
      )}

      <main className="max-w-6xl mx-auto px-4 py-6">
        {aiMode === 'mock' && (
          <div className="mb-4 rounded-lg border border-amber-500/60 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
            ⚠ SIMULATION MODE — the AI service is unavailable, so customer replies and scoring
            are deterministic stand-ins. Check OPENAI_API_KEY / the /health endpoint.
          </div>
        )}
        {brief && (
          <div className="mb-6">
            <SessionBriefCard sessionBrief={brief} />
          </div>
        )}

        {liveActive && ttsProvider === 'polly' && (
          <div className="mb-4 rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm text-violet-300">
            🔊 Customer voice: {voiceInfo?.label ?? 'Amazon Polly · Indian accent'}
          </div>
        )}
        {liveActive && ttsProvider === 'browser' && (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
            🔊 Using browser voice — Polly not connected. Check AWS IAM credentials and refresh the page.
          </div>
        )}
        {liveActive && ttsError && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            Polly error: {ttsError}
          </div>
        )}
        {liveActive && sttProvider === 'transcribe' && (
          <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
            🎙 Voice input via Amazon Transcribe — speak naturally, pauses are detected automatically.
          </div>
        )}
        {liveActive && (!supported || speechError) && (
          <div className="mb-4 rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm text-sky-300">
            🎙 Voice is unavailable ({!supported ? 'browser does not support speech recognition' : 'microphone blocked'}).
            Continue the conversation by typing below — scoring works the same.
          </div>
        )}
        {liveActive && (
          <LiveVoiceSession
            compact={!supported || Boolean(speechError)}
            connected={isConnected || demoMode}
            muted={isMuted}
            listening={listening && supported}
            aiSpeaking={customerSpeaking}
            thinking={thinking}
            error={speechError}
            customerName={brief?.customerName ?? 'Customer'}
            personaIndex={0}
            lockPersona
            languageLabel={langConfig.label}
            onToggleMute={() => setIsMuted((m) => !m)}
            onEndCall={endSession}
            ending={ending}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
          <div className="lg:col-span-2 space-y-4">
            <TranscriptPanel transcript={transcript} />
            {liveActive && (
              <TranscriptInput
                mode="training"
                onSubmit={(_speaker, text) => appendTurn(text)}
                disabled={sessionEnded}
              />
            )}
          </div>
          <div className="space-y-4">
            <CustomerStatePanel
              customerState={customerState ?? sessionData?.customerState}
              stateDeltas={stateDeltas}
              updating={thinking}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
