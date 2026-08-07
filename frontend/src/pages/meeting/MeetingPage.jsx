import { useEffect, useState, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wifi, WifiOff, Clock, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import MeetingRoom from '../../components/livekit/MeetingRoom.jsx';
import LiveVoiceSession from '../../components/voice/LiveVoiceSession.jsx';
import TranscriptPanel from '../../components/meeting/TranscriptPanel.jsx';
import TranscriptInput from '../../components/meeting/TranscriptInput.jsx';
import SuggestionsPanel from '../../components/meeting/SuggestionsPanel.jsx';
import EmotionCard from '../../components/meeting/EmotionCard.jsx';
import LeadScoreCard from '../../components/meeting/LeadScoreCard.jsx';
import MeetingSummaryPanel from '../../components/meeting/MeetingSummaryPanel.jsx';
import { useMeetingInsights } from '../../hooks/useMeetingInsights.js';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition.js';
import { useTextToSpeech } from '../../hooks/useTextToSpeech.js';
import { getLanguageConfig, loadSessionPrefs } from '../../config/sessionPreferences.js';
import { AI_PERSONAS } from '../../components/voice/VoiceOrb.jsx';
import { livekitApi } from '../../services/api.js';
import { logApiError } from '../../utils/apiError.js';

function resolvePersonaIndex(roomData, sessionFromState) {
  if (sessionFromState?.personaIndex != null) return sessionFromState.personaIndex;
  if (roomData?.voicePersona) {
    const idx = AI_PERSONAS.findIndex((p) => p.id === roomData.voicePersona);
    if (idx >= 0) return idx;
  }
  return loadSessionPrefs().personaIndex ?? 0;
}

function MeetingTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = startTime ? new Date(startTime).getTime() : Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const secs = (elapsed % 60).toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-2 text-slate-400 text-sm">
      <Clock className="w-4 h-4" />
      <span className="font-mono tabular-nums">{mins}:{secs}</span>
    </div>
  );
}

export default function MeetingPage() {
  const { meetingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const roomData = location.state?.roomData;

  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [ending, setEnding] = useState(false);
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [token, setToken] = useState(roomData?.token);
  const [livekitUrl, setLivekitUrl] = useState(
    roomData?.livekitUrl || import.meta.env.VITE_LIVEKIT_URL
  );
  const [inviteLink, setInviteLink] = useState(
    roomData?.inviteLink ? `${window.location.origin}${roomData.inviteLink}` : null
  );

  const sessionFromState = location.state?.session;

  const [session] = useState(() => ({
    language: roomData?.language || sessionFromState?.language || loadSessionPrefs().language,
    voiceGender: roomData?.voiceGender || sessionFromState?.voiceGender || loadSessionPrefs().voiceGender,
    personaIndex: resolvePersonaIndex(roomData, sessionFromState),
  }));

  const langConfig = getLanguageConfig(session.language);

  const demoMode = !token || token.startsWith('demo-');
  const liveActive = !meetingEnded && (isConnected || demoMode);

  const { speak, speaking: aiSpeaking } = useTextToSpeech({
    language: session.language,
    voiceGender: session.voiceGender,
  });

  const handleAiReply = useCallback((replyText) => {
    speak(replyText);
  }, [speak]);

  const {
    transcript,
    suggestions,
    emotion,
    leadScore,
    leadStatus,
    leadReasons,
    summary,
    loadSummary,
    appendTranscript,
    thinking,
  } = useMeetingInsights(meetingId, { enabled: true, demoMode, onAiReply: handleAiReply });

  const speechEnabled = liveActive && !isMuted && !aiSpeaking && !thinking;

  const { listening, supported, error: speechError } = useSpeechRecognition({
    onResult: appendTranscript,
    enabled: speechEnabled,
    speaker: 'sales_executive',
    lang: langConfig.speechLang,
  });

  useEffect(() => {
    async function loadRoomData() {
      if (roomData) return;
      if (!meetingId) return;

      try {
        const { data: meeting } = await livekitApi.getMeeting(meetingId);
        if (meeting?.status === 'ended') {
          setMeetingEnded(true);
          loadSummary();
          return;
        }
        if (meeting?.status === 'active') {
          const { data } = await livekitApi.getSalesToken(meetingId);
          setToken(data.token);
          setLivekitUrl(data.livekitUrl || import.meta.env.VITE_LIVEKIT_URL);
          setInviteLink(data.inviteLink ? `${window.location.origin}${data.inviteLink}` : null);
        }
      } catch (err) {
        logApiError('meeting/load', err);
      }
    }
    loadRoomData();
  }, [meetingId, roomData, loadSummary]);

  const handleConnected = useCallback(() => setIsConnected(true), []);
  const handleDisconnected = useCallback(() => setIsConnected(false), []);

  async function endCall() {
    if (!confirm('End this meeting?')) return;
    setEnding(true);
    try {
      await livekitApi.endMeeting(meetingId);
      setMeetingEnded(true);
      loadSummary();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to end meeting');
    } finally {
      setEnding(false);
    }
  }

  function copyInviteLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-medium text-white">
                {meetingEnded ? 'Meeting Summary' : 'Live Session'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {liveActive && <MeetingTimer startTime={roomData?.startTime} />}
            <div className={`flex items-center gap-1.5 text-xs ${isConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
              {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {isConnected ? 'Live' : 'Connecting'}
            </div>
            {inviteLink && liveActive && (
              <button
                type="button"
                onClick={copyInviteLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-slate-300 hover:text-white text-xs transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Invite'}
              </button>
            )}
          </div>
        </div>
      </header>

      {!meetingEnded && (
        <MeetingRoom
          token={token}
          serverUrl={livekitUrl}
          onConnected={handleConnected}
          onDisconnected={handleDisconnected}
          onError={(err) => logApiError('livekit', err)}
        />
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {liveActive && (
          <LiveVoiceSession
            connected={isConnected || demoMode}
            muted={isMuted}
            listening={listening && supported}
            aiSpeaking={aiSpeaking}
            thinking={thinking}
            error={speechError}
            customerName={roomData?.customerName}
            personaIndex={session.personaIndex}
            lockPersona
            languageLabel={langConfig.label}
            onToggleMute={() => setIsMuted((m) => !m)}
            onEndCall={endCall}
            onToggleRecording={() => setIsRecording((r) => !r)}
            isRecording={isRecording}
            ending={ending}
          />
        )}

        {liveActive && (
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="mt-6 w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-500 hover:text-slate-300 transition"
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showDetails ? 'Hide conversation details' : 'Show conversation details'}
          </button>
        )}

        {(showDetails || meetingEnded) && (
          <div className={`grid grid-cols-1 lg:grid-cols-3 gap-5 ${liveActive ? 'mt-4' : 'mt-0'}`}>
            <div className="lg:col-span-2 space-y-5">
              <TranscriptPanel transcript={transcript} />
              {liveActive && (
                <TranscriptInput onSubmit={appendTranscript} disabled={meetingEnded} />
              )}
            </div>

            <div className="space-y-5">
              {liveActive && <SuggestionsPanel suggestions={suggestions} />}
              <EmotionCard emotion={emotion.emotion} confidence={emotion.confidence} />
              <LeadScoreCard score={leadScore} status={leadStatus} reasons={leadReasons} />
            </div>
          </div>
        )}

        {(meetingEnded || summary?.overview) && (
          <div className="mt-6">
            <MeetingSummaryPanel summary={summary} />
          </div>
        )}
      </main>
    </div>
  );
}
