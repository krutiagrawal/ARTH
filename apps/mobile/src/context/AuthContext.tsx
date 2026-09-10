import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAccessToken, getRefreshToken, clearTokens } from '../api/tokenStorage';
import { ApiError, setAccountBlockedHandler, setUnauthorizedHandler } from '../api/client';
import * as authApi from '../api/auth';
import type { ApiUser } from '../api/auth';

interface AuthContextValue {
  user: ApiUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<ApiUser>;
  register: (input: { email: string; password: string; name: string; handle: string }) => Promise<void>;
  registerNgo: (input: {
    email: string;
    password: string;
    name: string;
    handle: string;
    orgName: string;
    description: string;
    website?: string;
    contactPhone?: string;
  }) => Promise<void>;
  registerGroup: (input: {
    email: string;
    password: string;
    name: string;
    handle: string;
    groupName: string;
    groupType: 'family' | 'school' | 'club' | 'other';
    description: string;
  }) => Promise<void>;
  registerNursery: (input: {
    email: string;
    password: string;
    name: string;
    handle: string;
    nurseryName: string;
    description: string;
    city?: string;
    contactPhone?: string;
  }) => Promise<void>;
  registerCorporate: (input: {
    email: string;
    password: string;
    name: string;
    handle: string;
    companyName: string;
    description: string;
    industry?: string;
    city?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<ApiUser | null>>;
  isBlocked: boolean;
  blockReason: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isBlocked: false,
  blockReason: null,
  login: async () => { throw new Error('AuthProvider not mounted'); },
  register: async () => {},
  registerNgo: async () => {},
  registerGroup: async () => {},
  registerNursery: async () => {},
  registerCorporate: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const queryClient = useQueryClient();

  // Every query key in this app (friends, requests, feed, notifications, ...) is keyed by
  // resource, not by user id, so react-query's cache — and its 30s staleTime — otherwise survives
  // a logout/login on the same device: the next account mounts the same screens, sees the
  // previous account's still-"fresh" cached data, and doesn't refetch. Wiping the cache on every
  // auth transition is what makes account switching show the right account's data immediately.
  const forceLogout = useCallback(() => {
    if (mountedRef.current) setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const handleAccountBlocked = useCallback((reason: string | null) => {
    if (!mountedRef.current) return;
    setIsBlocked(true);
    setBlockReason(reason);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setUnauthorizedHandler(forceLogout);
    setAccountBlockedHandler(handleAccountBlocked);

    (async () => {
      const [accessToken, refreshToken] = await Promise.all([getAccessToken(), getRefreshToken()]);
      if (accessToken || refreshToken) {
        try {
          const me = await authApi.fetchMe();
          if (mountedRef.current) setUser(me);
        } catch (err) {
          // A blocked account keeps its tokens — handleAccountBlocked already
          // fired from the ACCOUNT_BLOCKED response and flipped isBlocked, so
          // this cold-launch path must not also clear the session out from
          // under it (that's the "logged out" path, a different case).
          if (!(err instanceof ApiError && err.code === 'ACCOUNT_BLOCKED')) {
            await clearTokens();
          }
        }
      }
      if (mountedRef.current) setIsLoading(false);
    })();

    return () => {
      mountedRef.current = false;
      setUnauthorizedHandler(null);
      setAccountBlockedHandler(null);
    };
  }, [forceLogout, handleAccountBlocked]);

  const login = useCallback(async (email: string, password: string) => {
    const loggedInUser = await authApi.login({ email, password });
    queryClient.clear();
    setUser(loggedInUser);
    setIsBlocked(false);
    setBlockReason(null);
    return loggedInUser;
  }, [queryClient]);

  const register = useCallback(
    async (input: { email: string; password: string; name: string; handle: string }) => {
      const registeredUser = await authApi.register(input);
      queryClient.clear();
      setUser(registeredUser);
    },
    [queryClient]
  );

  const registerNgo = useCallback(
    async (input: {
      email: string;
      password: string;
      name: string;
      handle: string;
      orgName: string;
      description: string;
      website?: string;
      contactPhone?: string;
    }) => {
      const registeredUser = await authApi.registerNgo(input);
      queryClient.clear();
      setUser(registeredUser);
    },
    [queryClient]
  );

  const registerGroup = useCallback(
    async (input: {
      email: string;
      password: string;
      name: string;
      handle: string;
      groupName: string;
      groupType: 'family' | 'school' | 'club' | 'other';
      description: string;
    }) => {
      const registeredUser = await authApi.registerGroup(input);
      queryClient.clear();
      setUser(registeredUser);
    },
    [queryClient]
  );

  const registerNursery = useCallback(
    async (input: {
      email: string;
      password: string;
      name: string;
      handle: string;
      nurseryName: string;
      description: string;
      city?: string;
      contactPhone?: string;
    }) => {
      const registeredUser = await authApi.registerNursery(input);
      queryClient.clear();
      setUser(registeredUser);
    },
    [queryClient]
  );

  const registerCorporate = useCallback(
    async (input: {
      email: string;
      password: string;
      name: string;
      handle: string;
      companyName: string;
      description: string;
      industry?: string;
      city?: string;
    }) => {
      const registeredUser = await authApi.registerCorporate(input);
      queryClient.clear();
      setUser(registeredUser);
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    queryClient.clear();
    setUser(null);
    setIsBlocked(false);
    setBlockReason(null);
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    const me = await authApi.fetchMe();
    setUser(me);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        register,
        registerNgo,
        registerGroup,
        registerNursery,
        registerCorporate,
        logout,
        refreshUser,
        setUser,
        isBlocked,
        blockReason,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
