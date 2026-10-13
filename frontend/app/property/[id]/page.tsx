"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Star, 
  MapPin, 
  ShieldCheck, 
  Users, 
  Bed, 
  Bath, 
  Calendar as CalendarIcon, 
  Clock, 
  Heart, 
  Share2, 
  Waves, 
  Wifi, 
  Car, 
  PawPrint, 
  Utensils, 
  Flame, 
  CheckCircle, 
  Tag, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  MessageCircle,
  Phone,
  Lock
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import ChatModal from "@/components/ChatModal";

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const idOrSlug = params.id as string;

  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [chatOpen, setChatOpen] = useState(false);
  const [contactStatus, setContactStatus] = useState<any>({ has_confirmed_booking: false });
  const [unlockedContacts, setUnlockedContacts] = useState<any>(null);

  // Booking Widget State
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 3);

  const [checkIn, setCheckIn] = useState(tomorrow.toISOString().split("T")[0]);
  const [checkOut, setCheckOut] = useState(dayAfter.toISOString().split("T")[0]);
  const [guests, setGuests] = useState(2);
  const [specialRequests, setSpecialRequests] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");

  // Location Activities to add-on
  const [availableActivities, setAvailableActivities] = useState<any[]>([]);
  const [selectedActivitySlots, setSelectedActivitySlots] = useState<any[]>([]);

  // Price breakdown computed from server
  const [pricing, setPricing] = useState<any>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Load Property Details & Location Activities
  useEffect(() => {
    async function loadProperty() {
      try {
        setLoading(true);
        const res = await api.properties.get(idOrSlug);
        if (res.success && res.data) {
          setProperty(res.data);
          if (res.data.images && res.data.images.length > 0) {
            const cover = res.data.images.find((img: any) => img.is_cover || img.is_primary)?.image_url || res.data.images[0].image_url;
            setSelectedImage(cover);
          }

          // Load activities for this location
          if (res.data.location_id) {
            const actRes = await api.activities.getAll({ location: res.data.location?.slug });
            if (actRes.success) {
              setAvailableActivities(actRes.data);
            }
          }

          // Check if current user has confirmed & paid booking for this stay
          if (isAuthenticated && res.data.id) {
            api.contacts.getPropertyStatus(res.data.id).then((st) => {
              if (st.success && st.data) {
                setContactStatus(st.data);
                if (st.data.has_confirmed_booking && st.data.booking_id) {
                  api.contacts.getBookingAccess(st.data.booking_id).then((access) => {
                    if (access.success) setUnlockedContacts(access.data);
                  });
                }
              }
            });
          }
        } else {
          setError("Property not found");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load property details");
      } finally {
        setLoading(false);
      }
    }
    loadProperty();
  }, [idOrSlug]);

  // Recalculate server price whenever dates, guests, coupon, or activities change
  useEffect(() => {
    if (!property || !checkIn || !checkOut) return;

    async function fetchPrice() {
      try {
        setCalculatingPrice(true);
        setBookingError(null);

        const activitiesPayload = selectedActivitySlots.map((item) => ({
          activity_id: item.activity_id,
          activity_slot_id: item.slot_id,
          participants: item.participants || guests,
        }));

        const res = await api.bookings.calculatePrice({
          property_id: property.id,
          check_in: checkIn,
          check_out: checkOut,
          guest_count: guests,
          coupon_code: couponCode.trim() || undefined,
          activities: activitiesPayload,
        });

        if (res.success && res.data) {
          setPricing(res.data);
        }
      } catch (err: any) {
        setBookingError(err.message);
      } finally {
        setCalculatingPrice(false);
      }
    }

    const timer = setTimeout(() => {
      fetchPrice();
    }, 300);

    return () => clearTimeout(timer);
  }, [property, checkIn, checkOut, guests, couponCode, selectedActivitySlots]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !pricing) return;
    try {
      const res = await api.coupons.validate(couponCode.trim(), pricing.subtotal + pricing.cleaning_fee);
      if (res.success && res.data.valid) {
        setCouponDiscount(res.data.discount_amount);
        setCouponMessage(`Coupon Applied! Saved ₹${res.data.discount_amount}`);
      } else {
        setCouponDiscount(0);
        setCouponMessage(res.message || "Invalid or ineligible coupon");
      }
    } catch (err: any) {
      setCouponMessage(err.message);
    }
  };

  const handleReserve = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/property/${property.slug || property.id}`);
      return;
    }

    try {
      setReserving(true);
      setBookingError(null);

      const activitiesPayload = selectedActivitySlots.map((item) => ({
        activity_id: item.activity_id,
        activity_slot_id: item.slot_id,
        participants: item.participants || guests,
      }));

      // Server-side booking creation with atomic double-booking check
      const res = await api.bookings.create({
        property_id: property.id,
        check_in: checkIn,
        check_out: checkOut,
        guest_count: guests,
        special_requests: specialRequests,
        coupon_code: couponCode.trim() || undefined,
        activities: activitiesPayload,
      });

      if (res.success && res.data) {
        // Direct to secure payment & QR generation checkout flow
        router.push(`/checkout/${res.data.id}`);
      }
    } catch (err: any) {
      setBookingError(err.message || "Could not reserve property. Dates may have just been booked.");
    } finally {
      setReserving(false);
    }
  };

  const toggleActivitySelection = async (activity: any) => {
    // Check if already selected
    const isSelected = selectedActivitySlots.some((s) => s.activity_id === activity.id);
    if (isSelected) {
      setSelectedActivitySlots(selectedActivitySlots.filter((s) => s.activity_id !== activity.id));
    } else {
      // Fetch activity slots
      try {
        const detailRes = await api.activities.get(activity.id);
        if (detailRes.success && detailRes.data.slots && detailRes.data.slots.length > 0) {
          const firstSlot = detailRes.data.slots[0];
          setSelectedActivitySlots([
            ...selectedActivitySlots,
            {
              activity_id: activity.id,
              activity_name: activity.name,
              slot_id: firstSlot.id,
              slot_time: firstSlot.start_time,
              price: firstSlot.price,
              participants: guests,
            },
          ]);
        }
      } catch (err) {
        console.error("Failed to load activity slots", err);
      }
    }
  };

  const handleMessageHostClick = () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/property/${idOrSlug}`);
      return;
    }
    setChatOpen(true);
  };

  const handleWhatsAppClick = () => {
    if (contactStatus.has_confirmed_booking && unlockedContacts?.host?.whatsapp_url) {
      if (contactStatus.booking_id) {
        api.contacts.logAccess(contactStatus.booking_id, "whatsapp");
      }
      window.open(unlockedContacts.host.whatsapp_url, "_blank");
    } else {
      alert("Direct WhatsApp contact unlocks automatically after your booking is confirmed & paid. Please click 'Message Host' to chat on the platform.");
    }
  };

  const handleCallHostClick = () => {
    if (contactStatus.has_confirmed_booking && unlockedContacts?.host?.call_url) {
      if (contactStatus.booking_id) {
        api.contacts.logAccess(contactStatus.booking_id, "call");
      }
      window.location.href = unlockedContacts.host.call_url;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-stone-500 font-medium">Checking live Gujarat database availability...</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-2xl font-black text-stone-900">Property Not Found</h2>
        <p className="text-stone-500">{error || "The requested stay is unavailable."}</p>
        <Link href="/explore" className="inline-block px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold">
          Explore Other Gujarat Stays
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-brand-600 uppercase tracking-widest mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>
                {property.location?.name}, {property.location?.district} District, Gujarat
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
              {property.name}
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center space-x-1.5 border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified Host Listing</span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm text-stone-600 pt-1">
          <div className="flex items-center space-x-1 font-bold text-stone-900">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>{property.average_rating || 4.9}</span>
            <span className="text-stone-400 font-normal">({property.reviews_count || 12} reviews)</span>
          </div>
          <span>•</span>
          <span>{property.address}</span>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 rounded-3xl overflow-hidden aspect-[16/9] max-h-[500px] bg-stone-100">
        <div className="lg:col-span-3 h-full overflow-hidden">
          <img
            src={selectedImage || property.images[0]?.image_url}
            alt={property.name}
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80";
            }}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="hidden lg:flex flex-col gap-3 h-full overflow-y-auto">
          {property.images.map((img: any, idx: number) => (
            <button
              key={img.id || idx}
              onClick={() => setSelectedImage(img.image_url)}
              className={`relative flex-1 rounded-xl overflow-hidden border-2 transition-all ${
                selectedImage === img.image_url ? "border-brand-500 scale-[0.98]" : "border-transparent opacity-80 hover:opacity-100"
              }`}
            >
              <img
                src={img.image_url}
                alt=""
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=400&q=80";
                }}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {property.images && property.images.length > 1 && (
        <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 -mt-4 scrollbar-none">
          {property.images.map((img: any, idx: number) => (
            <button
              key={img.id || idx}
              onClick={() => setSelectedImage(img.image_url)}
              className={`relative flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                selectedImage === img.image_url ? "border-brand-500 scale-95 ring-2 ring-brand-500/20" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img
                src={img.image_url}
                alt=""
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=400&q=80";
                }}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main Grid: Details on Left, Booking Widget on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        {/* Left Column: Property Description, Amenities, Host, Rules */}
        <div className="lg:col-span-2 space-y-10">
          {/* Capacity stats */}
          <div className="p-6 bg-white rounded-3xl border border-stone-200/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-stone-400 font-bold uppercase">Max Capacity</span>
                <p className="text-sm font-bold text-stone-900">{property.max_guests} Guests</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Bed className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-stone-400 font-bold uppercase">Bedrooms</span>
                <p className="text-sm font-bold text-stone-900">{property.bedrooms} Private Rooms</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Bath className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-stone-400 font-bold uppercase">Bathrooms</span>
                <p className="text-sm font-bold text-stone-900">{property.bathrooms} Baths</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-stone-400 font-bold uppercase">Check-in</span>
                <p className="text-sm font-bold text-stone-900">{property.check_in_time} / {property.check_out_time}</p>
              </div>
            </div>
          </div>

          {/* About this stay */}
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">About this Escape</h2>
            <p className="text-stone-600 text-base leading-relaxed whitespace-pre-line">
              {property.description}
            </p>
          </div>

          {/* Amenities */}
          <div className="space-y-4 pt-6 border-t border-stone-200">
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">What this place offers</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {property.amenities_list?.map((am: any) => (
                <div
                  key={am.id}
                  className="flex items-center space-x-2.5 p-3 rounded-2xl bg-stone-50 border border-stone-200/80 text-xs font-bold text-stone-800"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>{am.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Add-on Gujarat Activities */}
          {availableActivities.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-stone-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-stone-900 tracking-tight">
                    Add-on Weekend Experiences
                  </h2>
                  <p className="text-xs text-stone-500">
                    Combine your stay with outdoor nature walks, treks, or river adventures.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {availableActivities.map((act) => {
                  const isSelected = selectedActivitySlots.some((s) => s.activity_id === act.id);
                  return (
                    <div
                      key={act.id}
                      onClick={() => toggleActivitySelection(act)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "border-brand-500 bg-brand-50/60 shadow-md"
                          : "border-stone-200 bg-white hover:border-stone-300"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={act.image_url || "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=400&q=80"}
                          alt={act.name}
                          className="w-14 h-14 rounded-xl object-cover"
                        />
                        <div>
                          <span className="text-[10px] font-bold uppercase text-brand-600">{act.category}</span>
                          <h4 className="text-sm font-bold text-stone-900 line-clamp-1">{act.name}</h4>
                          <span className="text-xs text-stone-500">₹{act.price} / person</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                          isSelected ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {isSelected ? "Added" : "+ Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Host Information Card */}
          <div className="p-6 bg-amber-50/50 rounded-3xl border border-amber-200/80 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                {property.host?.business_name ? property.host.business_name[0] : "H"}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-base text-stone-900">
                    Hosted by {property.host?.business_name || "Gujarat Escapes Host"}
                  </h3>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xs text-stone-600 capitalize">
                  {property.host?.host_type?.replace("_", " ") || "Villa Owner"} • Verified Host
                </p>
              </div>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              {property.source_reference || "Direct Verified Gujarat Host Partner"}
            </p>

            {/* Controlled Host Communication Section */}
            {contactStatus.has_confirmed_booking ? (
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-emerald-800 font-bold">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>✓ Booking Confirmed (Pass #{contactStatus.booking_code})</span>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                    Contacts Unlocked
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={handleMessageHostClick}
                    className="py-3 px-3 rounded-2xl bg-white border border-stone-200 hover:border-brand-500 hover:bg-brand-50/50 text-stone-800 font-extrabold text-xs shadow-sm flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <MessageCircle className="w-4 h-4 text-brand-600" />
                    <span>Message Host</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleWhatsAppClick}
                    className="py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <Phone className="w-4 h-4" />
                    <span>WhatsApp Host</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCallHostClick}
                    className="py-3 px-3 rounded-2xl bg-stone-900 hover:bg-black text-white font-extrabold text-xs shadow-md flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <span>Call Host</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleMessageHostClick}
                  className="w-full py-3.5 px-4 rounded-2xl bg-stone-900 hover:bg-black text-white font-extrabold text-xs shadow-md flex items-center justify-center space-x-2 transition-all active:scale-95"
                >
                  <MessageCircle className="w-4 h-4 text-amber-400" />
                  <span>Message Host</span>
                </button>

                <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-[11px] text-amber-900 flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p>
                    <strong className="font-bold">🔒 Contact available after booking:</strong> Direct WhatsApp & phone are unlocked automatically once your booking is confirmed & paid.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* House Rules & Cancellation Policy */}
          <div className="p-6 bg-white rounded-3xl border border-stone-200/80 space-y-4">
            <h3 className="font-bold text-base text-stone-900">House Rules & Policies</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              {property.house_rules || "Respect local peace and environment. Valid Government photo ID required at check-in."}
            </p>
            <div className="pt-2 text-xs font-semibold text-brand-700 flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>Cancellation Policy: {property.cancellation_policy?.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Booking Widget */}
        <div className="sticky top-28 bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-xl space-y-6">
          <div className="flex items-baseline justify-between pb-4 border-b border-stone-100">
            <div>
              <span className="text-2xl font-black text-stone-900">
                ₹{property.price_per_night.toLocaleString("en-IN")}
              </span>
              <span className="text-xs text-stone-500 font-medium"> / night</span>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              Instant Confirm
            </span>
          </div>

          {/* Dates Selection */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
            <div>
              <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Check-in</label>
              <input
                type="date"
                value={checkIn}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-stone-900 focus:outline-none cursor-pointer"
              />
            </div>
            <div className="border-l border-stone-200 pl-2">
              <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Check-out</label>
              <input
                type="date"
                value={checkOut}
                min={checkIn}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-stone-900 focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Guests Selection */}
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
            <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Guests</label>
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full bg-transparent text-xs font-bold text-stone-900 focus:outline-none cursor-pointer"
            >
              {Array.from({ length: property.max_guests }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} Guest{n > 1 ? "s" : ""} {n === property.max_guests ? "(Max Capacity)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Coupon Code Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-stone-600 uppercase flex items-center space-x-1">
              <Tag className="w-3.5 h-3.5 text-brand-600" />
              <span>Coupon Code</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="e.g. GUJARAT10"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 uppercase focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="px-3.5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all"
              >
                Apply
              </button>
            </div>
            {couponMessage && (
              <p className={`text-[11px] font-semibold ${couponDiscount > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                {couponMessage}
              </p>
            )}
          </div>

          {/* Price Calculation Breakdown */}
          {calculatingPrice ? (
            <div className="py-4 text-center text-xs text-stone-500">Recalculating live price...</div>
          ) : pricing ? (
            <div className="space-y-2.5 pt-3 border-t border-stone-100 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>
                  ₹{property.price_per_night.toLocaleString("en-IN")} × {pricing.nights} night
                  {pricing.nights > 1 ? "s" : ""}
                </span>
                <span className="font-semibold text-stone-900">₹{pricing.stay_subtotal.toLocaleString("en-IN")}</span>
              </div>

              {pricing.cleaning_fee > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>Cleaning & Hygiene fee</span>
                  <span className="font-semibold text-stone-900">₹{pricing.cleaning_fee.toLocaleString("en-IN")}</span>
                </div>
              )}

              {pricing.activities_subtotal > 0 && (
                <div className="flex justify-between text-brand-700">
                  <span>Selected Activities ({selectedActivitySlots.length})</span>
                  <span className="font-semibold">₹{pricing.activities_subtotal.toLocaleString("en-IN")}</span>
                </div>
              )}

              {pricing.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Coupon Discount</span>
                  <span>- ₹{pricing.discount.toLocaleString("en-IN")}</span>
                </div>
              )}

              <div className="flex justify-between text-stone-600">
                <span>Taxes (12% GST)</span>
                <span className="font-semibold text-stone-900">₹{pricing.tax.toLocaleString("en-IN")}</span>
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-between text-sm font-black text-stone-900">
                <span>Total Amount</span>
                <span className="text-xl text-brand-600">₹{pricing.total.toLocaleString("en-IN")}</span>
              </div>
            </div>
          ) : null}

          {/* Error Message */}
          {bookingError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{bookingError}</span>
            </div>
          )}

          {/* Reserve Button */}
          <button
            onClick={handleReserve}
            disabled={reserving || calculatingPrice}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-600 to-amber-500 hover:from-brand-700 hover:to-amber-600 text-white font-extrabold text-base shadow-xl shadow-brand-500/25 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {reserving ? (
              <span>Locking Reservation...</span>
            ) : (
              <>
                <span>Reserve Gujarat Stay</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Quick Contact & Host Chat in Booking Box */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs font-bold">
            <span className="text-stone-500 text-[11px]">Have questions?</span>
            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={handleMessageHostClick}
                className="text-stone-700 hover:text-brand-600 flex items-center space-x-1"
              >
                <MessageCircle className="w-3.5 h-3.5 text-brand-600" />
                <span>Message Host</span>
              </button>
              {contactStatus.has_confirmed_booking && (
                <>
                  <span className="text-stone-300">•</span>
                  <button
                    type="button"
                    onClick={handleWhatsAppClick}
                    className="text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <p className="text-[11px] text-stone-400 text-center">
            Double-booking protected on server. Instant QR pass issued upon payment.
          </p>
        </div>
      </div>

      {/* In-App Host Chat Modal with Anti-Bypass Protection */}
      <ChatModal
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        hostUserId={property?.host?.user_id || property?.host_id}
        hostName={property?.host?.business_name || "Stay Host"}
        hostType={property?.host?.host_type}
        propertyId={property?.id}
        propertyName={property?.name}
        bookingId={contactStatus.booking_id}
      />
    </div>
  );
}
