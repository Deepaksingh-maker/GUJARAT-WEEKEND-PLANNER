"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Filter, 
  MapPin, 
  SlidersHorizontal, 
  RotateCcw, 
  Waves, 
  Wifi, 
  Car, 
  PawPrint, 
  Search, 
  Check, 
  Star,
  Calendar,
  Building2,
  Users,
  Eye,
  EyeOff,
  Sparkles,
  Info
} from "lucide-react";
import { api } from "@/lib/api";
import PropertyCard from "@/components/PropertyCard";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import { processUniqueDestinations } from "@/lib/wikipediaImageService";

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search Dates & Capacity
  const todayStr = new Date().toISOString().split("T")[0];
  const [location, setLocation] = useState(searchParams.get("destination") || searchParams.get("location") || "");
  const [checkIn, setCheckIn] = useState(searchParams.get("check_in") || "");
  const [checkOut, setCheckOut] = useState(searchParams.get("check_out") || "");
  const [guests, setGuests] = useState(searchParams.get("guests") || "");
  const [quantity, setQuantity] = useState(parseInt(searchParams.get("quantity") || "1", 10) || 1);
  const [includeUnavailable, setIncludeUnavailable] = useState(searchParams.get("include_unavailable") === "true");

  // Filters State
  const [propertyType, setPropertyType] = useState(searchParams.get("property_type") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [pool, setPool] = useState(searchParams.get("pool") === "true");
  const [wifi, setWifi] = useState(searchParams.get("wifi") === "true");
  const [parking, setParking] = useState(searchParams.get("parking") === "true");
  const [petFriendly, setPetFriendly] = useState(searchParams.get("pet_friendly") === "true");
  const [sortBy, setSortBy] = useState(searchParams.get("sort_by") || "recommended");

  // Data State
  const [locations, setLocations] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Load locations on mount
  useEffect(() => {
    api.locations.getAll().then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setLocations(res.data);
        processUniqueDestinations(res.data).then((unique) => {
          setLocations(unique);
        });
      }
    });
  }, []);

  // Fetch properties whenever filters or dates change
  const fetchFilteredProperties = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        sort_by: sortBy,
      };
      if (location) params.destination = location;
      if (checkIn) params.check_in = checkIn;
      if (checkOut) params.check_out = checkOut;
      if (guests) params.guests = guests;
      if (quantity && quantity > 1) params.quantity = quantity;
      if (includeUnavailable) params.include_unavailable = true;

      if (propertyType) params.property_type = propertyType;
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;
      if (pool) params.pool = true;
      if (wifi) params.wifi = true;
      if (parking) params.parking = true;
      if (petFriendly) params.pet_friendly = true;

      // Use search endpoint when dates or destination provided, fallback to getAll
      const res = await api.properties.search(params);
      if (res.success) {
        setProperties(res.data);
        setTotalCount(res.count ?? res.data.length);
      }
    } catch (err) {
      console.error("Error fetching properties:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredProperties();

    // Update URL query parameters seamlessly
    const query = new URLSearchParams();
    if (location) query.set("destination", location);
    if (checkIn) query.set("check_in", checkIn);
    if (checkOut) query.set("check_out", checkOut);
    if (guests) query.set("guests", guests);
    if (quantity > 1) query.set("quantity", String(quantity));
    if (includeUnavailable) query.set("include_unavailable", "true");
    if (propertyType) query.set("property_type", propertyType);
    if (minPrice) query.set("minPrice", minPrice);
    if (maxPrice) query.set("maxPrice", maxPrice);
    if (pool) query.set("pool", "true");
    if (wifi) query.set("wifi", "true");
    if (parking) query.set("parking", "true");
    if (petFriendly) query.set("pet_friendly", "true");
    if (sortBy !== "recommended") query.set("sort_by", sortBy);

    router.replace(`/explore?${query.toString()}`, { scroll: false });
  }, [
    location,
    checkIn,
    checkOut,
    guests,
    quantity,
    includeUnavailable,
    propertyType,
    minPrice,
    maxPrice,
    pool,
    wifi,
    parking,
    petFriendly,
    sortBy,
  ]);

  const handleResetFilters = () => {
    setLocation("");
    setCheckIn("");
    setCheckOut("");
    setGuests("");
    setQuantity(1);
    setIncludeUnavailable(false);
    setPropertyType("");
    setMinPrice("");
    setMaxPrice("");
    setPool(false);
    setWifi(false);
    setParking(false);
    setPetFriendly(false);
    setSortBy("recommended");
  };

  // Safe minimum checkout date
  const minCheckOutDate = checkIn
    ? new Date(new Date(checkIn).getTime() + 86400000).toISOString().split("T")[0]
    : todayStr;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Interactive Live Availability Search Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/90 shadow-lg shadow-stone-200/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
          {/* Destination */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-1">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
              <span>Destination</span>
            </label>
            <LocationAutocomplete
              value={location}
              onChange={(val, loc) => setLocation(loc?.slug || val)}
              placeholder="Where in Gujarat?"
              variant="filter"
            />
          </div>

          {/* Check-in */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Check-in</span>
            </label>
            <input
              type="date"
              min={todayStr}
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value);
                if (checkOut && e.target.value >= checkOut) {
                  const nextDay = new Date(new Date(e.target.value).getTime() + 86400000).toISOString().split("T")[0];
                  setCheckOut(nextDay);
                }
              }}
              className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-800 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Check-out */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-rose-600" />
              <span>Check-out</span>
            </label>
            <input
              type="date"
              min={minCheckOutDate}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-800 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Guests & Rooms */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center space-x-1">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Guests & Rooms</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-800 bg-stone-50 focus:outline-none"
              >
                <option value="">Guests</option>
                <option value="1">1 Guest</option>
                <option value="2">2 Guests</option>
                <option value="4">4 Guests</option>
                <option value="6">6 Guests</option>
                <option value="8">8 Guests</option>
                <option value="12">12+ Guests</option>
              </select>

              <select
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-800 bg-stone-50 focus:outline-none"
              >
                <option value="1">1 Room</option>
                <option value="2">2 Rooms</option>
                <option value="3">3 Rooms</option>
                <option value="4">4 Rooms</option>
                <option value="5">5+ Rooms</option>
              </select>
            </div>
          </div>

          {/* Quick Actions / Reset */}
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchFilteredProperties}
              className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center space-x-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search Dates</span>
            </button>
            {(checkIn || checkOut || location || guests || quantity > 1) && (
              <button
                onClick={handleResetFilters}
                className="p-2.5 rounded-xl border border-stone-200 text-stone-500 hover:text-stone-800 bg-stone-50"
                title="Reset Search"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Toggle: Show Unavailable Stays */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <label className="flex items-center space-x-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={includeUnavailable}
              onChange={(e) => setIncludeUnavailable(e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 border-stone-300"
            />
            <span className="font-semibold text-stone-700 group-hover:text-stone-900 flex items-center space-x-1">
              {includeUnavailable ? (
                <Eye className="w-3.5 h-3.5 text-stone-500" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-stone-400" />
              )}
              <span>Show unavailable & sold-out stays</span>
            </span>
            <span className="text-stone-400 text-[11px] hidden sm:inline">
              (allows inspecting full calendar or alternative dates)
            </span>
          </label>

          {checkIn && checkOut && (
            <div className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold text-[11px]">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span>Real-time DB availability active for selected dates</span>
            </div>
          )}
        </div>
      </div>

      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <span className="text-xs font-bold text-brand-600 uppercase tracking-widest block mb-1">
            Database-Driven Stay Inventory
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            {location ? `Stays in ${location.charAt(0).toUpperCase() + location.slice(1)}` : "Explore Gujarat Weekend Stays"}
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            {checkIn && checkOut ? (
              <span>
                Found <strong className="text-stone-800">{properties.length}</strong> stays for{" "}
                <strong className="text-stone-800">{checkIn} to {checkOut}</strong> ({quantity} room{quantity > 1 ? "s" : ""})
                {!includeUnavailable && " (showing only bookable inventory)"}
              </span>
            ) : (
              <span>
                Showing <strong className="text-stone-800">{properties.length}</strong> verified stays across Gujarat. Select check-in & check-out dates above to check live availability.
              </span>
            )}
          </p>
        </div>

        {/* Sorting Dropdown & Mobile Filter Toggle */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
            className="md:hidden flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-stone-300 font-bold text-sm text-stone-700 bg-white"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-stone-500 hidden sm:inline">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-bold text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="recommended">Recommended</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest Added</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* FILTERS SIDEBAR */}
        <div
          className={`lg:block ${
            filterDrawerOpen ? "block fixed inset-0 z-50 bg-white p-6 overflow-y-auto" : "hidden"
          } lg:relative bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-6`}
        >
          <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <h3 className="font-extrabold text-stone-900 flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-brand-600" />
              <span>Filters</span>
            </h3>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleResetFilters}
                className="text-xs text-brand-600 hover:text-brand-700 font-bold flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
              {filterDrawerOpen && (
                <button
                  onClick={() => setFilterDrawerOpen(false)}
                  className="lg:hidden text-xs font-bold text-stone-600 px-2 py-1 bg-stone-100 rounded-md ml-2"
                >
                  Close
                </button>
              )}
            </div>
          </div>

          {/* Stay Type Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              Stay Type
            </label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="w-full p-3 rounded-xl border border-stone-200 text-sm font-semibold text-stone-800 bg-stone-50 focus:outline-none"
            >
              <option value="">Any Stay Type</option>
              <option value="hotel">Hotels & Heritage</option>
              <option value="resort">Resorts & Retreats</option>
              <option value="villa">Private Pool Villas</option>
              <option value="homestay">Heritage Homestays</option>
              <option value="guest_house">Guest Houses & Bhavans</option>
              <option value="boutique">Boutique Stays</option>
              <option value="farmhouse">Orchard Farmhouses</option>
              <option value="camping">Camping & Glamping</option>
              <option value="cottage">Riverside Cottages</option>
              <option value="holiday_home">Holiday Homes</option>
            </select>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              Price per Night (₹)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min ₹"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-800 bg-stone-50 focus:outline-none"
              />
              <input
                type="number"
                placeholder="Max ₹"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-800 bg-stone-50 focus:outline-none"
              />
            </div>
          </div>

          {/* Amenity Checkboxes */}
          <div className="space-y-3 pt-2 border-t border-stone-100">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              Amenities
            </label>

            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={pool}
                onChange={(e) => setPool(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
              />
              <span className="text-xs font-medium text-stone-700 flex items-center space-x-1.5">
                <Waves className="w-3.5 h-3.5 text-blue-500" />
                <span>Private Swimming Pool</span>
              </span>
            </label>

            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={wifi}
                onChange={(e) => setWifi(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
              />
              <span className="text-xs font-medium text-stone-700 flex items-center space-x-1.5">
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                <span>High-Speed Wi-Fi</span>
              </span>
            </label>

            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={parking}
                onChange={(e) => setParking(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
              />
              <span className="text-xs font-medium text-stone-700 flex items-center space-x-1.5">
                <Car className="w-3.5 h-3.5 text-purple-500" />
                <span>Free On-Site Parking</span>
              </span>
            </label>

            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={petFriendly}
                onChange={(e) => setPetFriendly(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
              />
              <span className="text-xs font-medium text-stone-700 flex items-center space-x-1.5">
                <PawPrint className="w-3.5 h-3.5 text-amber-500" />
                <span>Pet Friendly</span>
              </span>
            </label>
          </div>

          {filterDrawerOpen && (
            <div className="lg:hidden sticky bottom-0 -mx-6 -mb-6 p-4 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-xl flex items-center space-x-3 z-50">
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition-colors"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setFilterDrawerOpen(false)}
                className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Show {properties.length} Stays
              </button>
            </div>
          )}
        </div>

        {/* RESULTS GRID */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-80 bg-stone-200 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-stone-800">
                {checkIn && checkOut
                  ? "No bookable stays available for these dates"
                  : "No properties match your filters"}
              </h3>
              <p className="text-sm text-stone-500 max-w-md mx-auto">
                {checkIn && checkOut && !includeUnavailable
                  ? "All properties for these dates might be fully booked. Turn on 'Show unavailable & sold-out stays' to inspect full calendars or try different dates."
                  : "Try widening your price range, reducing requested room quantity, or selecting another Gujarat destination."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {checkIn && checkOut && !includeUnavailable && (
                  <button
                    onClick={() => setIncludeUnavailable(true)}
                    className="px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-sm shadow-sm hover:bg-brand-700 transition-colors"
                  >
                    Show Sold-Out Stays
                  </button>
                )}
                <button
                  onClick={handleResetFilters}
                  className="px-5 py-2.5 rounded-xl bg-stone-900 text-white font-bold text-sm hover:bg-black transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {properties.map((prop) => (
                <PropertyCard key={prop.id} property={prop} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center">Loading Gujarat Stays...</div>}>
      <ExploreContent />
    </Suspense>
  );
}
