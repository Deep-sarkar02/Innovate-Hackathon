import OpenAI from 'openai';
import { env, isOpenAiConfigured } from '../../config/env.js';

/**
 * Hardened OpenAI client.
 *
 * Design decisions (second-order effects in mind):
 *  - max_tokens + request timeout: with 3-4 devs and live demo sessions all
 *    hitting this, an unbounded call is an unbounded bill and a hung request
 *    is a frozen conversation turn.
 *  - One retry, only on transient failures (429/5xx/timeouts).
 *  - FAILURES ARE LOUD: the previous client returned null on any error, and
 *    callers silently fell back to mock logic — meaning a dead API key during
 *    a demo produced fake scores with no visible signal. Now every caller can
 *    read WHY the last call failed via getAiStatus(), and agent responses tag
 *    themselves mode:'llm' | 'mock' so the UI can show a SIMULATION badge.
 */

const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 700;
const TIMEOUT_MS = 20_000;

let openai;
if (isOpenAiConfigured()) {
  openai = new OpenAI({ apiKey: env.openaiApiKey, timeout: TIMEOUT_MS, maxRetries: 0 });
}

const status = {
  configured: Boolean(openai),
  lastError: null,
  lastErrorAt: null,
  lastSuccessAt: null,
};

function isTransient(err) {
  const code = err?.status ?? err?.response?.status;
  return code === 429 || (code >= 500 && code < 600) || err?.name === 'APIConnectionTimeoutError';
}

export async function callOpenAI(messages, jsonMode = false) {
  if (!openai) return null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages,
        max_tokens: MAX_TOKENS,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        temperature: 0.7,
      });
      status.lastSuccessAt = new Date();
      status.lastError = null;
      return response.choices[0]?.message?.content ?? null;
    } catch (err) {
      status.lastError = `${err.name ?? 'Error'}: ${err.message}`;
      status.lastErrorAt = new Date();
      console.error(`[openai] call failed (attempt ${attempt + 1}/2):`, status.lastError);
      if (attempt === 0 && isTransient(err)) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      return null;
    }
  }
  return null;
}

/** Surface AI health to routes/agents so degradation is visible, not silent. */
export function getAiStatus() {
  return { ...status, configured: Boolean(openai) };
}

export { isOpenAiConfigured };
