import { useEffect, useState, useCallback, useRef } from 'react';
import { aiApi } from '../services/api.js';
import { logApiError } from '../utils/apiError.js';

const DEMO_MESSAGES = [
  { speaker: 'customer', text: 'Hello, I am interested in your program.' },
  { speaker: 'ai', text: 'Good afternoon! Thank you for your interest. How can I help you today?' },
  { speaker: 'customer', text: 'I want to know about the pricing and if there is a demo available.' },
  { speaker: 'ai', text: 'Absolutely! We offer flexible EMI plans and a free demo session. Would you like me to schedule one?' },
  { speaker: 'customer', text: 'The price seems a bit high. My parent will need to decide.' },
];

export function useMeetingInsights(meetingId, { enabled = true, demoMode = false, onAiReply } = {}) {
  const [transcript, setTranscript] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [emotion, setEmotion] = useState({ emotion: 'neutral', confidence: 0 });
  const [leadScore, setLeadScore] = useState(50);
  const [leadStatus, setLeadStatus] = useState('warm');
  const [leadReasons, setLeadReasons] = useState([]);
  const [summary, setSummary] = useState(null);
  const [thinking, setThinking] = useState(false);
  const demoIndex = useRef(0);

  const analyze = useCallback(async () => {
    if (!meetingId || !enabled) return;
    try {
      const { data } = await aiApi.analyze(meetingId);
      setSuggestions(data.suggestions || []);
      setEmotion(data.emotion || { emotion: 'neutral', confidence: 0 });
      setLeadScore(data.leadScore ?? 50);
      setLeadStatus(data.leadStatus || 'warm');
      setLeadReasons(data.leadReasons || []);
    } catch (err) {
      logApiError('meeting/analyze', err);
    }
  }, [meetingId, enabled]);

  const onAiReplyRef = useRef(onAiReply);
  onAiReplyRef.current = onAiReply;
  const processingRef = useRef(false);

  const appendTranscript = useCallback(
    async (speaker, text) => {
      if (!text.trim() || processingRef.current) return;
      processingRef.current = true;
      setThinking(true);

      try {
        if (meetingId) {
          const { data } = await aiApi.appendTranscript(meetingId, { speaker, text: text.trim() });
          if (data.transcript) setTranscript(data.transcript);
          if (data.aiReply?.text) onAiReplyRef.current?.(data.aiReply.text);
        } else {
          setTranscript((prev) => [...prev, { speaker, text, timestamp: new Date().toISOString() }]);
        }
      } catch (err) {
        logApiError('meeting/transcript', err);
      } finally {
        processingRef.current = false;
        setThinking(false);
      }
    },
    [meetingId]
  );

  const loadSummary = useCallback(async () => {
    if (!meetingId) return;
    try {
      const { data } = await aiApi.getSummary(meetingId);
      setSummary(data.summary || data);
    } catch (err) {
      logApiError('meeting/summary', err);
    }
  }, [meetingId]);

  useEffect(() => {
    if (!enabled || !demoMode) return;

    const interval = setInterval(() => {
      if (demoIndex.current < DEMO_MESSAGES.length) {
        const msg = DEMO_MESSAGES[demoIndex.current];
        appendTranscript(msg.speaker, msg.text);
        demoIndex.current += 1;
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [enabled, demoMode, appendTranscript]);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(analyze, 5000);
    analyze();
    return () => clearInterval(interval);
  }, [enabled, analyze]);

  useEffect(() => {
    if (!meetingId || !enabled) return;

    async function refreshTranscript() {
      try {
        const { data } = await aiApi.getTranscript(meetingId);
        if (data.transcript?.length) setTranscript(data.transcript);
      } catch {
        // ignore polling errors
      }
    }

    refreshTranscript();
    const interval = setInterval(refreshTranscript, 3000);
    return () => clearInterval(interval);
  }, [meetingId, enabled]);

  return {
    transcript,
    suggestions,
    emotion,
    leadScore,
    leadStatus,
    leadReasons,
    summary,
    appendTranscript,
    loadSummary,
    analyze,
    thinking,
  };
}
