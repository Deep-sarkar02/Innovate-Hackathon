import { callBedrock, isBedrockConfigured } from './bedrock.client.js';
import { callKimi, isKimiConfigured } from './kimi.client.js';
import { callOpenAI, isOpenAiConfigured } from './openai.client.js';

export function isLlmConfigured() {
  return isKimiConfigured() || isBedrockConfigured() || isOpenAiConfigured();
}

export async function callLLM(messages, jsonMode = false, options = {}) {
  if (isKimiConfigured()) {
    const result = await callKimi(messages, jsonMode, options);
    if (result) return result;
  }

  if (isBedrockConfigured()) {
    const result = await callBedrock(messages, jsonMode, options);
    if (result) return result;
  }

  if (isOpenAiConfigured()) {
    return callOpenAI(messages, jsonMode);
  }

  return null;
}

export { isBedrockConfigured, isKimiConfigured, isOpenAiConfigured };
