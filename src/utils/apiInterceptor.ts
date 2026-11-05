/**
 * API Fetch Interceptor for Faculty Portfolio Management System
 * Guarantees Bearer Authorization token transmission across iframes,
 * previews, and cross-site browser sessions where third-party cookies may be blocked.
 */

export function setupApiInterceptor() {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const urlStr =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.toString()
          : (input as Request).url;

      // Only intercept internal /api endpoints
      if (urlStr.startsWith('/api') || urlStr.includes('/api/')) {
        const token = localStorage.getItem('fpms_token');
        const headers = new Headers(
          init?.headers || (input instanceof Request ? input.headers : {})
        );

        if (token && !headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }

        const modifiedInit: RequestInit = {
          ...init,
          headers,
          credentials: init?.credentials || 'include',
        };

        return await originalFetch(input, modifiedInit);
      }
    } catch (e) {
      console.warn('FPMS API interceptor fallback to original fetch:', e);
    }

    return originalFetch(input, init);
  };
}
