"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Compass, Lock, Mail, ArrowRight, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";
  const resetSuccess = searchParams.get("reset") === "success";
  const initialEmail = searchParams.get("email") || "";
  const { login } = useAuth();

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await api.auth.login({ email, password });
      if (res.success && res.data) {
        login(res.data.access_token, res.data.user);
        if (res.data.user.role === "ADMIN") {
          router.push("/admin/dashboard");
        } else if (res.data.user.role === "HOST") {
          router.push("/host/dashboard");
        } else {
          router.push(redirectUrl);
        }
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200/80 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block mb-1">
            <img
              src="/logo.png"
              alt="Gujarat Weekend Planner"
              className="h-16 w-auto mx-auto object-contain hover:scale-105 transition-transform"
            />
          </Link>
          <h1 className="text-2xl font-black text-stone-900">Welcome Back</h1>
          <p className="text-xs text-stone-500">Sign in to your Gujarat Weekend account</p>
        </div>

        {resetSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 flex items-center space-x-2">
            <span>Password reset successful! Please sign in with your new password.</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 uppercase">Email Address</label>
            <div className="flex items-center space-x-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
              <Mail className="w-4 h-4 text-stone-400" />
              <input
                type="email"
                required
                placeholder="name@gujaratweekend.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-stone-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 uppercase">Password</label>
              <Link
                href="/auth/forgot-password"
                className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-stone-50 rounded-xl border border-stone-200 focus-within:border-brand-500 transition-colors">
              <Lock className="w-4 h-4 text-stone-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-stone-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-stone-400 hover:text-stone-600 focus:outline-none transition-colors p-0.5"
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm shadow-lg shadow-brand-500/25 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? "Authenticating..." : "Sign In"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-stone-500 space-y-2">
          <p>
            Don't have an account?{" "}
            <Link href="/auth/register" className="font-bold text-brand-600 hover:text-brand-700">
              Create Traveler Account
            </Link>
          </p>
          <p>
            Want to list a villa or resort?{" "}
            <Link href="/host/register" className="font-bold text-emerald-600 hover:text-emerald-700">
              Register as Host
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center">Loading sign in...</div>}>
      <LoginContent />
    </Suspense>
  );
}
