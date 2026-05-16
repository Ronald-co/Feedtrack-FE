// ─── utils/api.js — Core API Helper ─────────────────────────────────────────
import { API } from '../config.js';

/**
 * Wrapper around fetch that:
 *  - Prepends the API base URL
 *  - Sets JSON content-type
 *  - Sends cookies automatically (cookie-only auth — no Authorization header)
 *  - Throws on non-OK responses using the server's message field
 */
export async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}
