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
  Award,
  Clock,
  Star
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

const CURATED_WEEKEND_PLANS = [
  {
    id: "polo-forest",
    icon: "🌲",
    destination: "Polo Forest",
    destinationSlug: "polo-forest",
    badge: "Eco & Heritage Escape",
    title: "Polo Forest Riverside & Heritage Retreat",
    tagline: "Unwind amidst 15th-century temple ruins, lush Sabarkantha forest canopies, and crystal Harnav riverbanks.",
    duration: "2 Days / 1 Night",
    startingPrice: 5999,
    originalPrice: 7499,
    discount: "20% OFF",
    rating: 4.9,
    reviewsCount: 48,
    interest: "Nature",
    budget: 10000,
    accentColor: "from-emerald-950 via-stone-900 to-amber-950",
    badgeColor: "bg-emerald-400/20 text-emerald-300 border-emerald-400/30",
    buttonColor: "bg-amber-500 hover:bg-amber-600 text-stone-900",
    image: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
    inclusions: [
      "1 Night Verified Heritage Villa with Private Lawn & Balcony",
      "Guided Nature Trek in Ancient Polo Forest Ruins & Riverbed",
      "Authentic Kathiyawadi Woodfire Dinner & Evening Bonfire",
      "Complimentary Morning Forest Tea & Breakfast by River"
    ],
    itinerary: {
      day1: "1:00 PM Check-in -> Riverside Walk -> Sunset Bonfire & Kathiyawadi Thali",
      day2: "6:30 AM Guided Ruins Trek -> Organic Farm Breakfast -> Idar Gadh Detour"
    },
    idealFor: "Couples, Photographers & Peaceful Weekend Vibe",
    featuredPerk: "Free Bonfire Experience & Forest Guide"
  },
  {
    id: "sasan-gir",
    icon: "🦁",
    destination: "Sasan Gir",
    destinationSlug: "sasan-gir",
    badge: "Royal Wildlife Safari",
    title: "Sasan Gir Safari & Mango Grove Estate",
    tagline: "Experience the majestic Asiatic Lion habitat with luxurious farmhouse stays tucked inside organic mango orchards.",
    duration: "3 Days / 2 Nights",
    startingPrice: 9499,
    originalPrice: 12499,
    discount: "24% OFF",
    rating: 5.0,
    reviewsCount: 76,
    interest: "Nature",
    budget: 18000,
    accentColor: "from-amber-950 via-stone-900 to-stone-950",
    badgeColor: "bg-amber-400/20 text-amber-300 border-amber-400/30",
    buttonColor: "bg-amber-500 hover:bg-amber-600 text-stone-900",
    image: "https://images.unsplash.com/photo-1534177616072-ef7dc120449d?auto=format&fit=crop&w=1200&q=80",
    inclusions: [
      "2 Nights in Private Mango Grove Villa with Swimming Pool",
      "Devalia Safari Park Permit Assistance & Guided Birding Trail",
      "Authentic Kathiyawadi Farm Meals (Ringna No Oro, Rotla & Chaas)",
      "Evening Stargazing Lawn, Bonfire & Folk Siddi Dhamal Option"
    ],
    itinerary: {
      day1: "Check-in at Orchard Estate -> Pool Relaxation -> Orchard Trail & Dinner",
      day2: "Morning Safari -> Breakfast under Mango Trees -> Devalia Wildlife Park",
      day3: "Farm Honey Tasting -> Somnath Coastal Drive (45 min) -> Departure"
    },
    idealFor: "Families, Wildlife Lovers & Group Escapes",
    featuredPerk: "Private Swimming Pool & Kathiyawadi Meals"
  },
  {
    id: "saputara",
    icon: "⛰️",
    destination: "Saputara",
    destinationSlug: "saputara",
    badge: "Misty Hill Station",
    title: "Saputara High Altitude & Valley Adventure",
    tagline: "Perched 1,000 meters high in the Sahyadri Dang range, enjoy misty sunrise trails, lake boating, and ATV rides.",
    duration: "2 Days / 1 Night",
    startingPrice: 6499,
    originalPrice: 8200,
    discount: "21% OFF",
    rating: 4.8,
    reviewsCount: 62,
    interest: "Adventure",
    budget: 12000,
    accentColor: "from-teal-950 via-stone-900 to-emerald-950",
    badgeColor: "bg-teal-400/20 text-teal-300 border-teal-400/30",
    buttonColor: "bg-teal-400 hover:bg-teal-500 text-stone-950",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    inclusions: [
      "1 Night Panoramic Valley-Facing Mountain Cottage / Villa",
      "Sunrise Hill ATV Off-Road Trail & Valley Glide Experience",
      "Table Point Sunset Cable Car Pass & Saputara Lake Boating",
      "Organic Dangi Herbal Tea Tasting & Hot Buffet Breakfast"
    ],
    itinerary: {
      day1: "Scenic Ghats Drive -> Check-in -> Sunset Lake Boating & Cable Car Ride",
      day2: "Sunrise ATV Trail -> Gira Waterfalls excursion -> Step Garden Walk"
    },
    idealFor: "Adventure Seekers, Couples & Hill Station Lovers",
    featuredPerk: "ATV Off-Road Ride & Lake Boating Pass"
  },
  {
    id: "ekta-nagar",
    icon: "🌊",
    destination: "Ekta Nagar",
    destinationSlug: "ekta-nagar",
    badge: "Waterfront & Valley Escapes",
    title: "Statue of Unity & Narmada Waterfront Escape",
    tagline: "Contemporary waterfront stays overlooking the Vindhyachal mountains with kayaking, Zarwani falls, and laser shows.",
    duration: "2 Days / 1 Night",
    startingPrice: 7999,
    originalPrice: 9999,
    discount: "20% OFF",
    rating: 4.9,
    reviewsCount: 89,
    interest: "Adventure",
    budget: 15000,
    accentColor: "from-blue-950 via-stone-900 to-indigo-950",
    badgeColor: "bg-blue-400/20 text-blue-300 border-blue-400/30",
    buttonColor: "bg-blue-500 hover:bg-blue-600 text-white",
    image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80",
    inclusions: [
      "1 Night in Contemporary Waterfront Cottage on Narmada River",
      "Sunset Reservoir Kayaking & Scenic Boating in Ekta Nagar",
      "Zarwani Waterfall Forest Hike & Valley of Flowers Guided Visit",
      "Statue of Unity Fast-Track Entry & Laser Projection Show Guide"
    ],
    itinerary: {
      day1: "Arrive at Narmada Valley -> Check-in -> Valley of Flowers & Night Laser Show",
      day2: "Viewing Gallery Visit -> Narmada Sunset Kayaking -> Zarwani Waterfalls"
    },
    idealFor: "Families, Photographers & Modern Weekend Getaways",
    featuredPerk: "Waterfront Cottage & Reservoir Kayaking"
  },
  {
    id: "white-rann",
    icon: "⛺",
    destination: "White Rann",
    destinationSlug: "white-rann",
    badge: "Desert Glamping & Culture",
    title: "White Rann of Kutch Cultural Glamping",
    tagline: "Witness the surreal white salt desert stretch into infinity with luxury Swiss tent glamping, camel safaris, and Kutchi music.",
    duration: "3 Days / 2 Nights",
    startingPrice: 8999,
    originalPrice: 11999,
    discount: "25% OFF",
    rating: 5.0,
    reviewsCount: 114,
    interest: "Camping",
    budget: 20000,
    accentColor: "from-purple-950 via-stone-900 to-pink-950",
    badgeColor: "bg-purple-400/20 text-purple-300 border-purple-400/30",
    buttonColor: "bg-amber-400 hover:bg-amber-500 text-stone-950",
    image: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80",
    inclusions: [
      "2 Nights in Luxury AC Swiss Tent or Traditional Mud Bhunga",
      "Sunset White Salt Desert Camel Safari & Stargazing Night",
      "Live Kutchi Folk Music & Dance Performance around Campfire",
      "Authentic Kutchi Thali (Bajra Rotla, Ringna Oro & Gulab Pak)"
    ],
    itinerary: {
      day1: "Check-in at Dhordo Tent City -> Sunset at White Rann -> Grand Cultural Night",
      day2: "Kalo Dungar Magnetic Hill -> Dholavira UNESCO Site -> Moonlight Salt Walk",
      day3: "Bhujodi Village Artisan Crafts Shopping -> Kutchi Breakfast -> Departure"
    },
    idealFor: "Stargazers, Cultural Travelers & Romantic Escapes",
    featuredPerk: "Camel Safari & Campfire Folk Passes"
  },
  {
    id: "shivrajpur",
    icon: "🏖️",
    destination: "Shivrajpur",
    destinationSlug: "shivrajpur",
    badge: "Blue Flag Beach & Marine",
    title: "Shivrajpur Beach & Coral Reef Watersports",
    tagline: "India's certified Blue Flag crystal turquoise beach near Dwarka, featuring coral reef scuba diving, jet ski, and marine boat tours.",
    duration: "2 Days / 1 Night",
    startingPrice: 7499,
    originalPrice: 9500,
    discount: "21% OFF",
    rating: 4.9,
    reviewsCount: 53,
    interest: "Adventure",
    budget: 14000,
    accentColor: "from-cyan-950 via-stone-900 to-blue-950",
    badgeColor: "bg-cyan-400/20 text-cyan-300 border-cyan-400/30",
    buttonColor: "bg-cyan-400 hover:bg-cyan-500 text-stone-950",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    inclusions: [
      "1 Night Coastal Eco-Resort with Panoramic Arabian Sea Sunset Deck",
      "Guided Snorkeling / Scuba Reef Exploration at Blue Flag Beach",
      "Jet Ski & Speedboat Safari along the Turquoise Shoreline",
      "Beachside Candlelight Dinner & Coastal Fresh Kathiyawadi Meals"
    ],
    itinerary: {
      day1: "Check-in -> Scuba Dive & Water Sports -> Shivrajpur Lighthouse Sunset -> Dinner",
      day2: "Bet Dwarka Dolphin Sighting Boat Trip -> Dwarkadhish Temple Blessings -> Return"
    },
    idealFor: "Beach Enthusiasts, Snorkelers & Watersport Fans",
    featuredPerk: "Scuba Gear & Jet Ski Session Included"
  }
];

