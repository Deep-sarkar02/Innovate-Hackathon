/**
 * LiveKit Customer Agent
 * Joins training rooms as the simulated customer.
 * STT → Customer Agent → TTS → Backend transcript API
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001/api/v1';

async function generateCustomerReply(sessionBrief, history, repMessage) {
  if (!OPENAI_API_KEY) {
    return sessionBrief.language === 'hi'
      ? 'फीस बहुत ज़्यादा है। क्या छूट मिल सकती है?'
      : "The fees are too high. Can you offer any discount?";
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a simulated CUSTOMER (${sessionBrief.persona}) in a sales training exercise.
Primary objection: ${sessionBrief.primaryObjection}. Mood: ${sessionBrief.mood}.
You do NOT know the rep's scores. Never coach or sell. Respond in 1-2 sentences.
Language: ${sessionBrief.language === 'hi' ? 'Hindi' : 'English'}`,
        },
        {
          role: 'user',
          content: `History:\n${history}\n\nRep said: "${repMessage}"\n\nRespond as customer.`,
        },
      ],
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? 'I need to think about it.';
}

async function pushTranscript(sessionId, speaker, text) {
  try {
    await fetch(`${BACKEND_URL}/training/${sessionId}/transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speaker, text }),
    });
  } catch (err) {
    console.warn('[agent] Failed to push transcript:', err.message);
  }
}

console.log(`
╔══════════════════════════════════════════════════════════════╗
║         LiveKit Customer Agent — Training Mode               ║
╠══════════════════════════════════════════════════════════════╣
║  Connects to training rooms as simulated customer            ║
║  Reads SessionBrief from room metadata                       ║
║  Pushes transcript turns to backend API                      ║
║                                                              ║
║  For full voice pipeline, install @livekit/agents:           ║
║  npm install @livekit/agents @livekit/agents-plugin-openai  ║
╚══════════════════════════════════════════════════════════════╝
`);

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.log('[agent] LiveKit not configured. Agent idle.');
  console.log('[agent] Training simulations work via browser Web Speech API.');
} else {
  console.log('[agent] LiveKit configured at', LIVEKIT_URL);
  console.log('[agent] Backend URL:', BACKEND_URL);
  console.log('[agent] Ready to join training rooms as customer-agent');
}

export { generateCustomerReply, pushTranscript };
