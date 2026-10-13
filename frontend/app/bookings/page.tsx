"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Calendar, 
  MapPin, 
  QrCode, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function MyBookingsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      window.location.href = "/auth/login?redirect=/bookings";
      return;
    }

    if (isAuthenticated) {
      api.bookings.getMyBookings().then((res) => {
        if (res.success && res.data) {
          setBookings(res.data);
        }
        setLoading(false);
      });
    }
  }, [isAuthenticated, authLoading]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>CONFIRMED</span>
          </span>
        );
      case "payment_pending":
      case "pending":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>PAYMENT PENDING</span>
          </span>
        );
      case "cancelled":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 flex items-center space-x-1">
            <XCircle className="w-3.5 h-3.5" />
            <span>CANCELLED</span>
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-stone-100 text-stone-700">
            {status.toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <span className="text-xs font-bold text-brand-600 uppercase tracking-widest block mb-1">
            Traveler Dashboard
          </span>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">
            My Gujarat Weekend Bookings
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            View your confirmed reservations, download passes, and manage check-ins.
          </p>
        </div>

        <Link
          href="/explore"
          className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm transition-all flex items-center space-x-1.5 self-start"
        >
          <span>Find More Stays</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-stone-600">Retrieving your bookings...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-4">
          <Calendar className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="text-lg font-bold text-stone-800">No bookings found</h3>
          <p className="text-sm text-stone-500 max-w-sm mx-auto">
            You haven't reserved any Gujarat stays yet. Explore our verified villas, forest resorts, and camping sites.
          </p>
          <Link
            href="/explore"
            className="inline-block px-6 py-3 rounded-2xl bg-brand-600 text-white font-extrabold text-sm shadow-lg shadow-brand-500/25"
          >
            Explore Gujarat Weekend Escapes
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              {/* Left Details */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  {getStatusBadge(b.status)}
                  <span className="font-mono text-xs font-bold text-stone-400">
                    Ref: {b.booking_code}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-xl text-stone-900">
                    {b.property?.name || "Gujarat Weekend Experience"}
                  </h3>
                  <p className="text-xs text-stone-500 flex items-center space-x-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-brand-600" />
                    <span>{b.property?.location_name || "Gujarat"}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600">
                  <div className="flex items-center space-x-1.5 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-brand-600" />
                    <span>{b.check_in} to {b.check_out}</span>
                  </div>
                  <span>•</span>
                  <span>{b.guest_count} Guests</span>
                  <span>•</span>
                  <span className="font-bold text-stone-900">Total: ₹{b.total.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Right CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                {b.status === "payment_pending" ? (
                  <Link
                    href={`/checkout/${b.id}`}
                    className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-all"
                  >
                    Complete Payment
                  </Link>
                ) : (
                  <Link
                    href={`/bookings/${b.booking_code}`}
                    className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center space-x-1.5 transition-all"
                  >
                    <QrCode className="w-4 h-4 text-amber-400" />
                    <span>View QR Pass</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
