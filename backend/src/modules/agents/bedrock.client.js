import OpenAI from 'openai';
import { env, isBedrockConfigured } from '../../config/env.js';

const BASE_URL = `https://bedrock-mantle.${env.awsRegion}.api.aws/v1`;

let client;
if (isBedrockConfigured()) {
  client = new OpenAI({
    apiKey: env.bedrockApiKey,
    baseURL: BASE_URL,
  });
}

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

export async function callBedrock(messages, jsonMode = false, options = {}) {
  if (!client) return null;

  try {
    const response = await client.chat.completions.create({
      model: env.bedrockModel,
      messages: prepareMessages(messages, jsonMode),
      max_tokens: options.max_tokens ?? 4096,
      temperature: options.temperature ?? (jsonMode ? 0.3 : 0.5),
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    });

    const text = response.choices[0]?.message?.content;
    if (!text) return null;

    return jsonMode ? stripJsonFences(text) : text;
  } catch (err) {
    console.warn('[bedrock] Call failed:', err.message);
    return null;
  }
}

export { isBedrockConfigured };
