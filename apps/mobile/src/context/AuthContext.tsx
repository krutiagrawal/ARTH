import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getAccessToken, getRefreshToken, clearTokens } from '../api/tokenStorage';
import { setUnauthorizedHandler } from '../api/client';
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
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
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
  const mountedRef = useRef(true);

  const forceLogout = useCallback(() => {
    if (mountedRef.current) setUser(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setUnauthorizedHandler(forceLogout);

    (async () => {
      const [accessToken, refreshToken] = await Promise.all([getAccessToken(), getRefreshToken()]);
      if (accessToken || refreshToken) {
        try {
          const me = await authApi.fetchMe();
          if (mountedRef.current) setUser(me);
        } catch {
          await clearTokens();
        }
      }
      if (mountedRef.current) setIsLoading(false);
    })();

    return () => {
      mountedRef.current = false;
      setUnauthorizedHandler(null);
    };
  }, [forceLogout]);

  const login = useCallback(async (email: string, password: string) => {
    const loggedInUser = await authApi.login({ email, password });
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; name: string; handle: string }) => {
      const registeredUser = await authApi.register(input);
      setUser(registeredUser);
    },
    []
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
      setUser(registeredUser);
    },
    []
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
      setUser(registeredUser);
    },
    []
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
      setUser(registeredUser);
    },
    []
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
      setUser(registeredUser);
    },
    []
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
