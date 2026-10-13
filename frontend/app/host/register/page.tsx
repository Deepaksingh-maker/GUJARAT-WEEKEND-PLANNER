"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ShieldCheck, User, Mail, Lock, Phone, Building, FileText, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function HostRegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [businessName, setBusinessName] = useState("");
  const [hostType, setHostType] = useState("villa_owner");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const res = await api.auth.registerHost({
        business_name: businessName,
        host_type: hostType,
        full_name: fullName,
        email,
        phone,
        password,
        bio,
      });

      if (res.success && res.data) {
        login(res.data.access_token, res.data.user);
        router.push("/host/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Host registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-3xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center font-bold shadow-md">
          <Home className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-black text-stone-900">Partner as a Gujarat Host</h1>
        <p className="text-sm text-stone-500">
          List your villa, farmhouse, resort, camping site, or adventure activity
        </p>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-xl space-y-6">
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
          <p className="font-bold flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Gujarat Verification Policy</span>
          </p>
          <p>
            All new host profiles are initially set to <strong>pending</strong>. An administrator will verify your Gujarat tourism or property ownership details before listings go live for public booking.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase">Host Type</label>
              <select
                value={hostType}
                onChange={(e) => setHostType(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none cursor-pointer"
              >
                <option value="villa_owner">Villa Owner</option>
                <option value="resort_owner">Resort Owner</option>
                <option value="farmhouse_owner">Farmhouse Owner</option>
                <option value="camping_operator">Camping / Glamping Operator</option>
                <option value="activity_provider">Activity & Experience Provider</option>
                <option value="other">Other Nature Host</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase">Business / Listing Brand</label>
              <input
                type="text"
                required
                placeholder="e.g. Sahyadri Retreats"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase">Contact Person Name</label>
              <input
                type="text"
                required
                placeholder="Kishorbhai Patel"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase">Email Address</label>
              <input
                type="email"
                required
                placeholder="host@patelretreats.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase">Phone (WhatsApp enabled)</label>
              <input
                type="tel"
                required
                placeholder="+91 98980 XXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase">Account Password</label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 uppercase">About Your Gujarat Property / Operations</label>
            <textarea
              rows={3}
              placeholder="Tell us where in Gujarat your property is located, number of rooms, and special amenities..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? "Submitting Host Application..." : "Submit Host Registration"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-stone-500">
          Already a host?{" "}
          <Link href="/auth/login" className="font-bold text-brand-600">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
}
