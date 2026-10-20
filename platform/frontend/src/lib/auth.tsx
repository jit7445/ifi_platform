"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiClient, endpoints, type Endpoints, type TokenStore, type LoginInput, type Me, type SignupInput } from "./api";

type Status = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: Status;
  me: Me | null;
  api: Endpoints;
  login(input: LoginInput): Promise<Me>;
  signup(input: SignupInput): Promise<Me>;
  logout(): Promise<void>;
  reloadMe(): Promise<Me | null>;
}

function createTokenStore(): TokenStore {
  let token: string | null = null;
  return {
    get: () => token,
    set: (t) => {
      token = t;
    },
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [me, setMe] = useState<Me | null>(null);

  const [{ client, tokens }] = useState(() => {
    const store = createTokenStore();
    return {
      tokens: store,
      client: new ApiClient({
        tokens: store,
        onAuthLost: () => {
          store.set(null);
          setMe(null);
          setStatus("anonymous");
        },
      }),
    };
  });
  const api = useMemo(() => endpoints(client), [client]);

  const loadMe = useCallback(async () => {
    const m = await api.me();
    setMe(m);
    setStatus("authenticated");
    return m;
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    client.refresh().then(async (token) => {
      if (cancelled) return;
      if (!token) {
        setStatus("anonymous");
        return;
      }
      try {
        await loadMe();
      } catch {
        if (!cancelled) setStatus("anonymous");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [client, loadMe]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      me,
      api,
      async login(input) {
        const res = await api.auth.login(input);
        tokens.set(res.access_token);
        return loadMe();
      },
      async signup(input) {
        const res = await api.auth.signup(input);
        tokens.set(res.access_token);
        return loadMe();
      },
      async logout() {
        try {
          await api.auth.logout();
        } catch {
          // The session is discarded locally even if the server call fails.
        }
        tokens.set(null);
        setMe(null);
        setStatus("anonymous");
      },
      async reloadMe() {
        try {
          return await loadMe();
        } catch {
          return null;
        }
      },
    }),
    [status, me, api, loadMe, tokens],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function useApi(): Endpoints {
  return useAuth().api;
}