export default function HomePage() {
  const router = useRouter();

  // Selected Curated Plan State
  const [activePlanIndex, setActivePlanIndex] = useState(0);

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

            <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] sm:leading-[1.08]">
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

      {/* ALL-IN-ONE CURATED ESCAPES & WEEKEND PACKAGES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>All-In-One Curated Escapes</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
              Signature Gujarat Weekend Packages & Plans
            </h2>
            <p className="text-sm text-stone-600 max-w-2xl">
              Complete pre-packaged weekend itineraries combining handpicked verified stays, guided experiential adventures, authentic regional dining, and instant QR booking passes.
            </p>
          </div>

          <Link
            href="/weekend-planner"
            className="inline-flex items-center space-x-2 text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors whitespace-nowrap"
          >
            <span>Custom AI Weekend Planner</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Plan Tabs Selector */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {CURATED_WEEKEND_PLANS.map((plan, idx) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setActivePlanIndex(idx)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap flex-shrink-0 ${
                activePlanIndex === idx
                  ? "bg-stone-900 text-white shadow-md scale-105"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80"
              }`}
            >
              <span>{plan.icon}</span>
              <span>{plan.destination}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                activePlanIndex === idx ? "bg-amber-400 text-stone-950 font-black" : "bg-stone-100 text-stone-500 font-medium"
              }`}>
                ₹{plan.startingPrice.toLocaleString("en-IN")}
              </span>
            </button>
          ))}
        </div>

        {/* ACTIVE HERO PLAN SHOWCASE */}
        {(() => {
          const activePlan = CURATED_WEEKEND_PLANS[activePlanIndex] || CURATED_WEEKEND_PLANS[0];
          return (
            <div className={`rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl transition-all duration-500 bg-gradient-to-br ${activePlan.accentColor}`}>
              {/* Background Photo with Vignette */}
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-overlay transition-all duration-700 pointer-events-none scale-105"
                style={{ backgroundImage: `url(${activePlan.image})` }}
              />
              <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 pointer-events-none">
                <Compass className="w-full h-full text-white" />
              </div>

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left Content Column */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1 rounded-full border text-xs font-black tracking-wide uppercase ${activePlan.badgeColor}`}>
                      {activePlan.badge}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-stone-200 text-xs font-bold flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{activePlan.duration}</span>
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-stone-200 text-xs font-bold flex items-center space-x-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{activePlan.rating}</span>
                      <span className="text-stone-400">({activePlan.reviewsCount} reviews)</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                      {activePlan.title}
                    </h3>
                    <p className="text-stone-300 text-sm mt-2 leading-relaxed">
                      {activePlan.tagline}
                    </p>
                  </div>

                  {/* Inclusions Checklist */}
                  <div className="space-y-2.5 text-stone-200 text-sm bg-black/30 backdrop-blur-md p-5 rounded-2xl border border-white/10">
                    <span className="text-xs font-bold text-amber-300 tracking-wider uppercase block mb-1">
                      Verified All-In-One Package Inclusions:
                    </span>
                    {activePlan.inclusions.map((inc, i) => (
                      <div key={i} className="flex items-start space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm">{inc}</span>
                      </div>
                    ))}
                  </div>

                  {/* Quick Itinerary Preview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[11px] font-bold text-amber-400 uppercase block">Day 1 Highlight</span>
                      <span className="text-xs text-stone-300 line-clamp-2 mt-1">{activePlan.itinerary.day1}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[11px] font-bold text-amber-400 uppercase block">Day 2 Highlight</span>
                      <span className="text-xs text-stone-300 line-clamp-2 mt-1">{activePlan.itinerary.day2}</span>
                    </div>
                  </div>

                  {/* Price & Action CTA */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/10">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-stone-400">Complete Package From</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                          {activePlan.discount}
                        </span>
                      </div>
                      <div className="flex items-baseline space-x-2 mt-0.5">
                        <span className="text-3xl font-black text-white">
                          ₹{activePlan.startingPrice.toLocaleString("en-IN")}
                        </span>
                        <span className="text-sm text-stone-400 line-through">
                          ₹{activePlan.originalPrice.toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs text-stone-300"> / package</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2.5 sm:gap-3">
                      <Link
                        href={`/explore?location=${activePlan.destinationSlug}`}
                        className="w-full sm:w-auto text-center px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs tracking-wide backdrop-blur-md transition-all active:scale-95"
                      >
                        View Stays
                      </Link>

                      <Link
                        href={`/weekend-planner?destination=${encodeURIComponent(activePlan.destination)}&interest=${encodeURIComponent(activePlan.interest)}&budget=${activePlan.budget}`}
                        className={`w-full sm:w-auto justify-center px-6 py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-xl active:scale-95 transition-all flex items-center space-x-2 ${activePlan.buttonColor}`}
                      >
                        <span>Launch This Plan</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Right Card Image Showcase */}
                <div className="lg:col-span-5 relative group">
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 aspect-[4/3] sm:aspect-[16/10] lg:aspect-square">
                    <img
                      src={activePlan.image}
                      alt={activePlan.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold border border-white/20 flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>100% Verified</span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-amber-400 block">
                        Special Feature Included
                      </span>
                      <p className="text-white font-extrabold text-sm sm:text-base mt-0.5">
                        {activePlan.featuredPerk}
                      </p>
                      <p className="text-xs text-stone-300 mt-1">
                        Ideal for: {activePlan.idealFor}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ALL 6 CURATED PACKAGES GRID */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-stone-900 tracking-tight">
              Compare All 6 Gujarat Weekend Escapes
            </h3>
            <span className="text-xs font-semibold text-stone-500 hidden sm:inline">
              Click any card to preview full itinerary
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CURATED_WEEKEND_PLANS.map((plan, index) => {
              const isSelected = activePlanIndex === index;
              return (
                <div
                  key={plan.id}
                  onClick={() => setActivePlanIndex(index)}
                  className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between group ${
                    isSelected 
                      ? "ring-2 ring-brand-600 shadow-xl border-transparent -translate-y-1" 
                      : "border-stone-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  }`}
                >
                  <div>
                    {/* Card Image */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-stone-100">
                      <img
                        src={plan.image}
                        alt={plan.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                      
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-bold border border-white/20">
                          {plan.duration}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 rounded-full bg-amber-400 text-stone-950 text-[11px] font-black shadow-md">
                          {plan.discount}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                        <div className="flex items-center space-x-1.5 text-xs font-bold">
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          <span>{plan.destination}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs font-bold bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{plan.rating}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider block">
                          {plan.badge}
                        </span>
                        <h4 className="font-extrabold text-base text-stone-900 group-hover:text-brand-600 transition-colors mt-0.5 line-clamp-1">
                          {plan.title}
                        </h4>
                      </div>

                      <div className="space-y-1.5 text-xs text-stone-600">
                        {plan.inclusions.slice(0, 3).map((inc, i) => (
                          <div key={i} className="flex items-start space-x-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{inc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom / Price & CTA */}
                  <div className="p-5 pt-0">
                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-stone-400 block">From</span>
                        <div className="flex items-baseline space-x-1.5">
                          <span className="text-lg font-black text-stone-900">
                            ₹{plan.startingPrice.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-stone-400 line-through">
                            ₹{plan.originalPrice.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/weekend-planner?destination=${encodeURIComponent(plan.destination)}&interest=${encodeURIComponent(plan.interest)}&budget=${plan.budget}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-brand-600 text-white text-xs font-bold tracking-wide transition-all active:scale-95 flex items-center space-x-1"
                      >
                        <span>Customize</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
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
