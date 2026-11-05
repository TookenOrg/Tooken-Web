"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { SESSION_EXPIRED_EVENT } from "@/lib/api/client";
import { authApi, usersApi } from "@/lib/api/endpoints";
import type { Role, SignUpRequest, User } from "@/lib/api/types";
import {
  clearSession,
  decodeJwt,
  getAccessToken,
  isStaff,
  type JwtClaims,
  setSession,
  subscribeSession,
} from "./session";

type SessionValue = {
  /** False during server rendering and the first client render. */
  ready: boolean;
  isAuthenticated: boolean;
  claims: JwtClaims | null;
  user: User | undefined;
  userLoading: boolean;
  role: Role | undefined;
  isStaff: boolean;
  isAdmin: boolean;
  isInvestor: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (body: SignUpRequest) => Promise<User>;
  signOut: () => void;
  refreshUser: () => Promise<unknown>;
};

const SessionContext = createContext<SessionValue | null>(null);

const SERVER = Symbol("server");

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const token = useSyncExternalStore<string | undefined | typeof SERVER>(
    subscribeSession,
    () => getAccessToken(),
    () => SERVER,
  );
  const ready = token !== SERVER;
  const claims = useMemo(
    () => (ready ? decodeJwt(token as string | undefined) : null),
    [ready, token],
  );
  const isAuthenticated = !!claims;

  const meQuery = useQuery({
    queryKey: ["me", claims?.userId ?? 0],
    queryFn: usersApi.me,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  useEffect(() => {
    const onExpired = () => qc.clear();
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [qc]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const jwt = await authApi.signIn({ email, password });
      qc.clear();
      setSession(jwt);
      qc.setQueryData(["me", jwt.user.id], jwt.user);
      return jwt.user;
    },
    [qc],
  );

  const signUp = useCallback(
    async (body: SignUpRequest) => {
      const jwt = await authApi.signUp(body);
      qc.clear();
      setSession(jwt);
      qc.setQueryData(["me", jwt.user.id], jwt.user);
      return jwt.user;
    },
    [qc],
  );

  const signOut = useCallback(() => {
    clearSession();
    qc.clear();
  }, [qc]);

  const refreshUser = useCallback(
    () => qc.invalidateQueries({ queryKey: ["me"] }),
    [qc],
  );

  const user = isAuthenticated ? meQuery.data : undefined;
  const role = user?.role ?? claims?.role;

  const value = useMemo<SessionValue>(
    () => ({
      ready,
      isAuthenticated,
      claims,
      user,
      userLoading: isAuthenticated && meQuery.isLoading,
      role,
      isStaff: isStaff(role),
      isAdmin: role === "ADMIN",
      isInvestor: role === "USER",
      signIn,
      signUp,
      signOut,
      refreshUser,
    }),
    [
      ready,
      isAuthenticated,
      claims,
      user,
      meQuery.isLoading,
      role,
      signIn,
      signUp,
      signOut,
      refreshUser,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
