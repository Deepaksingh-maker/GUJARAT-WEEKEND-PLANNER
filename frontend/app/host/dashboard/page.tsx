"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Home, 
  Calendar, 
  DollarSign, 
  Users, 
  Star, 
  PlusCircle, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  MapPin, 
  ChevronRight, 
  ShieldCheck, 
  Building, 
  Sparkles,
  Upload,
  Image as ImageIcon,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  Edit3,
  X,
  TrendingUp,
  BarChart3,
  PieChart,
  Wallet,
  Activity,
  ArrowUpRight,
  Phone,
  Lock,
  MessageSquare,
  MessageCircle,
  QrCode
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import ChatModal from "@/components/ChatModal";
import { 
  StatMetricCard, 
  RevenueAreaChart, 
  DonutChart, 
  RankingBarChart, 
  WeekendSurgeCard, 
  formatRupee 
} from "@/components/analytics/AnalyticsCharts";
import { AddCelebrationModal } from "@/components/animations/AddCelebrationAnimation";
import { AnimatedCounter } from "@/components/animations/AnimatedCounter";

interface PropertyImageItem {
  id?: number;
  image_url: string;
  caption?: string;
  is_cover: boolean;
  sort_order: number;
}

export default function HostDashboardPage() {
  const { user, isHost, isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "calendar" | "properties" | "bookings" | "messages" | "add_property">("overview");

  // Messaging & Controlled Contact State
  const [conversations, setConversations] = useState<any[]>([]);
  const [bookingFilter, setBookingFilter] = useState<"all" | "confirmed" | "pending" | "cancelled">("all");
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatTarget, setChatTarget] = useState<{
    id: number;
    name: string;
    propertyId?: number;
    propertyName?: string;
    bookingId?: number;
  } | null>(null);

  const [stats, setStats] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [amenities, setAmenities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Host Availability Calendar & Inventory Block State
  const [calendarData, setCalendarData] = useState<any>(null);
  const [selectedCalendarPropId, setSelectedCalendarPropId] = useState<number | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockPropId, setBlockPropId] = useState<number>(0);
  const [blockStartDate, setBlockStartDate] = useState("");
  const [blockEndDate, setBlockEndDate] = useState("");
  const [blockUnits, setBlockUnits] = useState(1);
  const [blockReason, setBlockReason] = useState("Routine Maintenance");
  const [blockSubmitting, setBlockSubmitting] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [blockSuccess, setBlockSuccess] = useState<string | null>(null);

  // Analytics State
  const [hostAnalytics, setHostAnalytics] = useState<any>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<string>("6m");
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Property Form State
  const [editingPropertyId, setEditingPropertyId] = useState<number | null>(null);
  const [propName, setPropName] = useState("");
  const [propDesc, setPropDesc] = useState("");
  const [propType, setPropType] = useState("villa");
  const [propLocationId, setPropLocationId] = useState("");
  const [selectedLocationObj, setSelectedLocationObj] = useState<any>(null);
  const [propPrice, setPropPrice] = useState(6500);
  const [propCleaningFee, setPropCleaningFee] = useState(500);
  const [propGuests, setPropGuests] = useState(6);
  const [propBedrooms, setPropBedrooms] = useState(3);
  const [propBathrooms, setPropBathrooms] = useState(3);
  const [propTotalUnits, setPropTotalUnits] = useState(1);
  const [propAddress, setPropAddress] = useState("");
  const [propRules, setPropRules] = useState("No loud noise after 10 PM. Valid ID required at check-in.");
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<number[]>([1, 2, 3, 5]);

  // Multiple Images State
  const [propImages, setPropImages] = useState<PropertyImageItem[]>([
    {
      image_url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
      is_cover: true,
      sort_order: 0,
    }
  ]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageError, setNewImageError] = useState<string | null>(null);
  const [livePreviewUrl, setLivePreviewUrl] = useState("");
  const [imageTabMode, setImageTabMode] = useState<"url" | "upload">("url");
  const [uploadingImage, setUploadingImage] = useState(false);

  const [submittingProperty, setSubmittingProperty] = useState(false);
  const [propertySubmitSuccess, setPropertySubmitSuccess] = useState(false);
  const [celebrationData, setCelebrationData] = useState<any>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      window.location.href = "/auth/login?redirect=/host/dashboard";
      return;
    }

    if (isAuthenticated) {
      loadHostData();
    }
  }, [isAuthenticated, authLoading]);

  const loadHostData = async () => {
    try {
      setLoading(true);
      const [statsRes, propsRes, bookingsRes, locsRes, amenRes, anRes, convRes] = await Promise.all([
        api.host.getDashboard(),
        api.host.getProperties(),
        api.host.getBookings(),
        api.locations.getAll(),
        api.properties.getAmenities(),
        api.host.getAnalytics(analyticsPeriod),
        api.messages.getConversations(),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (propsRes.success) setProperties(propsRes.data);
      if (bookingsRes.success) setBookings(bookingsRes.data);
      if (locsRes.success) {
        setLocations(locsRes.data);
        if (locsRes.data.length > 0 && !propLocationId) {
          setPropLocationId(locsRes.data[0].id.toString());
          setSelectedLocationObj(locsRes.data[0]);
        }
      }
      if (amenRes.success) setAmenities(amenRes.data);
      if (anRes?.success) setHostAnalytics(anRes.data);
      if (convRes?.success) setConversations(convRes.data || []);
    } catch (err) {
      console.error("Host dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const openChatWithGuest = (guestId: number, guestName: string, propertyId?: number, propertyName?: string, bookingId?: number) => {
    setChatTarget({
      id: guestId,
      name: guestName,
      propertyId,
      propertyName,
      bookingId,
    });
    setChatModalOpen(true);
  };

  const handleLogContactAction = async (bookingId: number, type: "whatsapp" | "call") => {
    try {
      await api.contacts.logAccess(bookingId, type);
    } catch (e) {
      console.warn("Contact log error:", e);
    }
  };

  const handlePeriodChange = async (period: string) => {
    setAnalyticsPeriod(period);
    try {
      setAnalyticsLoading(true);
      const res = await api.host.getAnalytics(period);
      if (res.success) setHostAnalytics(res.data);
    } catch (err) {
      console.error("Error updating host analytics period:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Availability Calendar & Blocks Handlers
  const fetchCalendarData = async (propId?: number | null) => {
    try {
      setCalendarLoading(true);
      const params: Record<string, any> = {};
      if (propId) params.property_id = propId;
      const res = await api.host.getAvailabilityCalendar(params);
      if (res.success && res.data) {
        setCalendarData(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load host calendar:", err);
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "calendar") {
      fetchCalendarData(selectedCalendarPropId);
    }
  }, [activeTab, selectedCalendarPropId]);

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockPropId || !blockStartDate || !blockEndDate) {
      setBlockError("Please select a property and date range.");
      return;
    }
    try {
      setBlockSubmitting(true);
      setBlockError(null);
      const res = await api.host.createInventoryBlock({
        property_id: Number(blockPropId),
        start_date: blockStartDate,
        end_date: blockEndDate,
        blocked_units: Number(blockUnits),
        reason: blockReason,
      });
      if (res.success) {
        setBlockSuccess("Dates successfully blocked for maintenance/personal use!");
        setBlockModalOpen(false);
        setBlockStartDate("");
        setBlockEndDate("");
        fetchCalendarData(selectedCalendarPropId);
        setTimeout(() => setBlockSuccess(null), 4000);
      }
    } catch (err: any) {
      setBlockError(err.message || "Failed to block dates. Confirmed bookings may occupy these dates.");
    } finally {
      setBlockSubmitting(false);
    }
  };

  const handleUnblock = async (blockId: number) => {
    if (!confirm("Are you sure you want to remove this block and reopen these dates for booking?")) return;
    try {
      const res = await api.host.deleteInventoryBlock(blockId);
      if (res.success) {
        fetchCalendarData(selectedCalendarPropId);
      }
    } catch (err: any) {
      alert(err.message || "Failed to remove block");
    }
  };

  // URL Validation Helper
  const isValidImageUrl = (url: string): { valid: boolean; error?: string; cleanUrl?: string } => {
    if (!url || typeof url !== "string") {
      return { valid: false, error: "Image URL cannot be empty." };
    }
    const trimmed = url.trim();
    const lower = trimmed.toLowerCase();

    if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("file:") || lower.startsWith("about:") || lower.startsWith("vbscript:")) {
      return { valid: false, error: "Dangerous or unsupported protocol (javascript:, data:, file: are rejected)." };
    }

    if (lower.startsWith("/uploads/")) {
      return { valid: true, cleanUrl: trimmed };
    }

    if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
      return { valid: false, error: "Image URL must start with https:// or http://" };
    }

    try {
      const parsed = new URL(trimmed);
      if (!parsed.hostname || !parsed.hostname.includes(".")) {
        return { valid: false, error: "Malformed URL domain." };
      }

      // Auto-extract if it is a google search redirect URL
      if (lower.includes("google.com/imgres")) {
        const imgurl = parsed.searchParams.get("imgurl");
        if (imgurl && (imgurl.startsWith("http://") || imgurl.startsWith("https://"))) {
          return { valid: true, cleanUrl: decodeURIComponent(imgurl) };
        }
      }

      return { valid: true, cleanUrl: trimmed };
    } catch {
      return { valid: false, error: "Malformed URL format." };
    }
  };

  // Add Image URL Handler
  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) {
      setNewImageError("Please enter an image URL.");
      return;
    }

    const check = isValidImageUrl(newImageUrl);
    if (!check.valid) {
      setNewImageError(check.error || "Unable to load image from this URL.");
      return;
    }

    const clean = check.cleanUrl || newImageUrl.trim();

    // Check duplicate
    if (propImages.some((img) => img.image_url === clean)) {
      setNewImageError("This image has already been added to your property.");
      return;
    }

    const isFirst = propImages.length === 0;
    const newImageItem: PropertyImageItem = {
      image_url: clean,
      is_cover: isFirst,
      sort_order: propImages.length,
    };

    setPropImages([...propImages, newImageItem]);
    setNewImageUrl("");
    setLivePreviewUrl("");
    setNewImageError(null);
  };

  // Local File Upload Handler
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNewImageError("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }

    try {
      setUploadingImage(true);
      setNewImageError(null);
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.properties.uploadImage(formData);
      if (res.success && res.data?.image_url) {
        const isFirst = propImages.length === 0;
        setPropImages([
          ...propImages,
          {
            image_url: res.data.image_url,
            is_cover: isFirst,
            sort_order: propImages.length,
          },
        ]);
      }
    } catch (err: any) {
      setNewImageError(err.message || "Failed to upload local image.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  // Set Cover Image
  const handleSetCover = (index: number) => {
    const updated = propImages.map((img, idx) => ({
      ...img,
      is_cover: idx === index,
    }));
    setPropImages(updated);
  };

  // Move Image Order
  const handleMoveImage = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= propImages.length) return;

    const list = [...propImages];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // Recalculate sort_order
    const updated = list.map((item, idx) => ({
      ...item,
      sort_order: idx,
    }));
    setPropImages(updated);
  };

  // Remove Image
  const handleRemoveImage = (index: number) => {
    const wasCover = propImages[index].is_cover;
    const remaining = propImages.filter((_, idx) => idx !== index);

    // If removed image was cover, assign first remaining as cover
    if (wasCover && remaining.length > 0) {
      remaining[0].is_cover = true;
    }

    const updated = remaining.map((item, idx) => ({
      ...item,
      sort_order: idx,
    }));
    setPropImages(updated);
  };

  // Start Editing Property
  const handleStartEditProperty = (prop: any) => {
    setEditingPropertyId(prop.id);
    setPropName(prop.name);
    setPropDesc(prop.description);
    setPropType(prop.property_type);
    setPropLocationId(prop.location_id ? prop.location_id.toString() : "");
    setSelectedLocationObj(prop.location || null);
    setPropPrice(prop.price_per_night);
    setPropCleaningFee(prop.cleaning_fee || 500);
    setPropGuests(prop.max_guests);
    setPropBedrooms(prop.bedrooms);
    setPropBathrooms(prop.bathrooms);
    setPropTotalUnits(prop.total_units || 1);
    setPropAddress(prop.address);
    setPropRules(prop.house_rules || "");
    setSelectedAmenityIds(prop.amenities_list?.map((a: any) => a.id) || []);

    if (prop.images && prop.images.length > 0) {
      const hasCover = prop.images.some((img: any) => img.is_cover || img.is_primary);
      setPropImages(
        prop.images.map((img: any, idx: number) => ({
          id: img.id,
          image_url: img.image_url,
          caption: img.caption,
          is_cover: (img.is_cover || img.is_primary) || (!hasCover && idx === 0),
          sort_order: img.sort_order ?? idx,
        }))
      );
    } else {
      setPropImages([]);
    }

    setActiveTab("add_property");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset Property Form
  const handleResetPropertyForm = () => {
    setEditingPropertyId(null);
    setPropName("");
    setPropDesc("");
    setPropType("villa");
    if (locations.length > 0) {
      setPropLocationId(locations[0].id.toString());
      setSelectedLocationObj(locations[0]);
    } else {
      setPropLocationId("");
      setSelectedLocationObj(null);
    }
    setPropPrice(6500);
    setPropCleaningFee(500);
    setPropGuests(6);
    setPropBedrooms(3);
    setPropBathrooms(3);
    setPropTotalUnits(1);
    setPropAddress("");
    setPropRules("No loud noise after 10 PM. Valid ID required at check-in.");
    setSelectedAmenityIds([1, 2, 3, 5]);
    setPropImages([
      {
        image_url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
        is_cover: true,
        sort_order: 0,
      }
    ]);
    setNewImageUrl("");
    setLivePreviewUrl("");
    setNewImageError(null);
    setFormError(null);
  };

  // Submit / Update Property
  const handleSaveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propLocationId) {
      setFormError("Please search and select a destination within Gujarat, India.");
      return;
    }

    if (propImages.length === 0) {
      setFormError("Please add at least one property image before saving.");
      return;
    }

    // Ensure exactly one cover image is set
    const preparedImages = [...propImages];
    const hasCover = preparedImages.some((img) => img.is_cover);
    if (!hasCover && preparedImages.length > 0) {
      preparedImages[0].is_cover = true;
    }

    const payload = {
      name: propName,
      description: propDesc,
      property_type: propType,
      location_id: Number(propLocationId),
      price_per_night: Number(propPrice),
      cleaning_fee: Number(propCleaningFee),
      max_guests: Number(propGuests),
      bedrooms: Number(propBedrooms),
      bathrooms: Number(propBathrooms),
      total_units: Math.max(1, Number(propTotalUnits) || 1),
      address: propAddress,
      house_rules: propRules,
      amenity_ids: selectedAmenityIds,
      images: preparedImages.map((img, idx) => ({
        image_url: img.image_url,
        caption: img.caption || `Photo ${idx + 1}`,
        is_cover: img.is_cover,
        is_primary: img.is_cover,
        sort_order: idx,
      })),
    };

    try {
      setSubmittingProperty(true);
      setFormError(null);

      if (editingPropertyId) {
        const res = await api.properties.update(editingPropertyId, payload);
        if (res.success) {
          setPropertySubmitSuccess(true);
          setCelebrationData({
            name: propName,
            property_type: propType,
            location_name: selectedLocationObj?.name || "Gujarat",
            price_per_night: Number(propPrice),
            image_url: preparedImages?.[0]?.image_url,
          });
          loadHostData();
          setTimeout(() => {
            setActiveTab("properties");
            setEditingPropertyId(null);
            setPropertySubmitSuccess(false);
          }, 2000);
        }
      } else {
        const res = await api.properties.create(payload);
        if (res.success) {
          setPropertySubmitSuccess(true);
          setCelebrationData({
            name: propName,
            property_type: propType,
            location_name: selectedLocationObj?.name || "Gujarat",
            price_per_night: Number(propPrice),
            image_url: preparedImages?.[0]?.image_url,
          });
          loadHostData();
          setTimeout(() => {
            setActiveTab("properties");
            handleResetPropertyForm();
            setPropertySubmitSuccess(false);
          }, 2000);
        }
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to save property listing");
    } finally {
      setSubmittingProperty(false);
    }
  };

  const toggleAmenity = (id: number) => {
    if (selectedAmenityIds.includes(id)) {
      setSelectedAmenityIds(selectedAmenityIds.filter((item) => item !== id));
    } else {
      setSelectedAmenityIds([...selectedAmenityIds, id]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="hidden sm:inline-block flex-shrink-0">
            <img
              src="/logo.png"
              alt="Gujarat Weekend Planner"
              className="h-12 w-auto object-contain hover:scale-105 transition-transform"
            />
          </Link>
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block mb-1">
              Host Operations Portal
            </span>
            <h1 className="text-3xl font-black text-stone-900 tracking-tight">
              {stats?.host_profile?.business_name || "Gujarat Host Dashboard"}
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Status: <span className="font-bold text-emerald-700 capitalize">{stats?.host_profile?.verification_status || "Verified"}</span> • Managing stays across Gujarat
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            handleResetPropertyForm();
            setActiveTab("add_property");
          }}
          className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center space-x-1.5 self-start"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Property</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 space-x-8 text-sm font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-4 transition-all whitespace-nowrap ${
            activeTab === "overview"
              ? "border-b-2 border-emerald-600 text-emerald-700"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`pb-4 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "analytics"
              ? "border-b-2 border-emerald-600 text-emerald-700"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          <span>📊 Earnings & Analytics</span>
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={`pb-4 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "calendar"
              ? "border-b-2 border-emerald-600 text-emerald-700"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          <span>📅 Availability & Blocks</span>
        </button>
        <button
          onClick={() => setActiveTab("properties")}
          className={`pb-4 transition-all whitespace-nowrap ${
            activeTab === "properties"
              ? "border-b-2 border-emerald-600 text-emerald-700"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          My Properties ({properties.length})
        </button>
        <button
          onClick={() => setActiveTab("bookings")}
          className={`pb-4 transition-all whitespace-nowrap ${
            activeTab === "bookings"
              ? "border-b-2 border-emerald-600 text-emerald-700"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          Customer Bookings (<AnimatedCounter value={bookings.length} />)
        </button>
        <button
          onClick={() => setActiveTab("messages")}
          className={`pb-4 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "messages"
              ? "border-b-2 border-emerald-600 text-emerald-700"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          <span>💬 Guest Inquiries (<AnimatedCounter value={conversations.length} />)</span>
          {conversations.some((c: any) => c.unread_count > 0) && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => {
            if (activeTab !== "add_property") handleResetPropertyForm();
            setActiveTab("add_property");
          }}
          className={`pb-4 transition-all ${
            activeTab === "add_property"
              ? "border-b-2 border-emerald-600 text-emerald-700"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          {editingPropertyId ? "Edit Property" : "+ Submit New Listing"}
        </button>

        <Link
          href="/scanner"
          target="_blank"
          rel="noopener noreferrer"
          className="pb-4 transition-all whitespace-nowrap flex items-center gap-1.5 text-brand-600 hover:text-brand-800 font-bold ml-auto"
        >
          <QrCode className="w-4 h-4" />
          <span>Pass Scanner (New Tab) ↗</span>
        </Link>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-stone-400 uppercase">Gross Revenue</span>
              <p className="text-2xl font-black text-stone-900">
                <AnimatedCounter
                  value={stats?.total_revenue ?? stats?.revenue ?? stats?.gross_revenue ?? 0}
                  prefix="₹"
                  formatAsCurrency
                  decimals={2}
                />
              </p>
              <span className="text-[10px] text-emerald-600 font-bold">100% Verified Payouts</span>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-stone-400 uppercase">Completed Stays</span>
              <p className="text-2xl font-black text-stone-900">
                <AnimatedCounter value={stats?.total_bookings || 0} />
              </p>
              <span className="text-[10px] text-stone-500 font-semibold">Across Gujarat Properties</span>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-stone-400 uppercase">Active Properties</span>
              <p className="text-2xl font-black text-stone-900">
                <AnimatedCounter value={stats?.active_properties || 0} />
              </p>
              <span className="text-[10px] text-stone-500 font-semibold">
                <AnimatedCounter value={stats?.total_properties || 0} /> Total
              </span>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-stone-400 uppercase">Guest Rating</span>
              <div className="flex items-center space-x-1">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span className="text-2xl font-black text-stone-900">
                  <AnimatedCounter value={stats?.average_rating || 5.0} decimals={1} />
                </span>
              </div>
              <span className="text-[10px] text-stone-500 font-semibold">
                <AnimatedCounter value={stats?.reviews_count || 0} suffix=" Reviews" />
              </span>
            </div>
          </div>

          {/* Quick Earnings & Analytics Callout Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200/80 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-950">New: Interactive Earnings & Stay Performance</h4>
                <p className="text-xs text-emerald-700/80">
                  Track 6-month earnings trajectory, property revenue rankings & booking distributions.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("analytics")}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 flex-shrink-0"
            >
              <span>View Earnings Charts</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Recent Reservations */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-lg text-stone-900">Recent Customer Bookings</h3>
            {bookings.length === 0 ? (
              <p className="text-xs text-stone-500 py-6 text-center">No bookings received yet.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {bookings.slice(0, 5).map((b) => (
                  <div key={b.id} className="py-3.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-stone-900 text-sm block">{b.property?.name}</span>
                      <span className="text-stone-500">
                        {b.customer?.full_name} • {b.check_in} to {b.check_out} ({b.guest_count} Guests)
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-stone-900 block">₹{b.total.toLocaleString("en-IN")}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* HOST ANALYTICS & EARNINGS TAB */}
      {activeTab === "analytics" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl text-white shadow-lg">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 uppercase tracking-widest">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>Host Financial Performance & Analytics</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight mt-1">Host Earnings & Booking Intelligence</h2>
              <p className="text-xs text-emerald-200 mt-1 max-w-xl">
                Real-time tracking of your 90% verified host payouts, property cash flow, and booking status distributions.
              </p>
            </div>

            {/* Time Filter Controls */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 self-start sm:self-auto">
              {[
                { id: "30d", label: "30 Days" },
                { id: "6m", label: "6 Months" },
                { id: "1y", label: "1 Year" },
                { id: "all", label: "All Time" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePeriodChange(p.id)}
                  disabled={analyticsLoading}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    analyticsPeriod === p.id
                      ? "bg-white text-emerald-900 shadow-sm"
                      : "text-emerald-200 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatMetricCard
              title="Net Host Earnings"
              value={formatRupee(hostAnalytics?.summary?.total_earnings || (stats?.total_revenue || 0) * 0.9)}
              subtitle="90% Host Payout share"
              trend={{ value: 16.2, isPositive: true, label: "vs last cycle" }}
              icon={<Wallet className="w-5 h-5" />}
              accentColor="emerald"
            />
            <StatMetricCard
              title="Gross Booking Volume"
              value={formatRupee(hostAnalytics?.summary?.gross_revenue || stats?.total_revenue || 0)}
              subtitle="Total guest payments"
              icon={<DollarSign className="w-5 h-5" />}
              accentColor="blue"
            />
            <StatMetricCard
              title="Total Nights Booked"
              value={`${hostAnalytics?.summary?.total_nights || 14} Nights`}
              subtitle="Across your listings"
              icon={<Calendar className="w-5 h-5" />}
              accentColor="purple"
            />
            <StatMetricCard
              title="Total Bookings"
              value={hostAnalytics?.summary?.total_bookings || stats?.total_bookings || bookings.length}
              subtitle={`${hostAnalytics?.summary?.confirmed_bookings || bookings.length} Confirmed`}
              icon={<CheckCircle className="w-5 h-5" />}
              accentColor="amber"
            />
            <StatMetricCard
              title="Avg Booking Ticket"
              value={formatRupee(hostAnalytics?.summary?.avg_booking_value || 0)}
              subtitle="Per guest stay"
              icon={<Activity className="w-5 h-5" />}
              accentColor="teal"
            />
            <StatMetricCard
              title="Guest Satisfaction"
              value={`${hostAnalytics?.summary?.avg_rating || stats?.average_rating || 5.0} ★`}
              subtitle={`${hostAnalytics?.summary?.reviews_count || stats?.reviews_count || 0} Reviews`}
              icon={<Star className="w-5 h-5" />}
              accentColor="rose"
            />
          </div>

          {/* Interactive Area Chart */}
          <RevenueAreaChart
            title="Monthly Host Earnings & Gross Volume"
            subtitle="Your net take-home earnings (90%) vs gross guest bookings"
            data={hostAnalytics?.revenue_trend || []}
            primaryLabel="Gross Bookings"
            secondaryLabel="Net Earnings (90%)"
            colorScheme="emerald"
          />

          {/* 2-Column Row: Property Performance Breakdown + Status Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankingBarChart
              title="Property Performance & Earnings"
              subtitle="Earnings ranked by your Gujarat properties"
              items={hostAnalytics?.property_breakdown?.map((p: any) => ({
                id: p.property_id,
                name: p.property_name,
                revenue: p.earnings,
                bookings: p.bookings,
              })) || []}
              icon={<Building className="w-5 h-5" />}
            />

            <DonutChart
              title="Booking Status Breakdown"
              subtitle="Distribution of guest booking statuses"
              totalCount={hostAnalytics?.summary?.total_bookings || bookings.length}
              centerLabel="Bookings"
              slices={hostAnalytics?.status_breakdown || []}
            />
          </div>

          {/* Weekend vs Weekday Surge Comparison */}
          {hostAnalytics?.weekend_vs_weekday && (
            <WeekendSurgeCard
              weekend={{
                count: hostAnalytics.weekend_vs_weekday.weekend_bookings || 0,
                revenue: (hostAnalytics.summary?.total_earnings || 0) * ((hostAnalytics.weekend_vs_weekday.weekend_percentage || 50) / 100),
              }}
              weekday={{
                count: hostAnalytics.weekend_vs_weekday.weekday_bookings || 0,
                revenue: (hostAnalytics.summary?.total_earnings || 0) * (1 - (hostAnalytics.weekend_vs_weekday.weekend_percentage || 50) / 100),
              }}
              weekendSharePct={hostAnalytics.weekend_vs_weekday.weekend_percentage || 50}
            />
          )}
        </div>
      )}

      {/* AVAILABILITY CALENDAR & INVENTORY BLOCKS TAB */}
      {activeTab === "calendar" && (
        <div className="space-y-8">
          {/* Calendar Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white rounded-3xl border border-stone-200 shadow-sm">
            <div>
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">
                <Calendar className="w-4 h-4" />
                <span>Real-Time Stay Inventory</span>
              </div>
              <h2 className="text-2xl font-black text-stone-900 tracking-tight">
                Availability Calendar & Host Inventory Controls
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Visual night-by-night occupancy. Block dates for maintenance or personal stays with double-booking prevention.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedCalendarPropId || ""}
                onChange={(e) => setSelectedCalendarPropId(e.target.value ? Number(e.target.value) : null)}
                className="px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All My Properties ({properties.length})</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.total_units || 1} units)
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  if (properties.length > 0) {
                    setBlockPropId(selectedCalendarPropId || properties[0].id);
                  }
                  setBlockError(null);
                  setBlockModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center space-x-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Block Dates (Maintenance / Personal)</span>
              </button>
            </div>
          </div>

          {/* Alert Banners */}
          {blockSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{blockSuccess}</span>
            </div>
          )}

          {blockError && !blockModalOpen && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{blockError}</span>
            </div>
          )}

          {/* Color Legend */}
          <div className="flex flex-wrap items-center gap-4 p-4 px-6 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs font-bold text-stone-700">
            <span className="text-stone-400 uppercase text-[10px] tracking-wider font-extrabold mr-2">Legend:</span>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Limited Availability</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span>Sold Out / Confirmed</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-stone-400" />
              <span>Host Maintenance Block</span>
            </div>
          </div>

          {/* Active Maintenance Blocks Section */}
          {calendarData && calendarData.properties && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
              <h3 className="font-extrabold text-base text-stone-900 flex items-center space-x-2">
                <Lock className="w-4 h-4 text-stone-600" />
                <span>Active Maintenance & Personal Use Blocks</span>
              </h3>

              {(() => {
                const allBlocks = calendarData.properties.flatMap((p: any) =>
                  (p.inventory_blocks || []).map((b: any) => ({
                    ...b,
                    propertyName: p.name,
                    propertyTotalUnits: p.total_units || 1,
                  }))
                );

                if (allBlocks.length === 0) {
                  return (
                    <p className="text-xs text-stone-500 italic py-2">
                      No active maintenance blocks. All unbooked dates are open for guest reservations.
                    </p>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-stone-200 text-stone-400 uppercase font-bold text-[10px]">
                          <th className="pb-2">Property</th>
                          <th className="pb-2">Date Range</th>
                          <th className="pb-2">Blocked Units</th>
                          <th className="pb-2">Reason</th>
                          <th className="pb-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-semibold text-stone-800">
                        {allBlocks.map((blk: any) => (
                          <tr key={blk.id} className="hover:bg-stone-50">
                            <td className="py-3 font-bold text-stone-900">{blk.propertyName}</td>
                            <td className="py-3 text-stone-600">
                              📅 {blk.start_date} → {blk.end_date}
                            </td>
                            <td className="py-3">
                              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-bold">
                                {blk.blocked_units} of {blk.propertyTotalUnits} unit(s)
                              </span>
                            </td>
                            <td className="py-3 text-stone-600">{blk.reason}</td>
                            <td className="py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleUnblock(blk.id)}
                                className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 transition-colors"
                              >
                                Reopen Dates
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Daily Calendar Grids */}
          {calendarLoading ? (
            <div className="p-12 text-center text-xs text-stone-500">
              <Clock className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
              <span>Calculating live 30-day inventory from database...</span>
            </div>
          ) : calendarData && calendarData.properties ? (
            <div className="space-y-6">
              {calendarData.properties.map((propCal: any) => (
                <div key={propCal.id} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-100">
                    <div>
                      <h4 className="font-extrabold text-base text-stone-900">{propCal.name}</h4>
                      <p className="text-xs text-stone-500">
                        Total Capacity: {propCal.total_units} unit{propCal.total_units > 1 ? "s" : ""} • Instant Confirm active
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                      Live SQLite Inventory
                    </span>
                  </div>

                  {/* 30-Day Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-10 gap-2">
                    {propCal.days.map((day: any) => {
                      const isFull = day.available_units === 0;
                      const isBlocked = day.blocked_units > 0;
                      const isLimited = day.available_units > 0 && day.available_units < propCal.total_units;
                      const isFree = day.available_units === propCal.total_units;

                      let cellBg = "bg-emerald-50 border-emerald-200 text-emerald-900";
                      if (isFull && !isBlocked) cellBg = "bg-rose-50 border-rose-200 text-rose-900";
                      else if (isBlocked && isFull) cellBg = "bg-stone-100 border-stone-300 text-stone-700";
                      else if (isLimited) cellBg = "bg-amber-50 border-amber-200 text-amber-900";

                      return (
                        <div
                          key={day.date}
                          className={`p-2.5 rounded-xl border flex flex-col justify-between text-xs transition-transform hover:scale-105 ${cellBg}`}
                        >
                          <div className="flex justify-between items-center text-[10px] font-bold opacity-75">
                            <span>{new Date(day.date).toLocaleDateString("en-IN", { weekday: "short" })}</span>
                            <span>{new Date(day.date).getDate()}</span>
                          </div>

                          <div className="mt-1 font-extrabold text-[11px]">
                            {isBlocked && day.available_units === 0 ? (
                              <span className="text-stone-600">Blocked</span>
                            ) : isFull ? (
                              <span className="text-rose-600">Sold Out</span>
                            ) : (
                              <span>{day.available_units} / {propCal.total_units} Free</span>
                            )}
                          </div>

                          {day.confirmed_units > 0 && (
                            <div className="text-[9px] font-medium opacity-80 mt-0.5">
                              {day.confirmed_units} Booked
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-3xl border border-stone-200 text-xs text-stone-500">
              No calendar data available.
            </div>
          )}

          {/* Block Dates Modal */}
          {blockModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-stone-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div className="flex items-center space-x-2 text-stone-900 font-extrabold text-lg">
                    <Lock className="w-5 h-5 text-emerald-600" />
                    <span>Block Dates for Maintenance</span>
                  </div>
                  <button
                    onClick={() => setBlockModalOpen(false)}
                    className="p-1 rounded-full text-stone-400 hover:text-stone-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {blockError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{blockError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateBlock} className="space-y-4 text-xs font-bold text-stone-700">
                  {/* Property Selector */}
                  <div className="space-y-1">
                    <label className="block text-stone-600">Select Property</label>
                    <select
                      value={blockPropId}
                      onChange={(e) => setBlockPropId(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50"
                      required
                    >
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.total_units || 1} units)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-stone-600">Start Date</label>
                      <input
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        value={blockStartDate}
                        onChange={(e) => setBlockStartDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-stone-600">End Date</label>
                      <input
                        type="date"
                        min={blockStartDate || new Date().toISOString().split("T")[0]}
                        value={blockEndDate}
                        onChange={(e) => setBlockEndDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50"
                        required
                      />
                    </div>
                  </div>

                  {/* Units to Block */}
                  <div className="space-y-1">
                    <label className="block text-stone-600">Units / Rooms to Block</label>
                    <input
                      type="number"
                      min={1}
                      max={properties.find((p) => p.id === blockPropId)?.total_units || 1}
                      value={blockUnits}
                      onChange={(e) => setBlockUnits(Math.max(1, Number(e.target.value)))}
                      className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50"
                      required
                    />
                    <span className="text-[10px] text-stone-400 font-normal">
                      Cannot exceed property's total inventory.
                    </span>
                  </div>

                  {/* Reason */}
                  <div className="space-y-1">
                    <label className="block text-stone-600">Reason for Blocking</label>
                    <select
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 font-semibold text-stone-900 bg-stone-50"
                    >
                      <option value="Routine Maintenance">Routine Maintenance & Repairs</option>
                      <option value="Host Personal Stay">Host Personal Stay / Family Gathering</option>
                      <option value="Painting & Deep Renovation">Painting & Deep Renovation</option>
                      <option value="Pool Cleaning & Sanitization">Pool Cleaning & Sanitization</option>
                      <option value="Off-Season Weather Closure">Off-Season / Monsoon Closure</option>
                      <option value="Private Event Booking">Offline / Direct Private Booking</option>
                    </select>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 font-medium leading-relaxed">
                    ⚠️ <strong>Notice:</strong> The server automatically rejects blocks if existing confirmed reservations occupy the requested dates.
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setBlockModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={blockSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50"
                    >
                      {blockSubmitting ? "Locking Dates..." : "Confirm Inventory Block"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PROPERTIES TAB */}
      {activeTab === "properties" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((prop) => {
              const coverImg = prop.images?.find((img: any) => img.is_cover || img.is_primary)?.image_url || prop.images?.[0]?.image_url;
              return (
                <div
                  key={prop.id}
                  className="bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-sm space-y-4 p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-stone-100 mb-3">
                      <img
                        src={coverImg || "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=800&q=80"}
                        alt={prop.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=800&q=80";
                        }}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-bold text-white flex items-center space-x-1">
                        <ImageIcon className="w-3 h-3" />
                        <span>{prop.images?.length || 0} photos</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase text-brand-600">{prop.property_type}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        prop.verification_status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {prop.verification_status}
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-stone-900 line-clamp-1">{prop.name}</h4>
                    <p className="text-xs text-stone-500">{prop.location?.name}, Gujarat</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] font-semibold text-stone-500">
                      <span>{prop.max_guests} Guests</span>
                      <span>•</span>
                      <span>{prop.bedrooms} Bed{prop.bedrooms > 1 ? "s" : ""}</span>
                      <span>•</span>
                      <span className="text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded font-bold">
                        {prop.total_units || 1} Unit{(prop.total_units || 1) > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="font-black text-stone-900">₹{prop.price_per_night} / night</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleStartEditProperty(prop)}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center space-x-1 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <Link
                        href={`/property/${prop.slug || prop.id}`}
                        className="font-bold text-brand-600 hover:text-brand-700"
                      >
                        View Listing →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

            {/* BOOKINGS TAB */}
      {activeTab === "bookings" && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-xl text-stone-900">Guest Bookings & Controlled Contacts</h3>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                  Protected System
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Direct phone and WhatsApp details unlock exclusively for confirmed and paid reservations.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-1.5 bg-stone-100 p-1.5 rounded-2xl self-start text-xs font-bold">
              <button
                type="button"
                onClick={() => setBookingFilter("all")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  bookingFilter === "all" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                All ({bookings.length})
              </button>
              <button
                type="button"
                onClick={() => setBookingFilter("confirmed")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  bookingFilter === "confirmed" ? "bg-emerald-600 text-white shadow-sm" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                ✓ Confirmed ({bookings.filter((b) => (b.status?.value || b.status) === "confirmed").length})
              </button>
              <button
                type="button"
                onClick={() => setBookingFilter("pending")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  bookingFilter === "pending" ? "bg-amber-600 text-white shadow-sm" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                ⏳ Pending ({bookings.filter((b) => (b.status?.value || b.status) === "pending").length})
              </button>
              <button
                type="button"
                onClick={() => setBookingFilter("cancelled")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  bookingFilter === "cancelled" ? "bg-rose-600 text-white shadow-sm" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                ✕ Cancelled ({bookings.filter((b) => ["cancelled", "rejected"].includes(b.status?.value || b.status)).length})
              </button>
            </div>
          </div>

          {/* Controlled Contact Security Notice */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-stone-50 rounded-2xl border border-emerald-200/80 flex items-start space-x-3 text-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-extrabold text-stone-900 block">
                Platform Anti-Bypass Contact Protection Active
              </span>
              <p className="text-stone-600">
                Direct WhatsApp and guest phone numbers are <strong>unlocked for Confirmed &amp; Paid stays</strong> so you can coordinate check-in. For pending inquiries, phone and email remain protected; communicate securely through platform internal chat.
              </p>
            </div>
          </div>

          {bookings.length === 0 ? (
            <p className="text-xs text-stone-500 py-10 text-center">No bookings on your listings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Property / Stay</th>
                    <th className="py-3 px-4">Primary Guest</th>
                    <th className="py-3 px-4">Guest Contact (Controlled)</th>
                    <th className="py-3 px-4">Stay Dates</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                  {bookings
                    .filter((b) => {
                      const st = (b.status?.value || b.status || "").toLowerCase();
                      if (bookingFilter === "all") return true;
                      if (bookingFilter === "confirmed") return st === "confirmed";
                      if (bookingFilter === "pending") return st === "pending";
                      if (bookingFilter === "cancelled") return st === "cancelled" || st === "rejected";
                      return true;
                    })
                    .map((b) => {
                      const isConfirmedPaid =
                        (b.status === "confirmed" || b.status?.value === "confirmed") &&
                        (b.payment_status === "paid" || b.payment_status?.value === "paid");

                      const cleanPhone = (b.customer?.phone || "").replace(/[^0-9]/g, "");
                      const intlPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                      const guestWaMsg = encodeURIComponent(
                        `Namaste ${b.customer?.full_name || "Guest"}, this is your host regarding your confirmed booking ${b.booking_code} at ${b.property?.name || "Gujarat Villa"}. Looking forward to your arrival on ${b.check_in}!`
                      );
                      const waUrl = b.whatsapp_url || (cleanPhone ? `https://wa.me/${intlPhone}?text=${guestWaMsg}` : null);
                      const callUrl = b.call_url || (cleanPhone ? `tel:${cleanPhone}` : null);

                      return (
                        <tr key={b.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-brand-700 block">{b.booking_code}</span>
                            <span className="text-[10px] text-stone-400">ID: #{b.id}</span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-bold text-stone-900 block line-clamp-1">{b.property?.name || "Stay"}</span>
                            <span className="text-[11px] text-stone-500">{b.guest_count} Guests</span>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-stone-900">
                            {b.customer?.full_name || "Guest"}
                          </td>

                          {/* Controlled Contact Details Column */}
                          <td className="py-3.5 px-4">
                            {isConfirmedPaid ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center space-x-1.5">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    ✓ Unlocked
                                  </span>
                                </div>
                                <div className="text-[11px] font-semibold text-stone-700">
                                  <p className="font-mono">{b.customer?.phone || "Phone not provided"}</p>
                                  <p className="text-[10px] text-stone-500">{b.customer?.email}</p>
                                </div>
                                <div className="flex items-center space-x-1.5 pt-1">
                                  {waUrl && (
                                    <a
                                      href={waUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => handleLogContactAction(b.id, "whatsapp")}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] flex items-center space-x-1 shadow-sm transition-all"
                                    >
                                      <span>📱 WhatsApp</span>
                                    </a>
                                  )}
                                  {callUrl && (
                                    <a
                                      href={callUrl}
                                      onClick={() => handleLogContactAction(b.id, "call")}
                                      className="px-2 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-bold text-[10px] flex items-center space-x-1 shadow-sm transition-all"
                                    >
                                      <Phone className="w-3 h-3" />
                                      <span>Call</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-100 text-stone-600 border border-stone-200">
                                  <Lock className="w-3 h-3 text-stone-400" />
                                  <span>🔒 Contact Locked</span>
                                </span>
                                <div className="text-[11px] font-mono text-stone-400 space-y-0.5">
                                  <p>+91 ••••• •••••</p>
                                  <p>•••••@•••••</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openChatWithGuest(
                                      b.customer_id || b.customer?.id,
                                      b.customer?.full_name || "Guest",
                                      b.property_id,
                                      b.property?.name,
                                      b.id
                                    )
                                  }
                                  className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg font-bold text-[10px] flex items-center space-x-1 transition-all"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>💬 Message Guest</span>
                                </button>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-stone-600">
                            <span>{b.check_in}</span>
                            <span className="block text-[10px] text-stone-400">to {b.check_out}</span>
                          </td>

                          <td className="py-3.5 px-4 font-black text-stone-900">
                            ₹{b.total?.toLocaleString("en-IN")}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase block w-fit ${
                                (b.status?.value || b.status) === "confirmed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : (b.status?.value || b.status) === "pending"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {b.status?.value || b.status}
                            </span>
                            <span className="text-[10px] text-stone-400 uppercase font-bold block mt-0.5">
                              Pay: {b.payment_status?.value || b.payment_status || "Pending"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 space-y-1">
                            <Link
                              href={`/booking-pass/verify/${b.verification_token || b.booking_code}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-600 font-bold hover:underline block text-xs flex items-center gap-1"
                            >
                              <span>Digital Pass (New Tab)</span>
                              <span>↗</span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* GUEST INQUIRIES & MESSAGES TAB */}
      {activeTab === "messages" && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-xl text-stone-900">Guest Inquiries &amp; Internal Inbox</h3>
                <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                  {conversations.length} Active Threads
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Answer traveler inquiries about check-in, amenities, and dates securely on the platform.
              </p>
            </div>
          </div>

          {/* Anti-Bypass Security Banner */}
          <div className="p-4 bg-gradient-to-r from-amber-50 via-brand-50 to-stone-50 rounded-2xl border border-amber-200/80 flex items-start space-x-3 text-xs">
            <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-extrabold text-stone-900 block">
                🛡️ Platform Anti-Bypass Message Protection Active
              </span>
              <p className="text-stone-600">
                To safeguard guest security and prevent platform circumvention, all direct phone numbers, personal WhatsApp links, emails, and payment handles are automatically blocked prior to confirmed booking.
              </p>
            </div>
          </div>

          {conversations.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 bg-stone-100 rounded-3xl mx-auto flex items-center justify-center text-stone-400">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-stone-800 text-sm">No Guest Inquiries Yet</h4>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                When prospective travelers click &ldquo;Message Host&rdquo; on your Gujarat villa listings, their inquiries will appear here for you to reply.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conversations.map((conv: any) => (
                <div
                  key={conv.conversation_id}
                  className="p-5 rounded-2xl border border-stone-200 hover:border-emerald-300 hover:shadow-md transition-all bg-white flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
                          {conv.other_user?.full_name ? conv.other_user.full_name[0] : "G"}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-stone-900">{conv.other_user?.full_name || "Guest"}</h4>
                          <span className="text-[11px] text-stone-400">{conv.property_name || "Gujarat Listing"}</span>
                        </div>
                      </div>

                      {conv.unread_count > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                          {conv.unread_count} new
                        </span>
                      )}
                    </div>

                    <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-700 space-y-1">
                      <p className="line-clamp-2 italic font-serif">&ldquo;{conv.last_message}&rdquo;</p>
                      {conv.is_flagged && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md inline-block">
                          ⚠️ Sensitive contact info masked
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-stone-400">
                      {conv.last_message_time ? new Date(conv.last_message_time).toLocaleDateString() : ""}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        openChatWithGuest(
                          conv.other_user?.id,
                          conv.other_user?.full_name || "Guest",
                          conv.property_id,
                          conv.property_name,
                          conv.booking_id
                        )
                      }
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Open Chat Thread</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADD / EDIT PROPERTY TAB */}
      {activeTab === "add_property" && (
        <div className="max-w-4xl bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="space-y-1">
              <h3 className="font-black text-2xl text-stone-900">
                {editingPropertyId ? `Edit Listing: ${propName || "Property"}` : "Submit New Gujarat Stay"}
              </h3>
              <p className="text-xs text-stone-500">
                {editingPropertyId
                  ? "Update property details, add image URLs, manage cover photo, or upload photos."
                  : "Enter verified Gujarat property details and image URLs. Stays are reviewed by an administrator."}
              </p>
            </div>
            {editingPropertyId && (
              <button
                type="button"
                onClick={handleResetPropertyForm}
                className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 flex items-center space-x-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel Edit</span>
              </button>
            )}
          </div>

          {propertySubmitSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>
                {editingPropertyId
                  ? "Property updated successfully! Changes saved to database."
                  : "Property submitted successfully! Forwarded for administrator verification."}
              </span>
            </div>
          )}

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProperty} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 uppercase">Property Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dang Waterfall View Villa"
                  value={propName}
                  onChange={(e) => setPropName(e.target.value)}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700 uppercase">
                    Gujarat Destination / Taluka
                  </label>
                  {selectedLocationObj && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {selectedLocationObj.district || "Gujarat"}, Gujarat
                    </span>
                  )}
                </div>
                <LocationAutocomplete
                  value={selectedLocationObj ? selectedLocationObj.name : ""}
                  onChange={(val, loc) => {
                    if (loc) {
                      setPropLocationId(loc.id.toString());
                      setSelectedLocationObj(loc);
                    } else if (!val) {
                      setPropLocationId("");
                      setSelectedLocationObj(null);
                    }
                  }}
                  onSelectLocation={(loc) => {
                    setPropLocationId(loc.id.toString());
                    setSelectedLocationObj(loc);
                  }}
                  placeholder="Search any Gujarat city, taluka, town or district..."
                  variant="form"
                  required
                />
                {selectedLocationObj && (
                  <p className="text-[11px] text-stone-500 font-medium mt-1">
                    📍 <strong className="text-stone-800">{selectedLocationObj.name}</strong> • District: <strong className="text-stone-800">{selectedLocationObj.district || "Gujarat"}</strong> • State: <strong className="text-emerald-700">Gujarat, India</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 uppercase">Stay Type</label>
                <select
                  value={propType}
                  onChange={(e) => setPropType(e.target.value)}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none cursor-pointer"
                >
                  <option value="hotel">Hotel / Heritage Hotel</option>
                  <option value="resort">Resort & Retreat</option>
                  <option value="villa">Private Pool Villa</option>
                  <option value="homestay">Heritage Homestay</option>
                  <option value="guest_house">Guest House / Bhavan</option>
                  <option value="boutique">Boutique Stay</option>
                  <option value="farmhouse">Orchard Farmhouse</option>
                  <option value="camping">Camping / Tent</option>
                  <option value="cottage">Riverside Cottage</option>
                  <option value="holiday_home">Holiday Home</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 uppercase">Price per Night (₹)</label>
                <input
                  type="number"
                  required
                  value={propPrice}
                  onChange={(e) => setPropPrice(Number(e.target.value))}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 uppercase">Cleaning Fee (₹)</label>
                <input
                  type="number"
                  value={propCleaningFee}
                  onChange={(e) => setPropCleaningFee(Number(e.target.value))}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 uppercase">Max Guests</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={propGuests}
                  onChange={(e) => setPropGuests(Number(e.target.value))}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 uppercase">Bedrooms</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={propBedrooms}
                  onChange={(e) => setPropBedrooms(Number(e.target.value))}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 uppercase">Bathrooms</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={propBathrooms}
                  onChange={(e) => setPropBathrooms(Number(e.target.value))}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700 uppercase">Total Units</label>
                  <span className="text-[10px] text-brand-600 font-bold bg-brand-50 px-1.5 py-0.5 rounded">Inventory</span>
                </div>
                <input
                  type="number"
                  min={1}
                  required
                  value={propTotalUnits}
                  onChange={(e) => setPropTotalUnits(Math.max(1, Number(e.target.value)))}
                  placeholder="e.g. 1"
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase">Property Address</label>
              <input
                type="text"
                required
                placeholder="Full address in Gujarat..."
                value={propAddress}
                onChange={(e) => setPropAddress(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase">Detailed Description</label>
              <textarea
                rows={3}
                required
                placeholder="Highlight the peaceful surroundings, private pool, dining, views..."
                value={propDesc}
                onChange={(e) => setPropDesc(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none"
              />
            </div>

            {/* PROPERTY IMAGES & REFERENCE LINK SECTION */}
            <div className="space-y-4 pt-4 border-t border-stone-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-extrabold text-stone-800 uppercase tracking-wide block">
                    Property Images & Reference Links ({propImages.length})
                  </label>
                  <p className="text-[11px] text-stone-500">
                    Add multiple photos via URL or local file upload. Click &ldquo;Set Cover&rdquo; to choose the main listing photo.
                  </p>
                </div>

                <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-xl self-start">
                  <button
                    type="button"
                    onClick={() => setImageTabMode("url")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      imageTabMode === "url" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    Option A: Image URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageTabMode("upload")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      imageTabMode === "upload" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    Option B: Local Upload
                  </button>
                </div>
              </div>

              {/* Option A: URL Input */}
              {imageTabMode === "url" && (
                <div className="space-y-3 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      placeholder="Paste image URL (e.g. https://images.unsplash.com/... or https://example.com/villa.jpg)"
                      value={newImageUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewImageUrl(val);
                        setNewImageError(null);
                        const res = isValidImageUrl(val);
                        if (res.valid) {
                          setLivePreviewUrl(res.cleanUrl || val);
                        } else {
                          setLivePreviewUrl("");
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddImageUrl();
                        }
                      }}
                      className="flex-1 p-3 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>+ Add Image</span>
                    </button>
                  </div>

                  {newImageError && (
                    <div className="flex items-center space-x-1.5 text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{newImageError}</span>
                    </div>
                  )}

                  {/* Live typing preview */}
                  {livePreviewUrl && (
                    <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center space-x-3">
                      <div className="w-16 h-12 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200">
                        <img
                          src={livePreviewUrl}
                          alt="Live Preview"
                          referrerPolicy="no-referrer"
                          onError={() => {
                            setNewImageError("Unable to load image from this URL. Please verify the link points directly to an image.");
                            setLivePreviewUrl("");
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-xs">
                        <span className="font-bold text-emerald-700 flex items-center space-x-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Valid image reference — Click &ldquo;+ Add Image&rdquo; to attach to listing</span>
                        </span>
                        <p className="text-stone-400 truncate text-[11px] font-mono">{livePreviewUrl}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Option B: Local Upload */}
              {imageTabMode === "upload" && (
                <div className="p-6 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-800">Upload high-res stay photo</p>
                    <p className="text-[11px] text-stone-400">JPEG, PNG, WebP up to 10MB</p>
                  </div>
                  <input
                    type="file"
                    id="host-property-upload"
                    accept="image/*"
                    onChange={handleFileSelected}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                  <label
                    htmlFor="host-property-upload"
                    className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold cursor-pointer transition-all active:scale-95"
                  >
                    <span>{uploadingImage ? "Uploading Photo..." : "Browse Photo from Device"}</span>
                  </label>
                </div>
              )}

              {/* Images Preview Cards Grid */}
              {propImages.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-stone-200 rounded-2xl text-stone-400 text-xs font-medium">
                  No images attached yet. Paste an image URL or upload photos above.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                  {propImages.map((img, idx) => (
                    <div
                      key={img.id || `${img.image_url}-${idx}`}
                      className={`relative rounded-2xl overflow-hidden border-2 transition-all bg-white flex flex-col justify-between ${
                        img.is_cover ? "border-emerald-500 shadow-md ring-2 ring-emerald-500/20" : "border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      <div className="relative aspect-[16/10] w-full bg-stone-100 overflow-hidden">
                        <img
                          src={img.image_url}
                          alt={`Property image ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=400&q=80";
                          }}
                          className="w-full h-full object-cover"
                        />
                        {img.is_cover ? (
                          <span className="absolute top-2 left-2 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-600 text-white shadow-md flex items-center space-x-1">
                            <Check className="w-3 h-3" />
                            <span>Cover Image</span>
                          </span>
                        ) : (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/50 backdrop-blur-sm text-white">
                            #{idx + 1}
                          </span>
                        )}
                      </div>

                      <div className="p-2.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-xs gap-1">
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleMoveImage(idx, "up")}
                            disabled={idx === 0}
                            title="Move Up"
                            className="p-1 rounded-lg hover:bg-stone-200 text-stone-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveImage(idx, "down")}
                            disabled={idx === propImages.length - 1}
                            title="Move Down"
                            className="p-1 rounded-lg hover:bg-stone-200 text-stone-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {!img.is_cover && (
                            <button
                              type="button"
                              onClick={() => handleSetCover(idx)}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                            >
                              Set Cover
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            title="Remove Image"
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Amenities Select */}
            <div className="space-y-2 pt-2 border-t border-stone-200">
              <label className="text-xs font-bold text-stone-700 uppercase block">Available Amenities</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {amenities.map((am) => (
                  <button
                    key={am.id}
                    type="button"
                    onClick={() => toggleAmenity(am.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                      selectedAmenityIds.includes(am.id)
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-stone-200 bg-stone-50 text-stone-600"
                    }`}
                  >
                    {selectedAmenityIds.includes(am.id) ? "✓ " : "+ "}
                    {am.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingProperty}
              className="w-full py-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-sm tracking-wide shadow-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {submittingProperty
                ? "Saving Property Details..."
                : editingPropertyId
                ? "Save Property Changes"
                : "Submit Property for Admin Approval"}
            </button>
          </form>
        </div>
      )}

      {/* Floating Chat Modal */}
      {chatModalOpen && chatTarget && (
        <ChatModal
          isOpen={chatModalOpen}
          onClose={() => {
            setChatModalOpen(false);
            setChatTarget(null);
          }}
          hostUserId={chatTarget.id}
          hostName={chatTarget.name}
          hostType="Guest Inquiry"
          propertyId={chatTarget.propertyId}
          propertyName={chatTarget.propertyName}
          bookingId={chatTarget.bookingId}
        />
      )}

      {/* Add / Edit Property Celebration Modal */}
      <AddCelebrationModal
        isOpen={!!celebrationData}
        property={celebrationData}
        title={editingPropertyId ? "Property Updated Successfully!" : "New Stay Listed Successfully!"}
        subtitle="Your property listing is saved with high-resolution imagery and live availability."
        onClose={() => setCelebrationData(null)}
      />
    </div>
  );
}
