"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Eye,
  Edit3,
  Trash2,
  PauseCircle,
  PlayCircle,
  Ban,
  ShieldAlert,
  ShieldCheck,
  Check,
  MapPin,
  Bed,
  Bath,
  Users,
  Home,
  DollarSign,
  Calendar,
  Sparkles,
  Phone,
  Mail,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Info,
  Plus,
  Image as ImageIcon
} from "lucide-react";
import { TrashBucketDeleteModal } from "@/components/animations/TrashBucketAnimation";

// ==========================================
// 1. PROPERTY VIEW MODAL
// ==========================================
interface PropertyViewModalProps {
  isOpen: boolean;
  property: any;
  onClose: () => void;
  onEdit: (property: any) => void;
  onPause: (property: any) => void;
  onResume: (property: any) => void;
  onBlock: (property: any) => void;
  onDelete: (property: any) => void;
}

export const PropertyViewModal: React.FC<PropertyViewModalProps> = ({
  isOpen,
  property,
  onClose,
  onEdit,
  onPause,
  onResume,
  onBlock,
  onDelete,
}) => {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  useEffect(() => {
    setActivePhotoIdx(0);
  }, [property]);

  if (!isOpen || !property) return null;

  const images = property.images && property.images.length > 0
    ? property.images
    : [{ image_url: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80" }];

  const currentStatus = (property.verification_status || "pending").toLowerCase();
  const isApproved = currentStatus === "approved";
  const isPaused = currentStatus === "paused";
  const isBlocked = currentStatus === "blocked";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                isApproved
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : isPaused
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : isBlocked
                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                  : "bg-stone-100 text-stone-700 border border-stone-300"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${
                isApproved ? "bg-emerald-500 animate-pulse" : isPaused ? "bg-amber-500" : isBlocked ? "bg-rose-500" : "bg-stone-400"
              }`} />
              {currentStatus}
            </span>
            <span className="text-xs font-semibold text-stone-500">ID: #{property.id}</span>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={`/property/${property.slug || property.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-stone-100 text-stone-600 transition-colors"
              title="Open public page"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Title & Location */}
          <div>
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">{property.name}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 mt-1">
              <span className="flex items-center gap-1 font-semibold text-stone-700">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                {property.location?.name || property.city || "Gujarat"}, Gujarat
              </span>
              <span>•</span>
              <span className="capitalize font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                {property.property_type}
              </span>
              <span>•</span>
              <span className="font-semibold">{property.address}</span>
            </div>
          </div>

          {/* Photos Carousel */}
          <div className="space-y-3">
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-stone-100 border border-stone-200">
              <img
                src={images[activePhotoIdx]?.image_url}
                alt={property.name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80";
                }}
                className="w-full h-full object-cover"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActivePhotoIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-black/70 text-white text-xs font-bold backdrop-blur-sm">
                    {activePhotoIdx + 1} / {images.length}
                  </div>
                </>
              )}
            </div>

            {/* Photo Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhotoIdx(idx)}
                    className={`relative w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                      activePhotoIdx === idx ? "border-emerald-600 scale-105 shadow-md" : "border-stone-200 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[11px] font-bold text-stone-500 uppercase">Nightly Rate</span>
              <p className="text-xl font-black text-stone-900 mt-0.5">₹{property.price_per_night}</p>
              <p className="text-[10px] text-stone-400 mt-0.5">+₹{property.cleaning_fee || 0} cleaning</p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[11px] font-bold text-stone-500 uppercase">Capacity</span>
              <p className="text-xl font-black text-stone-900 mt-0.5">{property.max_guests || 2} Guests</p>
              <p className="text-[10px] text-stone-400 mt-0.5">{property.total_units || 1} unit(s)</p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[11px] font-bold text-stone-500 uppercase">Layout</span>
              <p className="text-xl font-black text-stone-900 mt-0.5">{property.bedrooms || 1} Bed, {property.bathrooms || 1} Bath</p>
              <p className="text-[10px] text-stone-400 mt-0.5">Check-in: {property.check_in_time || "14:00"}</p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[11px] font-bold text-stone-500 uppercase">Booking Status</span>
              <p className="text-base font-extrabold text-stone-900 mt-0.5 flex items-center gap-1.5">
                {property.booking_enabled ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Enabled
                  </span>
                ) : (
                  <span className="text-rose-700 flex items-center gap-1">
                    <Ban className="w-4 h-4" /> Disabled
                  </span>
                )}
              </p>
              <p className="text-[10px] text-stone-400 mt-0.5">Policy: {property.cancellation_policy || "Flexible"}</p>
            </div>
          </div>

          {/* Host Info Box */}
          {property.host && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-stone-50 to-teal-50/50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Host Details</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-200 text-emerald-900">
                    {property.host.verification_status || "Verified"}
                  </span>
                </div>
                <h4 className="text-base font-black text-stone-900">{property.host.business_name || "Host Profile"}</h4>
                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600">
                  {property.host.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-stone-400" /> {property.host.phone}
                    </span>
                  )}
                  {property.host.user?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-stone-400" /> {property.host.user.email}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs font-semibold text-stone-500 self-start sm:self-center">
                Host ID: #{property.host.id}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Property Description</h4>
            <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-line bg-stone-50 p-4 rounded-2xl border border-stone-200">
              {property.description || "No description provided."}
            </p>
          </div>

          {/* House Rules */}
          {property.house_rules && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">House Rules</h4>
              <p className="text-xs text-stone-600 bg-stone-50 p-3.5 rounded-2xl border border-stone-200 leading-relaxed">
                {property.house_rules}
              </p>
            </div>
          )}

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Amenities Included</h4>
              <div className="flex flex-wrap gap-2">
                {property.amenities.map((am: any, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {am.name || am.amenity?.name || "Amenity"}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 z-20 bg-stone-50 px-6 py-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onEdit(property);
              }}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Property</span>
            </button>

            {isApproved ? (
              <button
                onClick={() => {
                  onClose();
                  onPause(property);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Pause Bookings</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  onResume(property);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Resume / Unpause</span>
              </button>
            )}

            {!isBlocked ? (
              <button
                onClick={() => {
                  onClose();
                  onBlock(property);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Block Property</span>
              </button>
            ) : null}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onDelete(property);
              }}
              className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-xs font-extrabold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. PROPERTY EDIT MODAL
// ==========================================
interface PropertyEditModalProps {
  isOpen: boolean;
  property: any;
  locations: any[];
  onClose: () => void;
  onSave: (updatedData: any) => Promise<void>;
}

export const PropertyEditModal: React.FC<PropertyEditModalProps> = ({
  isOpen,
  property,
  locations,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<any>({
    name: "",
    property_type: "villa",
    location_id: "",
    price_per_night: 0,
    cleaning_fee: 0,
    max_guests: 4,
    bedrooms: 2,
    bathrooms: 2,
    total_units: 1,
    address: "",
    description: "",
    house_rules: "",
    booking_enabled: true,
    verification_status: "approved",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name || "",
        property_type: property.property_type || "villa",
        location_id: property.location_id || (locations[0]?.id || ""),
        price_per_night: property.price_per_night || 0,
        cleaning_fee: property.cleaning_fee || 0,
        max_guests: property.max_guests || 4,
        bedrooms: property.bedrooms || 2,
        bathrooms: property.bathrooms || 2,
        total_units: property.total_units || 1,
        address: property.address || "",
        description: property.description || "",
        house_rules: property.house_rules || "",
        booking_enabled: property.booking_enabled ?? true,
        verification_status: property.verification_status || "approved",
      });
      setError(null);
    }
  }, [property, locations]);

  if (!isOpen || !property) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      await onSave({
        ...formData,
        location_id: Number(formData.location_id),
        price_per_night: Number(formData.price_per_night),
        cleaning_fee: Number(formData.cleaning_fee),
        max_guests: Number(formData.max_guests),
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        total_units: Number(formData.total_units),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update property details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-stone-900">Edit Gujarat Stay</h3>
              <p className="text-xs text-stone-400">Modify listing details, pricing, and administrative status</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs font-bold text-stone-700">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-stone-600">Property / Stay Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-stone-600">Property Type</label>
              <select
                value={formData.property_type}
                onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="villa">Villa</option>
                <option value="resort">Resort</option>
                <option value="cottage">Cottage</option>
                <option value="hotel">Hotel</option>
                <option value="homestay">Homestay</option>
                <option value="camping">Camping</option>
                <option value="guest_house">Guest House</option>
                <option value="boutique">Boutique</option>
              </select>
            </div>
          </div>

          {/* Location & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-stone-600">Destination (Gujarat Location)</label>
              <select
                value={formData.location_id}
                onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                required
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.district ? `(${loc.district})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-stone-600">Full Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* Pricing & Units */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-stone-600">Price / Night (₹)</label>
              <input
                type="number"
                min={100}
                value={formData.price_per_night}
                onChange={(e) => setFormData({ ...formData, price_per_night: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-stone-600">Cleaning Fee (₹)</label>
              <input
                type="number"
                min={0}
                value={formData.cleaning_fee}
                onChange={(e) => setFormData({ ...formData, cleaning_fee: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-stone-600">Max Guests</label>
              <input
                type="number"
                min={1}
                value={formData.max_guests}
                onChange={(e) => setFormData({ ...formData, max_guests: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-stone-600">Total Units / Rooms</label>
              <input
                type="number"
                min={1}
                value={formData.total_units}
                onChange={(e) => setFormData({ ...formData, total_units: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Bedrooms & Bathrooms */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-stone-600">Bedrooms</label>
              <input
                type="number"
                min={0}
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-stone-600">Bathrooms</label>
              <input
                type="number"
                min={1}
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-stone-600">Stay Description</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* House Rules */}
          <div className="space-y-1">
            <label className="text-stone-600">House Rules</label>
            <textarea
              rows={2}
              value={formData.house_rules}
              onChange={(e) => setFormData({ ...formData, house_rules: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Administrative Controls */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
            <span className="text-xs font-black text-amber-900 uppercase tracking-wider block">
              Administrative Control & Status
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-stone-700">Verification Status</label>
                <select
                  value={formData.verification_status}
                  onChange={(e) => setFormData({ ...formData, verification_status: e.target.value })}
                  className="w-full p-2 rounded-xl border border-amber-200 font-bold text-stone-900 bg-white"
                >
                  <option value="approved">Approved / Live</option>
                  <option value="paused">Paused (Temporarily Suspended)</option>
                  <option value="blocked">Blocked (Violation / Problems)</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="flex items-center space-x-3 pt-4 sm:pt-6">
                <input
                  type="checkbox"
                  id="booking_enabled"
                  checked={formData.booking_enabled}
                  onChange={(e) => setFormData({ ...formData, booking_enabled: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="booking_enabled" className="text-stone-900 font-bold cursor-pointer">
                  Guest Booking Active
                </label>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{loading ? "Saving Changes..." : "Save Stay Details"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 3. PAUSE / BLOCK CONFIRMATION MODAL
// ==========================================
interface PauseBlockModalProps {
  isOpen: boolean;
  property: any;
  actionType: "pause" | "block";
  onClose: () => void;
  onConfirm: (notes: string) => Promise<void>;
}

export const PauseBlockModal: React.FC<PauseBlockModalProps> = ({
  isOpen,
  property,
  actionType,
  onClose,
  onConfirm,
}) => {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNotes("");
  }, [isOpen, property]);

  if (!isOpen || !property) return null;

  const isBlock = actionType === "block";

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm(notes);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 space-y-4">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-2xl ${isBlock ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
            {isBlock ? <Ban className="w-6 h-6" /> : <PauseCircle className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-black text-lg text-stone-900">
              {isBlock ? "Block Property" : "Pause Property Bookings"}
            </h3>
            <p className="text-xs text-stone-500">
              {isBlock ? "Restrict host listing from all public discovery" : "Temporarily suspend booking dates"}
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
          <p className="font-extrabold text-stone-900">{property.name}</p>
          <p className="text-stone-500 mt-0.5">{property.location?.name}, Gujarat</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-stone-600 block">
            Reason / Administrative Action Note:
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              isBlock
                ? "e.g., Host policy violation, customer safety complaints, fake listing under review..."
                : "e.g., Temporary maintenance issue, unverified contact, host dispute resolution..."
            }
            className="w-full p-3 rounded-xl border border-stone-200 text-xs font-medium text-stone-800 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-stone-800"
          />
        </div>

        <div className="flex items-center justify-end space-x-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`px-5 py-2 rounded-xl text-xs font-extrabold text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all ${
              isBlock ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            {loading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <span>{isBlock ? "Confirm & Block" : "Confirm & Pause"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. PROPERTY DELETE CONFIRMATION MODAL
// ==========================================
interface PropertyDeleteModalProps {
  isOpen: boolean;
  property: any;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export const PropertyDeleteModal: React.FC<PropertyDeleteModalProps> = ({
  isOpen,
  property,
  onClose,
  onConfirm,
}) => {
  return (
    <TrashBucketDeleteModal
      isOpen={isOpen}
      property={property}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
};

// ==========================================
// 5. ADMIN ADD PROPERTY MODAL
// ==========================================
interface AdminAddPropertyModalProps {
  isOpen: boolean;
  locations: any[];
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export const AdminAddPropertyModal: React.FC<AdminAddPropertyModalProps> = ({
  isOpen,
  locations,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState<string>("");
  const [propertyType, setPropertyType] = useState("villa");
  const [pricePerNight, setPricePerNight] = useState(6500);
  const [maxGuests, setMaxGuests] = useState(6);
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(3);
  const [totalUnits, setTotalUnits] = useState(1);
  const [imageUrl, setImageUrl] = useState("https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (locations && locations.length > 0 && !locationId) {
      setLocationId(locations[0].id.toString());
    }
  }, [locations, locationId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a property name");
      return;
    }
    if (!locationId) {
      setError("Please select a Gujarat destination");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        description: description || `Experience pure comfort and serenity in ${propertyType} setting in Gujarat.`,
        property_type: propertyType,
        location_id: Number(locationId),
        price_per_night: Number(pricePerNight),
        max_guests: Number(maxGuests),
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        total_units: Number(totalUnits) || 1,
        address: "Gujarat, India",
        house_rules: "Valid photo ID required at check-in. Standard checkout guidelines apply.",
        images: [
          {
            image_url: imageUrl || "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
            caption: "Primary View",
            is_cover: true,
            is_primary: true,
            sort_order: 0
          }
        ]
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add property");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-stone-900 leading-tight">Add New Gujarat Stay</h3>
              <p className="text-[11px] font-semibold text-emerald-700">Quick property publisher</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-stone-700">
          <div>
            <label className="block text-stone-600 mb-1">Stay Name / Property Title *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sasan Gir Serene Eco Luxury Villa"
              className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-600 mb-1">Destination Location *</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50 focus:bg-white outline-none"
                required
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-stone-600 mb-1">Property Type</label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50 focus:bg-white outline-none capitalize"
              >
                {["villa", "resort", "heritage", "cottage", "homestay", "tent", "hotel"].map((t) => (
                  <option key={t} value={t}>
                    {t.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-stone-600 mb-1">Price / Night (₹)</label>
              <input
                type="number"
                min={500}
                step={100}
                value={pricePerNight}
                onChange={(e) => setPricePerNight(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50"
              />
            </div>

            <div>
              <label className="block text-stone-600 mb-1">Max Guests</label>
              <input
                type="number"
                min={1}
                value={maxGuests}
                onChange={(e) => setMaxGuests(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50"
              />
            </div>

            <div>
              <label className="block text-stone-600 mb-1">Bedrooms</label>
              <input
                type="number"
                min={1}
                value={bedrooms}
                onChange={(e) => setBedrooms(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-600 mb-1">Bathrooms</label>
              <input
                type="number"
                min={1}
                value={bathrooms}
                onChange={(e) => setBathrooms(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50"
              />
            </div>
            <div>
              <label className="block text-stone-600 mb-1">Total Units / Villas</label>
              <input
                type="number"
                min={1}
                value={totalUnits}
                onChange={(e) => setTotalUnits(Math.max(1, Number(e.target.value)))}
                className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-600 mb-1">Photo / Image URL</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50 focus:bg-white outline-none text-xs"
            />
          </div>

          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Adding Stay...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Publish & Add Stay</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
