"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass, Lock, Mail, User, Phone, ArrowRight, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const res = await api.auth.register({
        full_name: fullName,
        email,
        phone,
        password,
      });

      if (res.success && res.data) {
        login(res.data.access_token, res.data.user);
        router.push("/explore");
      }
    } catch (err: any) {
      setError(err.message || "Registration failed");
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
          <h1 className="text-2xl font-black text-stone-900">Create Traveler Account</h1>
          <p className="text-xs text-stone-500">Discover and book verified Gujarat weekend stays</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 uppercase">Full Name</label>
            <div className="flex items-center space-x-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
              <User className="w-4 h-4 text-stone-400" />
              <input
                type="text"
                required
                placeholder="Pooja Shah"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-stone-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 uppercase">Email Address</label>
            <div className="flex items-center space-x-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
              <Mail className="w-4 h-4 text-stone-400" />
              <input
                type="email"
                required
                placeholder="pooja@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-stone-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 uppercase">Phone Number</label>
            <div className="flex items-center space-x-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
              <Phone className="w-4 h-4 text-stone-400" />
              <input
                type="tel"
                placeholder="+91 98250 XXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-stone-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 uppercase">Password</label>
            <div className="flex items-center space-x-2 p-3 bg-stone-50 rounded-xl border border-stone-200 focus-within:border-brand-500 transition-colors">
              <Lock className="w-4 h-4 text-stone-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
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
            <span>{loading ? "Creating Account..." : "Register Account"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-stone-500">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-bold text-brand-600 hover:text-brand-700">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
