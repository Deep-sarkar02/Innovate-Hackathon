import OpenAI from 'openai';
import { env, isKimiConfigured } from '../../config/env.js';

const BASE_URL = 'https://api.moonshot.ai/v1';
const TIMEOUT_MS = 120_000;

let client;
if (isKimiConfigured()) {
  client = new OpenAI({
    apiKey: env.kimiApiKey,
    baseURL: BASE_URL,
    timeout: TIMEOUT_MS,
    maxRetries: 0,
  });
}

const status = {
  configured: Boolean(client),
  lastError: null,
  lastErrorAt: null,
  lastSuccessAt: null,
};

function prepareMessages(messages, jsonMode) {
  if (!jsonMode) return messages;

  return messages.map((m) =>
    m.role === 'system'
      ? {
          ...m,
          content: `${m.content}\n\nRespond with valid JSON only. No markdown fences or extra text.`,
        }
      : m
  );
}

function stripJsonFences(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

export async function callKimi(messages, jsonMode = false, options = {}) {
  if (!client) return null;

  const reasoningEffort = options.reasoning_effort ?? (jsonMode ? 'high' : 'low');

  try {
    const response = await client.chat.completions.create({
      model: env.kimiModel,
      messages: prepareMessages(messages, jsonMode),
      max_tokens: options.max_tokens ?? 4096,
      reasoning_effort: reasoningEffort,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    });

    const text = response.choices[0]?.message?.content;
    if (!text) return null;

    status.lastSuccessAt = new Date();
    status.lastError = null;

    return jsonMode ? stripJsonFences(text) : text;
  } catch (err) {
    status.lastError = `${err.name ?? 'Error'}: ${err.message}`;
    status.lastErrorAt = new Date();
    console.warn('[kimi] Call failed:', status.lastError);
    return null;
  }
}

export function getKimiStatus() {
  return { ...status, model: env.kimiModel };
}

export { isKimiConfigured };
