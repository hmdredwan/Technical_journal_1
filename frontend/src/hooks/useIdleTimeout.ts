"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type UseIdleOptions = {
  idleMs?: number;
  warningMs?: number;
  onExpirePath?: string; // where to redirect after expiry
};

export default function useIdleTimeout(options?: UseIdleOptions) {
  const router = useRouter();
  const idleMs = options?.idleMs ?? 15 * 60 * 1000; // 15 minutes
  const warningMs = options?.warningMs ?? 60 * 1000; // 1 minute
  const onExpirePath = options?.onExpirePath ?? '/login';

  const idleTimeoutRef = useRef<number | null>(null);
  const warningTimeoutRef = useRef<number | null>(null);
  const expireTimeoutRef = useRef<number | null>(null);
  const warningIntervalRef = useRef<number | null>(null);

  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.floor(warningMs / 1000));

  const clearAllTimers = useCallback(() => {
    if (idleTimeoutRef.current) window.clearTimeout(idleTimeoutRef.current);
    if (warningTimeoutRef.current) window.clearTimeout(warningTimeoutRef.current);
    if (expireTimeoutRef.current) window.clearTimeout(expireTimeoutRef.current);
    if (warningIntervalRef.current) window.clearInterval(warningIntervalRef.current);
    idleTimeoutRef.current = null;
    warningTimeoutRef.current = null;
    expireTimeoutRef.current = null;
    warningIntervalRef.current = null;
  }, []);

  const expireSession = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    try {
      localStorage.clear();
      window.dispatchEvent(new Event('auth-change'));
    } catch (e) {
      // ignore
    }
    router.push(onExpirePath);
  }, [clearAllTimers, onExpirePath, router]);

  const startWarningCountdown = useCallback(() => {
    setSecondsLeft(Math.floor(warningMs / 1000));
    if (warningIntervalRef.current) window.clearInterval(warningIntervalRef.current);
    warningIntervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (warningIntervalRef.current) window.clearInterval(warningIntervalRef.current);
          warningIntervalRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000) as unknown as number;
  }, [warningMs]);

  const startIdleTimers = useCallback(() => {
    clearAllTimers();
    const warningAt = idleMs - warningMs;
    warningTimeoutRef.current = window.setTimeout(() => {
      setShowWarning(true);
      startWarningCountdown();
    }, warningAt) as unknown as number;

    expireTimeoutRef.current = window.setTimeout(() => {
      expireSession();
    }, idleMs) as unknown as number;
  }, [idleMs, warningMs, clearAllTimers, startWarningCountdown, expireSession]);

  const resetIdle = useCallback(() => {
    if (showWarning) setShowWarning(false);
    setSecondsLeft(Math.floor(warningMs / 1000));
    startIdleTimers();
  }, [showWarning, warningMs, startIdleTimers]);

  useEffect(() => {
    startIdleTimers();
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handleActivity = () => resetIdle();
    events.forEach((ev) => window.addEventListener(ev, handleActivity));

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') resetIdle();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibility);
      clearAllTimers();
    };
  }, [startIdleTimers, resetIdle, clearAllTimers]);

  const logoutNow = useCallback(() => {
    expireSession();
  }, [expireSession]);

  return {
    showWarning,
    secondsLeft,
    resetIdle,
    logoutNow,
  };
}
