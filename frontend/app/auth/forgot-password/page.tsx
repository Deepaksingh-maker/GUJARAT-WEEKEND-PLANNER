"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  KeyRound, Mail, Lock, ArrowRight, ArrowLeft, CheckCircle2, 
  RefreshCw, ShieldCheck, Eye, EyeOff, Sparkles 
} from "lucide-react";
import { api } from "@/lib/api";

type Step = "REQUEST" | "RESET" | "SUCCESS";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("REQUEST");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Step 1: Request Code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      setError(null);
      setInfoMessage(null);

      const res = await api.auth.forgotPassword({ email });
      if (res.success) {
        if (res.data?.code_preview) {
          setDemoCode(res.data.code_preview);
          setCode(res.data.code_preview); // Auto-fill for ultra-smooth testing
        }
        setInfoMessage(`Verification code sent to ${email}`);
        setStep("RESET");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send reset code. Please check your email address.");
    } finally {
      setLoading(false);
    }
  };

  // Resend Code
  const handleResendCode = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.auth.forgotPassword({ email });
      if (res.success && res.data?.code_preview) {
        setDemoCode(res.data.code_preview);
        setCode(res.data.code_preview);
        setInfoMessage("A new verification code has been generated.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await api.auth.resetPassword({
        email,
        code: code.trim(),
        new_password: newPassword,
      });

      if (res.success) {
        setStep("SUCCESS");
      }
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Please verify the code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200/80 shadow-2xl space-y-6">
        
        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-amber-500 mx-auto flex items-center justify-center text-white shadow-lg shadow-brand-500/25">
            {step === "SUCCESS" ? (
              <CheckCircle2 className="w-6 h-6 text-white" />
            ) : (
              <KeyRound className="w-6 h-6 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-black text-stone-900">
            {step === "REQUEST" && "Forgot Password"}
            {step === "RESET" && "Reset Your Password"}
            {step === "SUCCESS" && "Password Reset Complete"}
          </h1>
          <p className="text-xs text-stone-500">
            {step === "REQUEST" && "Enter your registered email to receive a password reset code."}
            {step === "RESET" && `Enter the 6-digit code sent to ${email} and choose a new password.`}
            {step === "SUCCESS" && "Your password has been changed securely."}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        {/* Info Message */}
        {infoMessage && step === "RESET" && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* STEP 1: Email Form */}
        {step === "REQUEST" && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase">Registered Email</label>
              <div className="flex items-center space-x-2 p-3 bg-stone-50 rounded-xl border border-stone-200 focus-within:border-brand-500 transition-colors">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm shadow-lg shadow-brand-500/25 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? "Sending Code..." : "Send Verification Code"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: Code and New Password Form */}
        {step === "RESET" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* Quick Demo Preview / Helper */}
            {demoCode && (
              <div className="p-3 bg-brand-50/70 border border-brand-200/80 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-brand-600" />
                  <span className="text-stone-700 font-medium">
                    Reset Code: <strong className="font-mono text-brand-700 text-sm tracking-wider">{demoCode}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCode(demoCode)}
                  className="text-[11px] font-bold text-brand-600 hover:text-brand-800 bg-white px-2 py-1 rounded-lg border border-brand-200 hover:bg-brand-50 transition-colors"
                >
                  Use Code
                </button>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700 uppercase">6-Digit Code</label>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                  <span>Resend</span>
                </button>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-stone-50 rounded-xl border border-stone-200 focus-within:border-brand-500 transition-colors">
                <KeyRound className="w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-transparent text-sm font-mono font-bold tracking-widest text-stone-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase">New Password</label>
              <div className="flex items-center space-x-2 p-3 bg-stone-50 rounded-xl border border-stone-200 focus-within:border-brand-500 transition-colors">
                <Lock className="w-4 h-4 text-stone-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-stone-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-stone-400 hover:text-stone-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase">Confirm New Password</label>
              <div className="flex items-center space-x-2 p-3 bg-stone-50 rounded-xl border border-stone-200 focus-within:border-brand-500 transition-colors">
                <Lock className="w-4 h-4 text-stone-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-stone-900 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm shadow-lg shadow-brand-500/25 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? "Updating Password..." : "Update Password"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 3: Success Screen */}
        {step === "SUCCESS" && (
          <div className="space-y-5 text-center">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-emerald-800 text-xs font-semibold space-y-1">
              <p>Your password has been changed successfully.</p>
              <p className="text-stone-500 font-normal">You can now sign in using your new credentials.</p>
            </div>

            <button
              type="button"
              onClick={() => router.push(`/auth/login?reset=success&email=${encodeURIComponent(email)}`)}
              className="w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm shadow-lg shadow-brand-500/25 active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <span>Proceed to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Back Link */}
        <div className="pt-2 text-center text-xs text-stone-500">
          <Link
            href="/auth/login"
            className="inline-flex items-center space-x-1 font-bold text-stone-600 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
