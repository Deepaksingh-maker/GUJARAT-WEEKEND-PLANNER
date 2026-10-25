"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "./api";

interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  role: "CUSTOMER" | "HOST" | "ADMIN";
  avatar_url?: string;
  host_profile?: {
    id: number;
    business_name: string;
    host_type: string;
    verification_status: "pending" | "verified" | "rejected";
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isHost: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem("gw_token");
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const res = await api.auth.getMe();
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        localStorage.removeItem("gw_token");
        setUser(null);
      }
    } catch {
      localStorage.removeItem("gw_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem("gw_token", token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("gw_token");
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        isAuthenticated: !!user,
        isHost: user?.role === "HOST",
        isAdmin: user?.role === "ADMIN",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
