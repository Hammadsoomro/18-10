import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { UserData } from "@shared/api";

interface AuthContextType {
  user: UserData | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token");
    if (savedToken) {
      setToken(savedToken);
      try {
        const decoded = JSON.parse(atob(savedToken.split(".")[1]));
        setUser(decoded);
      } catch (error) {
        localStorage.removeItem("auth_token");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("auth_token", data.token);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        throw new Error("Signup failed");
      }

      const data = await response.json();
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("auth_token", data.token);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_token");
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, signup, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // Fallback for safety: return a minimal implementation so components
    // can still call login/signup/logout when AuthProvider is missing.
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    let user: UserData | null = null;
    try {
      if (token) {
        user = JSON.parse(atob(token.split(".")[1]));
      }
    } catch (e) {
      user = null;
    }

    const noOpLogin = async (email: string, password: string) => {
      // attempt normal API login as best-effort
      const res = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error("Login failed");
      const data = await res.json();
      localStorage.setItem("auth_token", data.token);
      return;
    };

    const noOpSignup = async (email: string, password: string, name: string) => {
      const res = await fetch(`/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      if (!res.ok) throw new Error("Signup failed");
      const data = await res.json();
      localStorage.setItem("auth_token", data.token);
      return;
    };

    const noOpLogout = () => {
      localStorage.removeItem("auth_token");
      try {
        if (typeof window !== "undefined") window.location.pathname = "/login";
      } catch (e) {}
    };

    return {
      user,
      token,
      login: noOpLogin,
      signup: noOpSignup,
      logout: noOpLogout,
      isLoading: false,
    };
  }
  return context;
}
