"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface LiveUpdateConfig {
  /** API endpoints to poll */
  endpoints: string[];
  /** Polling interval in ms (default 30000) */
  interval?: number;
  /** Whether polling is active */
  enabled?: boolean;
  method?: "GET" | "POST";
}

export interface LiveUpdateResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  failCount: number;
  /** Force an immediate refresh */
  refresh: () => void;
}

/**
 * Transport-agnostic live data hook.
 * Currently uses polling via setInterval + fetch.
 * Interface designed so internals can swap to SSE/WebSocket later.
 */
export function useLiveUpdates<T = unknown>(
  config: LiveUpdateConfig
): LiveUpdateResult<T> {
  const { endpoints, interval = 30_000, enabled = true, method } = config;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [failCount, setFailCount] = useState(0);
  const mountedRef = useRef(true);
  const endpointsKey = endpoints.join(",");
  const methodRef = useRef(method);
  methodRef.current = method;
  const failCountRef = useRef(0);

  const fetchAll = useCallback(async () => {
    if (!enabled || endpoints.length === 0) return;

    try {
      const results = await Promise.all(
        endpoints.map(async (url) => {
          const res = await fetch(url, { cache: "no-store", method: methodRef.current || "GET" });
          if (!res.ok) throw new Error(`${res.status} from ${url}`);
          return res.json();
        })
      );

      if (!mountedRef.current) return;

      const value = endpoints.length === 1 ? results[0] : results;
      setData(value as T);
      setError(null);
      setFailCount(0);
      failCountRef.current = 0;
      setLastUpdated(new Date());
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
      failCountRef.current += 1;
      setFailCount(failCountRef.current);
      console.error(`[LiveUpdates] Poll failed (attempt ${failCountRef.current}):`, err instanceof Error ? err.message : err);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- endpointsKey is a stable derived key for endpoints
  }, [endpointsKey, enabled]);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) {
      setIsLoading(false);
      return;
    }

    // Initial fetch
    fetchAll();

    // Polling with exponential backoff on failures
    let timeoutId: ReturnType<typeof setTimeout>;
    function scheduleNext() {
      // Backoff: normal interval * 2^(failCount), capped at 4x interval (240s at 60s base)
      const backoffMultiplier = Math.min(Math.pow(2, failCountRef.current), 4);
      const nextInterval = failCountRef.current > 0 ? interval * backoffMultiplier : interval;
      timeoutId = setTimeout(async () => {
        if (!mountedRef.current) return;
        await fetchAll();
        if (mountedRef.current) scheduleNext();
      }, nextInterval);
    }
    scheduleNext();

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
    };
  }, [fetchAll, interval, enabled]);

  return { data, isLoading, error, lastUpdated, failCount, refresh: fetchAll };
}
