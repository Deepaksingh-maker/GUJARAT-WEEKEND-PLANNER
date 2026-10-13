"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, 
  MapPin, 
  Calendar as CalendarIcon, 
  Users, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  Trees, 
  Waves, 
  Home, 
  Tent, 
  Compass, 
  CheckCircle2, 
  Flame,
  Award
} from "lucide-react";
import { api } from "@/lib/api";
import PropertyCard from "@/components/PropertyCard";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import { 
  processUniqueDestinations, 
  DestinationPlace, 
  CONTROLLED_LOCAL_FALLBACKS, 
  GENERIC_GUJARAT_FALLBACKS 
} from "@/lib/wikipediaImageService";

export default function HomePage() {
  const router = useRouter();

  // Search Bar State
  const [locations, setLocations] = useState<any[]>([]);
  const [uniqueDestinations, setUniqueDestinations] = useState<DestinationPlace[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guestsCount, setGuestsCount] = useState("2");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Data States
  const [popularProperties, setPopularProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllCities, setShowAllCities] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState("");

  // Filter exclusively for Gujarat Cities (No administrative districts, no small villages)
  const gujaratCities = React.useMemo(() => {
    return locations.filter((loc) => 
      loc.type === "city" && 
      !loc.name.endsWith(" District") && 
      !loc.name.toLowerCase().includes(" district")
    );
  }, [locations]);

  // If user searches inside the expanded view
  const filteredCities = React.useMemo(() => {
    if (!citySearchQuery.trim()) return gujaratCities;
    const q = citySearchQuery.toLowerCase().trim();
    return gujaratCities.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        (loc.landmark_name && loc.landmark_name.toLowerCase().includes(q))
    );
  }, [gujaratCities, citySearchQuery]);

  // Display exactly 3 stacks (12 cards: 3 rows x 4 cols on desktop) unless expanded
  const displayedCities = showAllCities
    ? filteredCities
    : gujaratCities.slice(0, 12);

  const getCityImageUrl = (loc: any) => {
    const rawSlug = (loc.slug || loc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).toLowerCase();
    return `/images/cities/${rawSlug}.jpg`;
  };

  const getCityFallbackUrl = (loc: any) => {
    if (loc.image_url && !loc.image_url.includes("Adalaj_ki_Vav")) {
      return loc.image_url;
    }
    const rawSlug = (loc.slug || loc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).toLowerCase();
    return `/images/cities/${rawSlug}.jpg`;
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [locRes, propRes] = await Promise.all([
          api.locations.getAll(),
          api.properties.getAll({ is_featured: true })
        ]);
        if (locRes.success && Array.isArray(locRes.data)) {
          setLocations(locRes.data);
        }
        if (propRes.success) setPopularProperties(propRes.data);
      } catch (err) {
        console.error("Failed to load homepage data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedLocation) params.append("location", selectedLocation);
    if (checkInDate) params.append("checkIn", checkInDate);
    if (checkOutDate) params.append("checkOut", checkOutDate);
    if (guestsCount) params.append("guests", guestsCount);
    if (selectedCategory) params.append("property_type", selectedCategory);

    router.push(`/explore?${params.toString()}`);
  };

  const experienceCategories = [
    { label: "Private Pool Villas", type: "villa", icon: Waves, color: "from-blue-500 to-cyan-500" },
    { label: "Riverside Resorts", type: "resort", icon: Trees, color: "from-emerald-500 to-teal-500" },
    { label: "Organic Farmhouses", type: "farmhouse", icon: Home, color: "from-amber-500 to-orange-500" },
    { label: "Desert & Hill Camps", type: "camping", icon: Tent, color: "from-purple-500 to-pink-500" },
    { label: "Nature & Forest Trails", type: "nature", icon: Compass, isActivity: true, color: "from-green-600 to-emerald-700" },
    { label: "Adventure & ATV", type: "adventure", icon: Sparkles, isActivity: true, color: "from-rose-500 to-red-600" },
  ];

  return (
    <div className="space-y-20 pb-20">
      {/* HERO SECTION */}
      <section className="relative min-h-[640px] flex items-center justify-center pt-8 pb-16 px-4 sm:px-6 lg:px-8">
        {/* Background photo & overlay */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=85"
            alt="Gujarat Nature Landscape"
            className="w-full h-full object-cover object-center scale-105 filter brightness-95"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/85 via-stone-900/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-50 via-transparent to-transparent" />
        </div>

        <div className="relative max-w-6xl mx-auto w-full space-y-10">
          {/* Main Hero Header */}
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-wider uppercase">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Gujarat-Only Verified Weekend Escapes</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white tracking-tight leading-[1.08]">
              YOUR NEXT WEEKEND <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-brand-400 to-orange-400">
                STARTS IN GUJARAT.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-stone-200 font-medium max-w-xl leading-relaxed">
              Discover beautiful stays, unique outdoor experiences, and unforgettable weekend escapes across Saputara, Polo Forest, Sasan Gir, Kevadia, and Kutch.
            </p>
          </div>

          {/* Hero Search Box */}
          <div className="bg-white/95 backdrop-blur-xl p-4 sm:p-5 rounded-3xl shadow-2xl border border-white/40 max-w-5xl">
            <form onSubmit={handleHeroSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-center">
              {/* Destination */}
              <div className="relative p-2.5 bg-stone-50 hover:bg-stone-100/80 rounded-2xl border border-stone-200/80 transition-colors">
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-0.5 px-1">
                  Destination in Gujarat
                </label>
                <LocationAutocomplete
                  value={selectedLocation}
                  onChange={(val, loc) => setSelectedLocation(loc?.slug || val)}
                  placeholder="Where in Gujarat? (e.g. Saputara, Sanand)"
                  variant="hero"
                  inputClassName="w-full bg-transparent text-sm font-bold text-stone-800 placeholder-stone-400 focus:outline-none pl-7 pr-7 py-0.5"
                />
              </div>

              {/* Dates */}
              <div className="relative p-3 bg-stone-50 hover:bg-stone-100/80 rounded-2xl border border-stone-200/80 transition-colors">
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Dates
                </label>
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-stone-800 focus:outline-none"
                    placeholder="Check-in"
                  />
                </div>
              </div>

              {/* Guests */}
              <div className="relative p-3 bg-stone-50 hover:bg-stone-100/80 rounded-2xl border border-stone-200/80 transition-colors">
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Travelers
                </label>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  <select
                    value={guestsCount}
                    onChange={(e) => setGuestsCount(e.target.value)}
                    className="w-full bg-transparent text-sm font-bold text-stone-800 focus:outline-none cursor-pointer"
                  >
                    <option value="1">1 Guest</option>
                    <option value="2">2 Guests (Couple)</option>
                    <option value="4">4 Guests (Family)</option>
                    <option value="6">6 Guests (Group)</option>
                    <option value="10">10+ Guests (Corporate / Reunion)</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  className="w-full h-14 bg-gradient-to-r from-brand-600 to-amber-500 hover:from-brand-700 hover:to-amber-600 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-brand-500/30 flex items-center justify-center space-x-2 active:scale-95 transition-all"
                >
                  <Search className="w-5 h-5" />
                  <span>Search Escapes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* EXPLORE GUJARAT DESTINATIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs font-bold text-brand-600 uppercase tracking-widest block">
                Iconic Urban Escapes
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
                {gujaratCities.length} Gujarat Cities
              </span>
            </div>
            <h2 className="text-3xl font-black text-stone-900 tracking-tight">
              Explore Gujarat Cities
            </h2>
            <p className="text-sm text-stone-500 mt-1">
              Top curated cities and iconic urban getaways across Gujarat.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setShowAllCities(!showAllCities);
                if (showAllCities) setCitySearchQuery("");
              }}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-sm font-bold text-stone-800 transition-colors"
            >
              <span>{showAllCities ? "View Top 12 Cities" : `View All (${gujaratCities.length} Cities)`}</span>
            </button>
            <Link
              href="/explore"
              className="flex items-center space-x-1.5 text-sm font-bold text-brand-600 hover:text-brand-700 group"
            >
              <span>Explore Stays</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Search bar inside expanded view */}
        {showAllCities && (
          <div className="mb-6 relative max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={citySearchQuery}
              onChange={(e) => setCitySearchQuery(e.target.value)}
              placeholder={`Search among all ${gujaratCities.length} Gujarat cities...`}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm font-semibold text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
            />
            {citySearchQuery && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-medium">
                {filteredCities.length} found
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {displayedCities.map((loc) => (
            <Link
              key={loc.id}
              href={`/explore?location=${loc.slug}`}
              className="group relative rounded-3xl overflow-hidden aspect-[4/3] bg-stone-900 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <img
                src={getCityImageUrl(loc)}
                alt={loc.name}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getCityFallbackUrl(loc);
                }}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-0.5">
                  Gujarat City
                </span>
                <h3 className="text-lg font-extrabold tracking-tight group-hover:text-amber-200 transition-colors">
                  {loc.name}
                </h3>
                {loc.landmark_name && (
                  <p className="text-[11px] text-amber-100/90 font-medium truncate mt-0.5 line-clamp-1" title={loc.landmark_name}>
                    {loc.landmark_name}
                  </p>
                )}
                <p className="text-xs text-stone-300 mt-1">
                  {loc.properties_count} Stays • {loc.activities_count} Activities
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom Expand / Collapse Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => {
              const nextState = !showAllCities;
              setShowAllCities(nextState);
              if (!nextState) {
                setCitySearchQuery("");
              }
            }}
            className="px-6 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center space-x-2"
          >
            <span>
              {showAllCities 
                ? "Show 3 Stacks (Top 12 Cities)" 
                : `View All ${gujaratCities.length} Gujarat Cities`}
            </span>
            <ArrowRight className={`w-4 h-4 transition-transform ${showAllCities ? "-rotate-90" : "rotate-90"}`} />
          </button>
        </div>
      </section>

      {/* POPULAR WEEKEND STAYS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-brand-600 uppercase tracking-widest block mb-1">
              Top Rated Inventory
            </span>
            <h2 className="text-3xl font-black text-stone-900 tracking-tight">
              Popular Gujarat Weekend Stays
            </h2>
            <p className="text-sm text-stone-500 mt-1">
              Real-time database available properties verified for cleanliness, safety, and amenities.
            </p>
          </div>

          <Link
            href="/explore"
            className="flex items-center space-x-1.5 text-sm font-bold text-brand-600 hover:text-brand-700 group"
          >
            <span>See All Stays ({popularProperties.length})</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-80 bg-stone-200 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : popularProperties.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-stone-200">
            <p className="text-stone-500">No properties loaded.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {popularProperties.map((prop) => (
              <PropertyCard key={prop.id} property={prop} />
            ))}
          </div>
        )}
      </section>

      {/* EXPLORE EXPERIENCES CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-bold text-brand-600 uppercase tracking-widest">
            Tailored Escapes
          </span>
          <h2 className="text-3xl font-black text-stone-900 tracking-tight">
            Explore Gujarat by Experience
          </h2>
          <p className="text-sm text-stone-500">
            Choose what kind of weekend you and your family are craving.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {experienceCategories.map((cat) => {
            const Icon = cat.icon;
            const targetUrl = cat.isActivity
              ? `/activities?category=${cat.type}`
              : `/explore?property_type=${cat.type}`;

            return (
              <Link
                key={cat.label}
                href={targetUrl}
                className="group flex flex-col items-center text-center p-5 bg-white rounded-2xl border border-stone-200/80 shadow-sm hover:shadow-md hover:border-brand-300 transition-all active:scale-95"
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${cat.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform mb-3`}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-sm text-stone-800 group-hover:text-brand-600 transition-colors">
                  {cat.label}
                </h4>
              </Link>
            );
          })}
        </div>
      </section>

      {/* WEEKEND PACKAGES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-15 pointer-events-none">
            <Compass className="w-full h-full text-white" />
          </div>

          <div className="relative max-w-2xl space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-4 h-4" />
              <span>All-In-One Curated Escapes</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Polo Forest & Saputara <br />
              <span className="text-amber-400">Weekend Packages</span>
            </h2>

            <div className="space-y-3 text-stone-300 text-sm">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span>1 or 2 Nights Verified Stay with Private Lawn / Balcony</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span>Guided Nature Trek or Sunrise ATV Adventure Slot Included</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span>Authentic Kathiyawadi Meals & Evening Bonfire Experience</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-baseline sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div>
                <span className="text-xs text-stone-400 block">Complete Packages Starting From</span>
                <span className="text-3xl font-black text-white">₹5,999</span>
                <span className="text-xs text-stone-300"> / package</span>
              </div>

              <Link
                href="/weekend-planner"
                className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-stone-900 font-black text-sm tracking-wide shadow-lg active:scale-95 transition-all flex items-center space-x-2"
              >
                <span>Launch Weekend Planner</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* WHY GUJARAT WEEKEND (TRUST & VERIFICATION) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 bg-white rounded-3xl border border-stone-200/80 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg text-stone-900">Admin & Host Verified</h3>
            <p className="text-sm text-stone-500 leading-relaxed">
              Every property is audited for clean pool hygiene, power backup, safe road access, and verified host ownership before being approved.
            </p>
          </div>

          <div className="p-8 bg-white rounded-3xl border border-stone-200/80 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg text-stone-900">Real Double-Booking Lock</h3>
            <p className="text-sm text-stone-500 leading-relaxed">
              Our real database lock prevents date conflicts. What you book is guaranteed for your family exclusively.
            </p>
          </div>

          <div className="p-8 bg-white rounded-3xl border border-stone-200/80 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg text-stone-900">Instant QR Booking Pass</h3>
            <p className="text-sm text-stone-500 leading-relaxed">
              Receive a verifiable QR pass immediately upon confirmed payment for hassle-free check-in at the property gate.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
