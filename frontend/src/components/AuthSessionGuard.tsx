'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useIdleTimeout from '@/hooks/useIdleTimeout';

export default function AuthSessionGuard() {
  const router = useRouter();
  const originalFetchRef = useRef<typeof fetch | null>(null);

  const logoutNow = () => {
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_name');
      localStorage.removeItem('auth_session_expired');
    } catch {}

    window.dispatchEvent(new Event('auth-change'));
    router.replace('/login');
  };

  const { logoutNow: expireSession } = useIdleTimeout({
    idleMs: 15 * 60 * 1000,
    warningMs: 60 * 1000,
    onExpirePath: '/login',
  });

  useEffect(() => {
    originalFetchRef.current = window.fetch.bind(window);

    const wrappedFetch: typeof fetch = async (input, init) => {
      const response = await originalFetchRef.current!(input, init);

      if (response.status === 401 || response.status === 403) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        const isAuthRoute = /\/login\/?$/i.test(url) || /\/token\//i.test(url) || /\/refresh\//i.test(url);

        if (!isAuthRoute) {
          try {
            localStorage.setItem('auth_session_expired', '1');
          } catch {}

          logoutNow();
        }
      }

      return response;
    };

    window.fetch = wrappedFetch;

    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
      }
    };
  }, [logoutNow]);

  useEffect(() => {
    const expired = localStorage.getItem('auth_session_expired');
    if (expired === '1') {
      localStorage.removeItem('auth_session_expired');
      logoutNow();
    }
  }, [logoutNow]);

  return null;
}
