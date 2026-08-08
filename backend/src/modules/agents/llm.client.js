import { callBedrock, isBedrockConfigured } from './bedrock.client.js';
import { callOpenAI, isOpenAiConfigured } from './openai.client.js';

export function isLlmConfigured() {
  return isBedrockConfigured() || isOpenAiConfigured();
}

export async function callLLM(messages, jsonMode = false) {
  if (isBedrockConfigured()) {
    const result = await callBedrock(messages, jsonMode);
    if (result) return result;
  }

  if (isOpenAiConfigured()) {
    return callOpenAI(messages, jsonMode);
  }

  return null;
}

export { isBedrockConfigured, isOpenAiConfigured };
