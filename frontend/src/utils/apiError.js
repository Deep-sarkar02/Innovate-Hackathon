export function getApiErrorMessage(err, fallback = 'Something went wrong') {
  return err?.response?.data?.error ?? err?.message ?? fallback;
}

export function isNotFoundError(err) {
  return err?.response?.status === 404;
}

export function isAuthError(err) {
  return err?.response?.status === 401;
}

export function logApiError(context, err) {
  if (isNotFoundError(err)) return;
  if (import.meta.env.DEV) {
    console.warn(`[${context}]`, getApiErrorMessage(err));
  }
}
