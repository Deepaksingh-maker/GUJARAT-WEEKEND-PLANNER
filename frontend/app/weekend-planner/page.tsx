"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Sparkles, 
  MapPin, 
  Calendar as CalendarIcon, 
  Users, 
  Wallet, 
  Compass, 
  CheckCircle, 
  ArrowRight, 
  ShieldCheck, 
  Home, 
  Clock, 
  Star 
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import LocationAutocomplete from "@/components/LocationAutocomplete";

function WeekendPlannerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  const queryDest = searchParams?.get("destination") || "";
  const queryInterest = searchParams?.get("interest") || "";
  const queryBudget = searchParams?.get("budget");
  const queryGuests = searchParams?.get("guests");

  // Next weekend default dates
  const today = new Date();
  const nextFriday = new Date();
  nextFriday.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7 || 7));
  const nextSunday = new Date(nextFriday);
  nextSunday.setDate(nextSunday.getDate() + 2);

  const [destination, setDestination] = useState(queryDest || "Saputara");
  const [dateStart, setDateStart] = useState(nextFriday.toISOString().split("T")[0]);
  const [dateEnd, setDateEnd] = useState(nextSunday.toISOString().split("T")[0]);
  const [guests, setGuests] = useState(queryGuests ? Number(queryGuests) : 2);
  const [budget, setBudget] = useState(queryBudget ? Number(queryBudget) : 15000);
  const [interest, setInterest] = useState(queryInterest || "Nature");

  const [locations, setLocations] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingPlanId, setBookingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const interests = [
    { label: "Nature & Forests", value: "Nature", icon: "🌲" },
    { label: "Thrill & Adventure", value: "Adventure", icon: "🧗" },
    { label: "Quiet Relaxation", value: "Relaxation", icon: "🧘" },
    { label: "Romantic Couple", value: "Couple", icon: "✨" },
    { label: "Family Holiday", value: "Family", icon: "👨‍👩‍👧‍👦" },
    { label: "Desert & Camping", value: "Camping", icon: "⛺" },
  ];

  // Load locations and auto-generate plan on mount or query change
  useEffect(() => {
    api.locations.getAll().then((res) => {
      if (res.success && res.data.length > 0) {
        setLocations(res.data);
      }
    });

    const targetDest = queryDest || destination;
    const targetInterest = queryInterest || interest;
    const targetBudget = queryBudget ? Number(queryBudget) : budget;
    const targetGuests = queryGuests ? Number(queryGuests) : guests;

    if (queryDest && queryDest !== destination) setDestination(queryDest);
    if (queryInterest && queryInterest !== interest) setInterest(queryInterest);
    if (queryBudget && Number(queryBudget) !== budget) setBudget(Number(queryBudget));
    if (queryGuests && Number(queryGuests) !== guests) setGuests(Number(queryGuests));

    executePlanGeneration(targetDest, targetInterest, targetBudget, targetGuests);
  }, [queryDest, queryInterest, queryBudget, queryGuests]);

  const executePlanGeneration = async (
    dest: string,
    intVal: string,
    budVal: number,
    gstVal: number
  ) => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.planner.generate({
        destination: dest,
        date_start: dateStart,
        date_end: dateEnd,
        guests: Number(gstVal),
        budget: Number(budVal),
        interest: intVal,
      });

      if (res.success && res.data.generated_plans) {
        setPlans(res.data.generated_plans);
      } else {
        setPlans([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate weekend plan");
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = () => {
    executePlanGeneration(destination, interest, budget, guests);
  };

  const handleBookPlan = async (plan: any) => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/weekend-planner`);
      return;
    }

    try {
      setBookingPlanId(plan.plan_id);

      const activitiesPayload = plan.activities.map((actItem: any) => {
        return {
          activity_id: actItem.activity.id,
          activity_slot_id: actItem.recommended_slot?.slot_id || 1,
          participants: guests,
        };
      });

      const res = await api.bookings.create({
        property_id: plan.stay?.property?.id,
        check_in: dateStart,
        check_out: dateEnd,
        guest_count: Number(guests),
        special_requests: `Curated Weekend Plan: ${plan.title}`,
        activities: activitiesPayload,
      });

      if (res.success && res.data) {
        router.push(`/checkout/${res.data.id}`);
      }
    } catch (err: any) {
      alert(err.message || "Failed to book this plan. Some slots might be full.");
    } finally {
      setBookingPlanId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero Header */}
      <div className="max-w-3xl space-y-4">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold tracking-wide uppercase">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>Curated Gujarat Engine</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight">
          Gujarat Weekend Planner
        </h1>
        <p className="text-base text-stone-600 leading-relaxed">
          Tell us your destination, budget, and weekend vibe. Our intelligent engine matches verified database stays and guided activities into a ready-to-book all-in-one itinerary.
        </p>
      </div>

      {/* PLANNER INPUT CONTROLS */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-lg space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Destination */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-600 uppercase flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
              <span>Gujarat Destination</span>
            </label>
            <LocationAutocomplete
              value={destination}
              onChange={(val) => setDestination(val)}
              placeholder="e.g. Saputara, Dwarka, Somnath, Gir"
              variant="filter"
            />
          </div>

          {/* Dates */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-600 uppercase flex items-center space-x-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-brand-600" />
              <span>Weekend Dates</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-800 bg-stone-50"
              />
              <input
                type="date"
                value={dateEnd}
                min={dateStart}
                onChange={(e) => setDateEnd(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-800 bg-stone-50"
              />
            </div>
          </div>

          {/* Travelers */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-600 uppercase flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-brand-600" />
              <span>Number of People</span>
            </label>
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full p-3 rounded-2xl border border-stone-200 text-sm font-bold text-stone-800 bg-stone-50 focus:outline-none"
            >
              <option value="1">1 Person</option>
              <option value="2">2 People (Couple / Duo)</option>
              <option value="4">4 People (Family / Friends)</option>
              <option value="6">6 People (Group)</option>
              <option value="10">10+ People (Corporate / Reunion)</option>
            </select>
          </div>

          {/* Budget */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-600 uppercase flex items-center space-x-1.5">
              <Wallet className="w-3.5 h-3.5 text-brand-600" />
              <span>Budget (₹{budget.toLocaleString("en-IN")})</span>
            </label>
            <input
              type="range"
              min="5000"
              max="40000"
              step="1000"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full accent-brand-600 h-2 bg-stone-200 rounded-lg cursor-pointer mt-3"
            />
          </div>
        </div>

        {/* Interests Pills */}
        <div className="space-y-2 pt-2 border-t border-stone-100">
          <label className="text-xs font-bold text-stone-600 uppercase block">
            What is your main interest?
          </label>
          <div className="flex flex-wrap gap-2.5">
            {interests.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setInterest(item.value)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 ${
                  interest === item.value
                    ? "bg-brand-600 text-white shadow-md shadow-brand-500/25 scale-105"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Generate Plan Button */}
        <div>
          <button
            onClick={generatePlan}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-sm tracking-wide shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{loading ? "Matching Real Gujarat Inventory..." : "Generate My Weekend Plan"}</span>
          </button>
        </div>
      </div>

      {/* GENERATED PLANS DISPLAY */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">
            Curated Weekend Itineraries ({plans.length})
          </h2>
          <span className="text-xs text-stone-500 font-medium">
            Database checked for {dateStart} to {dateEnd}
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-stone-600">Customizing stay + activities plan...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 space-y-3">
            <Compass className="w-12 h-12 text-stone-400 mx-auto" />
            <h3 className="text-lg font-bold text-stone-800">No matching package found for these dates</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Try adjusting your budget or selecting another weekend destination.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.plan_id}
                className="bg-white rounded-3xl p-7 border border-stone-200/80 shadow-md hover:shadow-xl transition-all space-y-6 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Badge & Title */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider block mb-1">
                        📍 {plan.destination} Experience
                      </span>
                      <h3 className="text-2xl font-black text-stone-900">{plan.title}</h3>
                      <p className="text-xs text-stone-500 mt-1">{plan.tagline}</p>
                    </div>

                    <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-extrabold border border-emerald-200">
                      {plan.match_score}% Match
                    </div>
                  </div>

                  {/* Stay Item */}
                  {plan.stay && (
                    <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-1">
                          <Home className="w-3.5 h-3.5 text-brand-600" />
                          <span>Stay Included ({plan.stay.nights} Nights)</span>
                        </span>
                        <span className="text-xs font-bold text-stone-900">
                          ₹{plan.stay.estimated_stay_cost.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <img
                          src={plan.stay.property.images[0]?.image_url || "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=400&q=80"}
                          alt={plan.stay.property.name}
                          className="w-16 h-16 rounded-xl object-cover"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-stone-900">{plan.stay.property.name}</h4>
                          <span className="text-xs text-stone-500 capitalize">
                            {plan.stay.property.property_type} • Up to {plan.stay.property.max_guests} Guests
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Activities Included */}
                  {plan.activities.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                        🏕️ Experiential Activities ({plan.activities.length})
                      </span>

                      {plan.activities.map((actItem: any) => (
                        <div
                          key={actItem.activity.id}
                          className="p-3 rounded-2xl bg-amber-50/50 border border-amber-200/70 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center space-x-2.5">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <div>
                              <p className="font-bold text-stone-900">{actItem.activity.name}</p>
                              <span className="text-[11px] text-stone-500">
                                {actItem.recommended_slot?.start_time || "Morning Slot"} • {actItem.activity.duration}
                              </span>
                            </div>
                          </div>

                          <span className="font-extrabold text-stone-900">
                            ₹{actItem.estimated_activity_cost.toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Highlights */}
                  <div className="space-y-1.5 pt-2">
                    {plan.highlights.map((hl: string, idx: number) => (
                      <div key={idx} className="flex items-center space-x-2 text-xs text-stone-600">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing & CTA */}
                <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-stone-400 block font-medium">Estimated Total Package</span>
                    <span className="text-2xl font-black text-brand-600">
                      ₹{plan.estimated_total.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <button
                    onClick={() => handleBookPlan(plan)}
                    disabled={bookingPlanId === plan.plan_id}
                    className="px-6 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-brand-600/30 active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50"
                  >
                    <span>{bookingPlanId === plan.plan_id ? "Booking Plan..." : "BOOK PLAN"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WeekendPlannerPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center space-x-2 text-brand-600 font-bold text-sm animate-pulse">
            <Sparkles className="w-5 h-5 animate-spin" />
            <span>Loading Gujarat Weekend Planner...</span>
          </div>
        </div>
      }
    >
      <WeekendPlannerContent />
    </Suspense>
  );
}
