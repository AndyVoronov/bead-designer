"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  /** Open login modal. Pass a callback to run after successful login. */
  requireAuth: (callback?: () => void) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  requireAuth: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  // Fetch session on mount
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => {
        if (res.ok) return res.json();
        return { user: null };
      })
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // If login was required and user just appeared, run callback
  useEffect(() => {
    if (user && pendingCallback) {
      pendingCallback();
      setPendingCallback(null);
    }
  }, [user, pendingCallback]);

  // Listen for auth state changes (e.g. after OAuth redirect)
  useEffect(() => {
    const handler = () => {
      fetch("/api/auth/session")
        .then((res) => (res.ok ? res.json() : { user: null }))
        .then((data) => setUser(data.user))
        .catch(() => {});
    };

    window.addEventListener("auth-state-change", handler);
    return () => window.removeEventListener("auth-state-change", handler);
  }, []);

  const requireAuth = useCallback((callback?: () => void) => {
    if (user) {
      callback?.();
    } else {
      setPendingCallback(callback ?? null);
      // Dispatch event that LoginModal listens to
      window.dispatchEvent(new CustomEvent("auth-required"));
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, requireAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Call after successful OAuth login to update session state */
export function notifyAuthChange() {
  window.dispatchEvent(new CustomEvent("auth-state-change"));
}
