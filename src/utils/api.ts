/**
 * Institutional API client helper for FPMS
 * Automatically attaches Authorization header Bearer token and credentials: 'include'
 * for seamless operation inside iframes and standard browser sessions.
 */

const TOKEN_KEY = 'fpms_auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {
    console.error('Failed to access localStorage:', e);
  }
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}

export async function authFetchJson<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  try {
    const res = await authFetch(url, options);
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        data: null,
        error: json?.error || `Request failed with status ${res.status}`,
        status: res.status,
      };
    }

    return {
      data: json as T,
      error: null,
      status: res.status,
    };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || 'Network error',
      status: 0,
    };
  }
}
