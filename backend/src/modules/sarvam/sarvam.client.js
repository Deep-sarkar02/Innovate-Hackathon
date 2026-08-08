import { env, isSarvamConfigured } from '../../config/env.js';

export const SARVAM_BASE_URL = 'https://api.sarvam.ai';

export function sarvamHeaders() {
  return {
    'api-subscription-key': env.sarvamApiKey,
  };
}

export async function sarvamFetch(path, init = {}) {
  if (!isSarvamConfigured()) return null;

  const response = await fetch(`${SARVAM_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...sarvamHeaders(),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Sarvam ${path} failed (${response.status}): ${body.slice(0, 300)}`);
  }

  return response;
}

export { isSarvamConfigured };
