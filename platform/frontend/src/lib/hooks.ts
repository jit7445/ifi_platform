"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ResourceState<T> {
  tag: string | null;
  key: string | null;
  data?: T;
  error?: unknown;
}

export interface Resource<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
  mutate: (fn: (prev: T | undefined) => T | undefined) => void;
}

/**
 * Fetches when `key` changes or `reload()` is called. A null key skips fetching.
 * State is only written from promise callbacks so effects stay free of sync setState.
 */
export function useResource<T>(key: string | null, fetcher: () => Promise<T>): Resource<T> {
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<ResourceState<T>>({ tag: null, key: null });
  const tag = key === null ? null : `${key}#${nonce}`;

  useEffect(() => {
    if (tag === null) return;
    let cancelled = false;
    fetcherRef.current().then(
      (data) => {
        if (!cancelled) setState({ tag, key, data });
      },
      (error: unknown) => {
        if (!cancelled) setState((s) => ({ tag, key, data: s.key === key ? s.data : undefined, error }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [tag, key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const mutate = useCallback(
    (fn: (prev: T | undefined) => T | undefined) => setState((s) => ({ ...s, data: fn(s.data) })),
    [],
  );

  const sameKey = state.key === key;
  return {
    data: sameKey ? state.data : undefined,
    error: sameKey && state.tag === tag ? state.error : undefined,
    loading: tag !== null && state.tag !== tag,
    reload,
    mutate,
  };
}

/** Runs `tick` every `ms` while `active` is true. */
export function useInterval(tick: () => void, ms: number, active: boolean) {
  const tickRef = useRef(tick);
  useEffect(() => {
    tickRef.current = tick;
  });
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => tickRef.current(), ms);
    return () => window.clearInterval(id);
  }, [ms, active]);
}

export function useAsyncAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  const run = useCallback(async (...args: A): Promise<R | undefined> => {
    setPending(true);
    setError(null);
    try {
      return await fnRef.current(...args);
    } catch (e) {
      setError(e);
      return undefined;
    } finally {
      setPending(false);
    }
  }, []);
  return { run, pending, error, setError };
}
