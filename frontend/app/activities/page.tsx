"use client";

import React, { useState, useEffect } from "react";
import { Compass, MapPin, Gauge, Clock, Search, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import ActivityCard from "@/components/ActivityCard";
import LocationAutocomplete from "@/components/LocationAutocomplete";

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [actRes, locRes] = await Promise.all([
          api.activities.getAll({
            location: selectedLocation || undefined,
            category: selectedCategory || undefined,
          }),
          api.locations.getAll(),
        ]);

        if (actRes.success) setActivities(actRes.data);
        if (locRes.success) setLocations(locRes.data);
      } catch (err) {
        console.error("Failed to load activities:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedLocation, selectedCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="max-w-3xl space-y-3">
        <span className="text-xs font-bold text-brand-600 uppercase tracking-widest block">
          Adventures & Nature
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight">
          Curated Gujarat Experiences
        </h1>
        <p className="text-base text-stone-600 leading-relaxed">
          Book certified guided treks, sunrise ATV rides, birding trails, kayaking, and desert cultural folk nights led by verified local operators.
        </p>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72">
          <LocationAutocomplete
            value={selectedLocation}
            onChange={(val, loc) => setSelectedLocation(loc?.slug || val)}
            placeholder="Search Gujarat destination..."
            variant="filter"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {["", "adventure", "nature", "water", "cultural"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold capitalize transition-all ${
                selectedCategory === cat
                  ? "bg-brand-600 text-white shadow-md shadow-brand-500/25"
                  : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"
              }`}
            >
              {cat === "" ? "All Categories" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Activities Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-72 bg-stone-200 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-stone-200">
          <p className="text-stone-500">No activities found matching filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {activities.map((act) => (
            <ActivityCard key={act.id} activity={act} />
          ))}
        </div>
      )}
    </div>
  );
}
