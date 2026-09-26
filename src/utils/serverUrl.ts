import { API_CONFIG } from '../api/config';

const LEGACY_HOSTS = ['turet.io', 'www.turet.io'];

/** Normalize and migrate legacy server URLs to the production host. */
export function normalizeServerUrl(url?: string | null): string {
  if (!url?.trim()) {
    return API_CONFIG.DEFAULT_BASE_URL;
  }

  let normalized = url.trim().replace(/\/+$/, '');

  // Strip accidental /api suffix
  normalized = normalized.replace(/\/api$/i, '');

  try {
    const parsed = new URL(normalized.startsWith('http') ? normalized : `https://${normalized}`);
    const hostname = parsed.hostname.toLowerCase();

    if (LEGACY_HOSTS.includes(hostname)) {
      parsed.hostname = 'elevaticsiot.com';
      parsed.protocol = 'https:';
      parsed.pathname = '';
      normalized = parsed.origin;
    }
  } catch {
    return API_CONFIG.DEFAULT_BASE_URL;
  }

  return normalized;
}
