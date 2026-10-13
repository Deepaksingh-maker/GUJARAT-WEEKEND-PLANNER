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
  Star 
} from "lucide-react";
import { api } from "@/lib/api";
import PropertyCard from "@/components/PropertyCard";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import { processUniqueDestinations } from "@/lib/wikipediaImageService";

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters State from URL or defaults
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [propertyType, setPropertyType] = useState(searchParams.get("property_type") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [guests, setGuests] = useState(searchParams.get("guests") || "");
  const [pool, setPool] = useState(searchParams.get("pool") === "true");
  const [wifi, setWifi] = useState(searchParams.get("wifi") === "true");
  const [parking, setParking] = useState(searchParams.get("parking") === "true");
  const [petFriendly, setPetFriendly] = useState(searchParams.get("pet_friendly") === "true");
  const [sortBy, setSortBy] = useState(searchParams.get("sort_by") || "recommended");

  // Data State
  const [locations, setLocations] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
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

  // Fetch properties whenever filters change
  const fetchFilteredProperties = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        sort_by: sortBy,
      };
      if (location) params.location = location;
      if (propertyType) params.property_type = propertyType;
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;
      if (guests) params.guests = guests;
      if (pool) params.pool = true;
      if (wifi) params.wifi = true;
      if (parking) params.parking = true;
      if (petFriendly) params.pet_friendly = true;

      const res = await api.properties.getAll(params);
      if (res.success) {
        setProperties(res.data);
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
    if (location) query.set("location", location);
    if (propertyType) query.set("property_type", propertyType);
    if (minPrice) query.set("minPrice", minPrice);
    if (maxPrice) query.set("maxPrice", maxPrice);
    if (guests) query.set("guests", guests);
    if (pool) query.set("pool", "true");
    if (wifi) query.set("wifi", "true");
    if (parking) query.set("parking", "true");
    if (petFriendly) query.set("pet_friendly", "true");
    if (sortBy !== "recommended") query.set("sort_by", sortBy);

    router.replace(`/explore?${query.toString()}`, { scroll: false });
  }, [location, propertyType, minPrice, maxPrice, guests, pool, wifi, parking, petFriendly, sortBy]);

  const handleResetFilters = () => {
    setLocation("");
    setPropertyType("");
    setMinPrice("");
    setMaxPrice("");
    setGuests("");
    setPool(false);
    setWifi(false);
    setParking(false);
    setPetFriendly(false);
    setSortBy("recommended");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <span className="text-xs font-bold text-brand-600 uppercase tracking-widest block mb-1">
            Real-time Inventory
          </span>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">
            Explore Gujarat Weekend Stays
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Found {properties.length} verified available stays for your selected preferences.
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

          {/* Location Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              Gujarat Destination
            </label>
            <LocationAutocomplete
              value={location}
              onChange={(val, loc) => setLocation(loc?.slug || val)}
              placeholder="All Gujarat (search city, taluka...)"
              variant="filter"
            />
          </div>

          {/* Property Type Filter */}
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

          {/* Guests */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              Minimum Guests Capacity
            </label>
            <select
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              className="w-full p-3 rounded-xl border border-stone-200 text-sm font-semibold text-stone-800 bg-stone-50 focus:outline-none"
            >
              <option value="">Any Capacity</option>
              <option value="2">2+ Guests (Couples)</option>
              <option value="4">4+ Guests (Families)</option>
              <option value="6">6+ Guests (Small Group)</option>
              <option value="10">10+ Guests (Large Gatherings)</option>
            </select>
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
            <button
              onClick={() => setFilterDrawerOpen(false)}
              className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl"
            >
              Apply Filters ({properties.length} stays)
            </button>
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
              <h3 className="text-lg font-bold text-stone-800">No properties match your filters</h3>
              <p className="text-sm text-stone-500 max-w-md mx-auto">
                Try widening your price range, clearing amenity filters, or selecting a different Gujarat destination.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-5 py-2.5 rounded-xl bg-stone-900 text-white font-bold text-sm"
              >
                Reset All Filters
              </button>
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
