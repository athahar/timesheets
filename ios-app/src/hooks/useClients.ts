import { useCallback, useEffect, useRef, useState } from 'react';
import { getClientsCached, STALE_MS_DEFAULT } from '../services/directSupabase';
import { Client } from '../types';

/**
 * Hook to fetch and cache provider's clients with stale-time pattern.
 * Decoupled from UI state to prevent redundant re-fetches.
 *
 * @param providerId - The provider's ID
 * @param staleMs - Cache validity duration (default: 30s from env/constant)
 * @returns Object with data, loading state, error, and refresh function
 */
export function useClients(providerId: string, staleMs = STALE_MS_DEFAULT) {
  const [data, setData] = useState<Client[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // Freeze providerId in ref to prevent effect re-runs on UI state changes
  const pidRef = useRef(providerId);
  useEffect(() => {
    pidRef.current = providerId;
  }, [providerId]);

  const load = useCallback(
    async (force = false) => {
      if (!pidRef.current) return;

      try {
        setLoading(true);
        const rows = await getClientsCached(pidRef.current, { staleMs, force });
        setData(rows);
        setError(null);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    },
    [staleMs]
  );

  // Initial load (runs once per providerId change, not per UI render)
  useEffect(() => {
    load(false);
  }, [load]);

  return {
    data,
    loading,
    error,
    refresh: () => load(true), // Force fresh fetch
  };
}
