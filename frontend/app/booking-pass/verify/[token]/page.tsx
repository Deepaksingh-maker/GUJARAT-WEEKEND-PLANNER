"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  QrCode,
  MapPin,
  Calendar,
  Users,
  CheckCircle2,
  Printer,
  Download,
  AlertCircle,
  Clock,
  XCircle,
  ShieldCheck,
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Home,
  Compass,
  UserCheck
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface DigitalPassData {
  is_valid: boolean;
  status: string;
  booking_code: string;
  booking_id: number;
  verification_token: string;
  verification_url: string;
  property_name: string;
  property_slug?: string;
  property_type?: string;
  property_image?: string;
  property_location?: string;
  property_address?: string;
  guest_name: string;
  guest_count: number;
  check_in?: string;
  check_out?: string;
  nights: number;
  total_amount: number;
  confirmed_at?: string;
  created_at: string;
  qr_code_data?: string;
  is_checked_in: boolean;
  checked_in_at?: string;
  checked_in_by_name?: string;
  can_check_in: boolean;
  is_host_or_admin: boolean;
  verification_message: string;
}

export default function DigitalBookingPassPage() {
  const params = useParams();
  const router = useRouter();
  const token = (params?.token as string) || "";
  const { user } = useAuth();

  const [pass, setPass] = useState<DigitalPassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    async function loadPass() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.bookings.verifyPass(token);
        if (res.success && res.data) {
          setPass(res.data);
        } else {
          setError(res.message || "Invalid or expired digital booking pass.");
        }
      } catch (err: any) {
        setError(
          err.message ||
            "Unable to verify booking pass. The reference or token is invalid."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPass();
  }, [token]);

  const handleCopyCode = () => {
    if (!pass) return;
    navigator.clipboard.writeText(pass.booking_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCheckIn = async () => {
    if (!pass) return;
    const confirmed = window.confirm(
      `Confirm check-in for guest ${pass.guest_name} (${pass.booking_code})?`
    );
    if (!confirmed) return;

    try {
      setCheckingIn(true);
      setCheckInError(null);
      const res = await api.bookings.checkIn(token);
      if (res.success && res.data) {
        setCheckInSuccess(res.message || "Guest checked in successfully!");
        // Refresh pass data
        const updated = await api.bookings.verifyPass(token);
        if (updated.success && updated.data) {
          setPass(updated.data);
        }
      }
    } catch (err: any) {
      setCheckInError(err.message || "Failed to mark check-in.");
    } finally {
      setCheckingIn(false);
    }
  };

  // Helper date formatting
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-xl max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-stone-900 text-lg">
              Verifying Booking Pass
            </h3>
            <p className="text-xs text-stone-500">
              Fetching real-time reservation status from Gujarat Weekend Escapes
              database...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !pass) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 border border-rose-200 shadow-xl max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
            <XCircle className="w-9 h-9" />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-100 text-rose-700">
              Invalid Booking Pass
            </span>
            <h2 className="text-2xl font-black text-stone-900">
              Pass Verification Failed
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              {error ||
                "No booking was found matching this verification code or the link has expired."}
            </p>
          </div>

          <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/bookings"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors"
            >
              Return to My Bookings
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors"
            >
              Home Page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isConfirmed = pass.status === "confirmed";
  const isCancelled = pass.status === "cancelled" || pass.status === "refunded";
  const isPending = pass.status === "pending" || pass.status === "payment_pending";

  return (
    <div className="min-h-screen bg-stone-100/70 py-6 sm:py-12 px-3 sm:px-6">
      <div className="max-w-xl mx-auto space-y-5">
        {/* TOP BAR / NAVIGATION (Hidden in Print) */}
        <div className="flex items-center justify-between print:hidden">
          <Link
            href="/bookings"
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to My Bookings</span>
          </Link>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors shadow-sm flex items-center space-x-1.5"
              title="Print Booking Pass"
            >
              <Printer className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden sm:inline">Print Pass</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5"
              title="Download as PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* HOST / ADMIN VERIFICATION & CHECK-IN CONTROLS BANNER */}
        {pass.is_host_or_admin && (
          <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl print:hidden space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                  Host & Admin Check-In Mode
                </span>
              </div>
              <span className="text-[11px] font-bold text-amber-800">
                Authorized Verification
              </span>
            </div>

            {pass.is_checked_in ? (
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Guest already checked in on {formatDateTime(pass.checked_in_at)}
                  {pass.checked_in_by_name ? ` by ${pass.checked_in_by_name}` : ""}.
                </span>
              </div>
            ) : pass.can_check_in ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <p className="text-xs text-stone-600 font-medium">
                  Verify dates & guest identity against government photo ID, then
                  confirm arrival.
                </p>
                <button
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>
                    {checkingIn ? "Checking In..." : "Confirm Guest Check-In"}
                  </span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-rose-700 font-bold">
                Check-in disabled: Booking status is {pass.status.toUpperCase()}.
              </p>
            )}

            {checkInSuccess && (
              <p className="text-xs font-bold text-emerald-700 bg-emerald-100/60 p-2 rounded-lg">
                ✓ {checkInSuccess}
              </p>
            )}
            {checkInError && (
              <p className="text-xs font-bold text-rose-700 bg-rose-100/60 p-2 rounded-lg">
                ✕ {checkInError}
              </p>
            )}
          </div>
        )}

        {/* PASS INVALID / WARNING NOTICE */}
        {isCancelled && (
          <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-center space-x-3 text-rose-900 shadow-sm">
            <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <h4 className="font-black text-xs uppercase tracking-wider text-rose-700">
                Booking Cancelled • Pass Invalid
              </h4>
              <p className="text-xs text-rose-800">
                This reservation was cancelled. It cannot be used for property
                entry or check-in.
              </p>
            </div>
          </div>
        )}

        {isPending && (
          <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-center space-x-3 text-amber-900 shadow-sm">
            <Clock className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <h4 className="font-black text-xs uppercase tracking-wider text-amber-700">
                Booking Pending • Confirmation Required
              </h4>
              <p className="text-xs text-amber-800">
                Payment or host approval is pending. Please complete checkout to
                activate this pass.
              </p>
            </div>
          </div>
        )}

        {/* ------------------ DIGITAL BOOKING PASS TICKET CONTAINER ------------------ */}
        <div
          id="digital-booking-pass-card"
          className="bg-white rounded-3xl border border-stone-200/90 shadow-2xl overflow-hidden relative"
        >
          {/* TOP TICKET ACCENT BAR */}
          <div
            className={`h-2.5 w-full ${
              isConfirmed
                ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-brand-600"
                : isCancelled
                ? "bg-gradient-to-r from-rose-500 to-red-600"
                : "bg-gradient-to-r from-amber-400 to-orange-500"
            }`}
          />

          {/* BRAND HEADER */}
          <div className="p-6 sm:p-7 border-b border-stone-100 flex items-center justify-between bg-gradient-to-b from-stone-50/80 to-white">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-700 via-brand-600 to-teal-500 text-white flex items-center justify-center shadow-md">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">
                  Gujarat Weekend Escapes
                </span>
                <h1 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                  DIGITAL BOOKING PASS
                </h1>
              </div>
            </div>

            {/* STATUS BADGE */}
            <div>
              {pass.is_checked_in ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-black uppercase tracking-wider border border-blue-200 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Checked In</span>
                </span>
              ) : isConfirmed ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase tracking-wider border border-emerald-200 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>✓ Confirmed</span>
                </span>
              ) : isCancelled ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black uppercase tracking-wider border border-rose-200 shadow-sm">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Cancelled</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black uppercase tracking-wider border border-amber-200 shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pending</span>
                </span>
              )}
            </div>
          </div>

          {/* PROPERTY HERO CARD */}
          <div className="p-6 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
              {pass.property_image ? (
                <img
                  src={pass.property_image}
                  alt={pass.property_name}
                  className="w-full sm:w-28 h-28 object-cover rounded-xl shadow-sm shrink-0 border border-stone-200"
                />
              ) : (
                <div className="w-full sm:w-28 h-28 bg-stone-200 rounded-xl flex items-center justify-center text-stone-400 shrink-0">
                  <Home className="w-8 h-8" />
                </div>
              )}

              <div className="space-y-1.5 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md inline-block">
                  {pass.property_type || "Stay"}
                </span>
                <h2 className="text-base sm:text-lg font-black text-stone-900 leading-snug line-clamp-2">
                  {pass.property_name}
                </h2>
                <div className="flex items-center space-x-1 text-xs text-stone-500 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span className="truncate">
                    {pass.property_address || pass.property_location || "Gujarat, India"}
                  </span>
                </div>
              </div>
            </div>

            {/* BOOKING REFERENCE ROW */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-stone-50/70 rounded-2xl border border-dashed border-stone-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Booking Reference
                </span>
                <div className="flex items-center space-x-1 mt-0.5">
                  <span className="font-mono font-black text-stone-900 text-xs sm:text-sm">
                    {pass.booking_code}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-1 rounded hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition-colors print:hidden"
                    title="Copy Code"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Booking ID
                </span>
                <span className="font-mono font-black text-stone-900 text-xs sm:text-sm mt-0.5 block">
                  #{pass.booking_id}
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Total Paid
                </span>
                <span className="font-extrabold text-emerald-700 text-xs sm:text-sm mt-0.5 block">
                  ₹{pass.total_amount?.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* GUEST & STAY SCHEDULE DETAILS GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
              {/* GUEST NAME */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Guest Name
                </span>
                <span className="font-black text-stone-900 text-sm block truncate">
                  {pass.guest_name}
                </span>
              </div>

              {/* GUEST COUNT */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Guests
                </span>
                <span className="font-black text-stone-900 text-sm block">
                  {pass.guest_count} Person{pass.guest_count > 1 ? "s" : ""}
                </span>
              </div>

              {/* DURATION */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Duration
                </span>
                <span className="font-black text-stone-900 text-sm block">
                  {pass.nights} Night{pass.nights > 1 ? "s" : ""}
                </span>
              </div>

              {/* CONFIRMED AT */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Confirmed Date
                </span>
                <span className="font-black text-stone-900 text-xs block">
                  {formatDate(pass.confirmed_at || pass.created_at)}
                </span>
              </div>
            </div>

            {/* CHECK-IN / CHECK-OUT DATES CALLOUT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-brand-50/60 border border-brand-100 flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-700 block">
                    Check-In
                  </span>
                  <span className="text-xs sm:text-sm font-black text-stone-900">
                    {formatDate(pass.check_in)}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-stone-800 text-white flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-600 block">
                    Check-Out
                  </span>
                  <span className="text-xs sm:text-sm font-black text-stone-900">
                    {formatDate(pass.check_out)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------- PERFORATED TICKET DIVIDER WITH NOTCHES ---------------- */}
          <div className="relative py-2 flex items-center justify-center">
            {/* Left Notch */}
            <div className="absolute -left-3.5 w-7 h-7 rounded-full bg-stone-100/70 border border-stone-200/90" />
            {/* Perforated Dashed Line */}
            <div className="w-full border-b-2 border-dashed border-stone-300 mx-5" />
            {/* Right Notch */}
            <div className="absolute -right-3.5 w-7 h-7 rounded-full bg-stone-100/70 border border-stone-200/90" />
          </div>

          {/* ---------------- VERIFICATION & QR CODE SECTION ---------------- */}
          <div className="p-6 sm:p-8 bg-stone-50/70 space-y-5 text-center">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">
                Verification & Check-in Pass
              </span>
              <h3 className="text-sm sm:text-base font-black text-stone-800">
                Show This Pass at Property Gate or Reception
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Host will scan this digital pass to verify booking authenticity and
                confirm your arrival.
              </p>
            </div>

            {/* QR CODE CONTAINER */}
            <div className="inline-block p-4 bg-white rounded-3xl border-2 border-dashed border-stone-300 shadow-md">
              {pass.qr_code_data ? (
                <img
                  src={pass.qr_code_data}
                  alt="Booking Pass Verification QR"
                  className="w-48 h-48 sm:w-52 sm:h-52 mx-auto rounded-2xl"
                />
              ) : (
                <div className="w-48 h-48 sm:w-52 sm:h-52 bg-stone-100 rounded-2xl flex items-center justify-center text-xs text-stone-400 font-bold">
                  QR Not Available
                </div>
              )}
              <div className="mt-3 pt-2 border-t border-stone-100">
                <span className="text-[11px] font-mono font-bold text-stone-500">
                  REF: {pass.booking_code}
                </span>
              </div>
            </div>

            {/* VERIFICATION STATUS NOTE */}
            <div className="max-w-md mx-auto p-3.5 rounded-2xl bg-white border border-stone-200/80 text-xs text-stone-600 flex items-center justify-center space-x-2 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
              <span className="font-semibold text-stone-700">
                {pass.verification_message || "Verified via Gujarat Weekend Escapes live database"}
              </span>
            </div>

            {pass.is_checked_in && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 font-bold max-w-md mx-auto">
                ✓ Checked in on {formatDateTime(pass.checked_in_at)}
                {pass.checked_in_by_name ? ` by ${pass.checked_in_by_name}` : ""}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="p-4 bg-stone-900 text-stone-400 text-[10px] text-center border-t border-stone-800 font-medium">
            Gujarat Weekend Escapes • Secure Digital Pass System • All rights reserved
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS (Hidden in Print) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 print:hidden">
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs transition-colors shadow-md flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Booking Pass as PDF</span>
          </button>
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 font-bold text-xs transition-colors shadow-xs flex items-center justify-center space-x-2"
          >
            <Printer className="w-4 h-4 text-stone-600" />
            <span>Print Booking Pass</span>
          </button>
          <Link
            href="/bookings"
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center space-x-2 text-center"
          >
            <span>Return to My Bookings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
