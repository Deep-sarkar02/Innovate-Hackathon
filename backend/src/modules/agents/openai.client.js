import OpenAI from 'openai';
import { env, isOpenAiConfigured } from '../../config/env.js';

let openai;
if (isOpenAiConfigured()) {
  openai = new OpenAI({ apiKey: env.openaiApiKey });
}

export async function callOpenAI(messages, jsonMode = false) {
  if (!openai) return null;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      temperature: 0.7,
    });
    return response.choices[0]?.message?.content;
  } catch (err) {
    console.warn('[openai] Call failed:', err.message);
    return null;
  }
}

export { isOpenAiConfigured };
