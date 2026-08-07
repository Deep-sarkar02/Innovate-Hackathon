import { useEffect, useState, useCallback, useRef } from 'react';
import { trainingApi } from '../services/api.js';
import { logApiError } from '../utils/apiError.js';

export function useTrainingSession(sessionId, { enabled = true, onCustomerReply } = {}) {
  const [transcript, setTranscript] = useState([]);
  const [customerState, setCustomerState] = useState(null);
  const [sessionBrief, setSessionBrief] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [aiMode, setAiMode] = useState(null); // 'llm' | 'mock'
  const processingRef = useRef(false);
  const onCustomerReplyRef = useRef(onCustomerReply);
  onCustomerReplyRef.current = onCustomerReply;

  useEffect(() => {
    if (!sessionId || !enabled) return;

    async function loadSession() {
      try {
        const { data } = await trainingApi.getSession(sessionId);
        setTranscript(data.transcript ?? []);
        setCustomerState(data.customerState);
        setSessionBrief(data.sessionBrief);
      } catch (err) {
        logApiError('training-session/load', err);
      }
    }
    loadSession();
  }, [sessionId, enabled]);

  const appendTurn = useCallback(
    async (text) => {
      if (!text.trim() || processingRef.current || !sessionId) return;
      processingRef.current = true;
      setThinking(true);

      try {
        const { data } = await trainingApi.appendTurn(sessionId, {
          speaker: 'sales_executive',
          text: text.trim(),
        });
        if (data.transcript) setTranscript(data.transcript);
        if (data.customerState) setCustomerState(data.customerState);
        if (data.aiMode) setAiMode(data.aiMode);
        if (data.customerReply?.text) onCustomerReplyRef.current?.(data.customerReply.text);
      } catch (err) {
        logApiError('training-session/turn', err);
      } finally {
        processingRef.current = false;
        setThinking(false);
      }
    },
    [sessionId]
  );

  return {
    transcript,
    customerState,
    sessionBrief,
    thinking,
    aiMode,
    appendTurn,
  };
}
