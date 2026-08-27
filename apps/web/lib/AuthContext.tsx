"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN_STORAGE_KEY = "ajmarket_access_token";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "VENDOR" | "ADMIN";
}

interface AuthResponse {
  success: boolean;
  data: { accessToken: string; user: AuthUser } | null;
  error: { message: string; details?: unknown } | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  register: (input: {
    email: string;
    password: string;
    name: string;
    role?: "CUSTOMER" | "VENDOR";
    businessName?: string;
  }) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
  /** Fetch wrapper that attaches the access token and retries once after a
   * silent refresh if the server responds 401 (token expired). */
  authFetch: <T>(path: string, options?: RequestInit) => Promise<{ success: boolean; data: T | null; error: { message: string } | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Keep a ref in sync so authFetch always reads the latest token without
  // needing to be redefined on every render.
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = accessToken;

  async function doRefresh(): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      const json: AuthResponse = await res.json();
      if (json.success && json.data) {
        setAccessToken(json.data.accessToken);
        setUser(json.data.user);
        localStorage.setItem(TOKEN_STORAGE_KEY, json.data.accessToken);
        return json.data.accessToken;
      }
    } catch {
      // No valid session — proceed as logged out.
    }
    return null;
  }

  // On first load, try to silently restore a session from the httpOnly
  // refresh cookie (if the browser still has one from a previous visit).
  useEffect(() => {
    doRefresh().finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json: AuthResponse = await res.json();
    if (json.success && json.data) {
      setAccessToken(json.data.accessToken);
      setUser(json.data.user);
      localStorage.setItem(TOKEN_STORAGE_KEY, json.data.accessToken);
      return { ok: true };
    }
    return { ok: false, message: json.error?.message ?? "Login failed" };
  }

  async function register(input: {
    email: string;
    password: string;
    name: string;
    role?: "CUSTOMER" | "VENDOR";
    businessName?: string;
  }) {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json: AuthResponse = await res.json();
    if (json.success && json.data) {
      setAccessToken(json.data.accessToken);
      setUser(json.data.user);
      localStorage.setItem(TOKEN_STORAGE_KEY, json.data.accessToken);
      return { ok: true };
    }
    return { ok: false, message: json.error?.message ?? "Registration failed" };
  }

  async function logout() {
    await fetch(`${API_BASE_URL}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  async function authFetch<T>(path: string, options: RequestInit = {}) {
    const doRequest = async (token: string | null) => {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });
      return res;
    };

    let res = await doRequest(tokenRef.current);

    if (res.status === 401) {
      const newToken = await doRefresh();
      if (newToken) {
        res = await doRequest(newToken);
      }
    }

    return (await res.json()) as { success: boolean; data: T | null; error: { message: string } | null };
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, register, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
