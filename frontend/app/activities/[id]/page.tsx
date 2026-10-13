"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Compass, 
  MapPin, 
  Clock, 
  Gauge, 
  Users, 
  Star, 
  CheckCircle, 
  XCircle, 
  ShieldCheck, 
  ArrowRight,
  AlertCircle 
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const idOrSlug = params.id as string;

  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [participants, setParticipants] = useState(2);
  const [reserving, setReserving] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    async function loadActivity() {
      try {
        setLoading(true);
        const res = await api.activities.get(idOrSlug);
        if (res.success && res.data) {
          setActivity(res.data);
          if (res.data.slots && res.data.slots.length > 0) {
            setSelectedSlotId(res.data.slots[0].id);
          }
        } else {
          setError("Activity not found");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load activity details");
      } finally {
        setLoading(false);
      }
    }
    loadActivity();
  }, [idOrSlug]);

  const handleBookActivity = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/activities/${activity.slug || activity.id}`);
      return;
    }

    if (!selectedSlotId) {
      setBookingError("Please select a time slot");
      return;
    }

    try {
      setReserving(true);
      setBookingError(null);

      const res = await api.bookings.create({
        activities: [
          {
            activity_id: activity.id,
            activity_slot_id: selectedSlotId,
            participants,
          },
        ],
      });

      if (res.success && res.data) {
        router.push(`/checkout/${res.data.id}`);
      }
    } catch (err: any) {
      setBookingError(err.message || "Failed to reserve slot");
    } finally {
      setReserving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-stone-600">Loading activity details...</p>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold">Activity Not Found</h2>
        <Link href="/activities" className="inline-block px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold">
          Explore Activities
        </Link>
      </div>
    );
  }

  const selectedSlot = activity.slots?.find((s: any) => s.id === selectedSlotId);
  const totalCost = (selectedSlot?.price || activity.price) * participants;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-xs font-bold text-brand-600 uppercase tracking-widest">
          <MapPin className="w-3.5 h-3.5" />
          <span>{activity.location?.name}, Gujarat</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
          {activity.name}
        </h1>
        <div className="flex items-center space-x-3 text-xs text-stone-500">
          <span className="capitalize font-bold text-stone-700">{activity.category}</span>
          <span>•</span>
          <span>Duration: {activity.duration}</span>
          <span>•</span>
          <span>Difficulty: {activity.difficulty}</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-3xl overflow-hidden aspect-[16/9] bg-stone-100 shadow-md">
            <img
              src={activity.image_url || "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=80"}
              alt={activity.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-black text-stone-900">About this Experience</h2>
            <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-line">
              {activity.description}
            </p>
          </div>

          {/* Inclusions & Exclusions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-stone-200">
            {activity.included_items && (
              <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-200/60 space-y-2">
                <h4 className="text-xs font-bold text-emerald-900 uppercase">What's Included</h4>
                <p className="text-xs text-stone-700 leading-relaxed">{activity.included_items}</p>
              </div>
            )}

            {activity.excluded_items && (
              <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <h4 className="text-xs font-bold text-stone-700 uppercase">What's Excluded</h4>
                <p className="text-xs text-stone-600 leading-relaxed">{activity.excluded_items}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Slot Selection & Booking */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-xl space-y-6 sticky top-28">
          <div>
            <span className="text-2xl font-black text-stone-900">
              ₹{activity.price.toLocaleString("en-IN")}
            </span>
            <span className="text-xs text-stone-500 font-medium"> / person</span>
          </div>

          {/* Slots Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 uppercase block">Available Date & Time Slots</label>
            {activity.slots && activity.slots.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {activity.slots.map((s: any) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSlotId(s.id)}
                    className={`w-full p-3 rounded-xl border text-xs font-bold text-left transition-all flex items-center justify-between ${
                      selectedSlotId === s.id
                        ? "border-brand-500 bg-brand-50/60 text-brand-900 shadow-sm"
                        : "border-stone-200 hover:border-stone-300 text-stone-700"
                    }`}
                  >
                    <div>
                      <span>{s.date}</span> • <span>{s.start_time} - {s.end_time}</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      {s.remaining_capacity} spots left
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400">No active slots scheduled.</p>
            )}
          </div>

          {/* Participants */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase block">Participants</label>
            <select
              value={participants}
              onChange={(e) => setParticipants(Number(e.target.value))}
              className="w-full p-3 rounded-xl border border-stone-200 text-xs font-bold text-stone-900 bg-stone-50"
            >
              {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n} Participant{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Total Breakdown */}
          <div className="pt-3 border-t border-stone-100 flex justify-between items-center text-sm font-black text-stone-900">
            <span>Estimated Total</span>
            <span className="text-xl text-brand-600">₹{totalCost.toLocaleString("en-IN")}</span>
          </div>

          {bookingError && (
            <p className="text-xs text-rose-600 font-semibold">{bookingError}</p>
          )}

          <button
            onClick={handleBookActivity}
            disabled={reserving || !selectedSlotId}
            className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm shadow-xl shadow-brand-500/25 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <span>{reserving ? "Booking Spot..." : "Book Activity Spot"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
