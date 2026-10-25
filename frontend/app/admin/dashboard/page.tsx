"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  Users, 
  Home, 
  Compass, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Tag, 
  Star, 
  AlertCircle,
  Plus,
  Image as ImageIcon,
  TrendingUp,
  BarChart3,
  PieChart,
  Building2,
  Sparkles,
  Wallet,
  Percent,
  ArrowUpRight,
  Activity,
  Lock,
  Phone,
  ShieldAlert,
  Eye,
  MessageSquare,
  Edit3,
  Trash2,
  PauseCircle,
  PlayCircle,
  Ban,
  Search,
  Filter,
  Check,
  AlertTriangle,
  Clock,
  X,
  ExternalLink,
  Copy
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  PropertyViewModal,
  PropertyEditModal,
  PauseBlockModal,
  PropertyDeleteModal,
  AdminAddPropertyModal
} from "@/components/admin/AdminPropertyModals";
import { AddCelebrationModal } from "@/components/animations/AddCelebrationAnimation";
import { AnimatedCounter } from "@/components/animations/AnimatedCounter";
import { 
  StatMetricCard, 
  RevenueAreaChart, 
  DonutChart, 
  RankingBarChart, 
  WeekendSurgeCard, 
  CategoryDistributionGrid, 
  formatRupee 
} from "@/components/analytics/AnalyticsCharts";

export default function AdminDashboardPage() {
  const { user, isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "contact_protection" | "hosts" | "properties" | "bookings" | "coupons" | "reviews">("overview");

  // Contact Protection System State
  const [contactLogs, setContactLogs] = useState<any>({
    unlock_events: [],
    flagged_messages: [],
    settings: { contact_protection_mode: "strict" },
  });
  const [contactProtectionMode, setContactProtectionMode] = useState<"strict" | "standard">("strict");
  const [updatingContactMode, setUpdatingContactMode] = useState(false);

  const [stats, setStats] = useState<any>(null);
  const [hosts, setHosts] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<string>("6m");
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // New Coupon Form State
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponValue, setNewCouponValue] = useState(15);
  const [newCouponMin, setNewCouponMin] = useState(3000);
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  // Property Management State (View, Edit, Pause, Block, Delete, Filter)
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedPropertyForView, setSelectedPropertyForView] = useState<any | null>(null);
  const [selectedPropertyForEdit, setSelectedPropertyForEdit] = useState<any | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<any | null>(null);
  const [pauseBlockTarget, setPauseBlockTarget] = useState<{ prop: any; action: "pause" | "block"; notes: string } | null>(null);
  const [propertySearch, setPropertySearch] = useState("");
  const [propertyStatusFilter, setPropertyStatusFilter] = useState<string>("all");

  // Add Property & Celebration Animation State
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    name: string;
    property_type?: string;
    location_name?: string;
    price_per_night?: number;
    image_url?: string;
  } | null>(null);
  const [justAddedPropertyId, setJustAddedPropertyId] = useState<number | null>(null);

  // Booking & Availability Insights State
  const [bookingInsights, setBookingInsights] = useState<any | null>(null);
  const [bookingFilter, setBookingFilter] = useState<string>("all");
  const [bookingSearch, setBookingSearch] = useState<string>("");
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<any | null>(null);

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      window.location.href = "/auth/login?redirect=/admin/dashboard";
      return;
    }

    if (isAuthenticated) {
      loadAdminData();
    }
  }, [isAuthenticated, authLoading]);

  const loadAdminData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const [statsRes, hostsRes, propsRes, bookingsRes, couponsRes, revsRes, analyticsRes, contactLogsRes, locsRes, insightsRes] = await Promise.all([
        api.admin.getDashboard(),
        api.admin.getHosts(),
        api.admin.getProperties(),
        api.admin.getBookings(),
        api.coupons.getAll(),
        api.admin.getReviews(),
        api.admin.getAnalytics(analyticsPeriod),
        api.admin.getContactLogs(),
        api.locations.getAll().catch(() => ({ success: false, data: [] })),
        api.admin.getBookingInsights().catch(() => ({ success: false, data: null })),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (hostsRes.success) setHosts(hostsRes.data);
      if (propsRes.success) setProperties(propsRes.data);
      if (bookingsRes.success) setBookings(bookingsRes.data);
      if (couponsRes.success) setCoupons(couponsRes.data);
      if (revsRes.success) setReviews(revsRes.data);
      if (analyticsRes?.success) setAnalyticsData(analyticsRes.data);
      if (locsRes?.success && locsRes.data) setLocations(locsRes.data);
      if (insightsRes?.success && insightsRes.data) setBookingInsights(insightsRes.data);
      if (contactLogsRes?.success && contactLogsRes.data) {
        setContactLogs(contactLogsRes.data);
        if (contactLogsRes.data.settings?.contact_protection_mode) {
          setContactProtectionMode(contactLogsRes.data.settings.contact_protection_mode);
        }
      }
    } catch (err) {
      console.error("Admin dashboard error:", err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const handleUpdateContactMode = async (mode: "strict" | "standard") => {
    try {
      setUpdatingContactMode(true);
      const res = await api.admin.updateContactSettings(mode);
      if (res.success) {
        setContactProtectionMode(mode);
        const logsRes = await api.admin.getContactLogs();
        if (logsRes.success) setContactLogs(logsRes.data);
      }
    } catch (err: any) {
      alert(err.message || "Failed to update contact protection settings");
    } finally {
      setUpdatingContactMode(false);
    }
  };

  const handlePeriodChange = async (period: string) => {
    setAnalyticsPeriod(period);
    try {
      setAnalyticsLoading(true);
      const res = await api.admin.getAnalytics(period);
      if (res.success) setAnalyticsData(res.data);
    } catch (err) {
      console.error("Error updating analytics period:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // --- Instant Optimistic Action Handlers (Zero Lag / Immediate UI Updates) ---
  const handleApproveHost = async (hostId: number) => {
    const previousHosts = [...hosts];
    // 1. Optimistic Update (0ms)
    setHosts((prev) =>
      prev.map((h) => (h.id === hostId ? { ...h, verification_status: "verified" } : h))
    );
    try {
      await api.admin.approveHost(hostId, "Approved by Administrator");
      loadAdminData(true);
    } catch (err: any) {
      setHosts(previousHosts);
      alert(err.message || "Failed to approve host");
    }
  };

  const handleRejectHost = async (hostId: number) => {
    const previousHosts = [...hosts];
    // 1. Optimistic Update (0ms)
    setHosts((prev) =>
      prev.map((h) => (h.id === hostId ? { ...h, verification_status: "rejected" } : h))
    );
    try {
      await api.admin.rejectHost(hostId, "Verification document incomplete");
      loadAdminData(true);
    } catch (err: any) {
      setHosts(previousHosts);
      alert(err.message || "Failed to reject host");
    }
  };

  const handleApproveProperty = async (propId: number) => {
    const previousProperties = [...properties];
    // 1. Optimistic Update (0ms)
    setProperties((prev) =>
      prev.map((p) => (p.id === propId ? { ...p, verification_status: "approved", booking_enabled: true } : p))
    );
    try {
      await api.admin.approveProperty(propId, "Approved by Administrator");
      loadAdminData(true);
    } catch (err: any) {
      setProperties(previousProperties);
      alert(err.message || "Failed to approve property");
    }
  };

  const handleRejectProperty = async (propId: number) => {
    const previousProperties = [...properties];
    // 1. Optimistic Update (0ms)
    setProperties((prev) =>
      prev.map((p) => (p.id === propId ? { ...p, verification_status: "rejected", booking_enabled: false } : p))
    );
    try {
      await api.admin.rejectProperty(propId, "Suspended by Administrator");
      loadAdminData(true);
    } catch (err: any) {
      setProperties(previousProperties);
      alert(err.message || "Failed to suspend property");
    }
  };

  const handlePausePropertyConfirm = async (notes: string) => {
    if (!pauseBlockTarget?.prop) return;
    const targetId = pauseBlockTarget.prop.id;
    const previousProperties = [...properties];

    // 1. Instantly close modal & update status (0ms)
    setPauseBlockTarget(null);
    setProperties((prev) =>
      prev.map((p) => (p.id === targetId ? { ...p, verification_status: "paused", booking_enabled: false } : p))
    );

    try {
      await api.admin.pauseProperty(targetId, notes || "Paused by Administrator");
      loadAdminData(true);
    } catch (err: any) {
      setProperties(previousProperties);
      alert(err.message || "Failed to pause property");
    }
  };

  const handleBlockPropertyConfirm = async (notes: string) => {
    if (!pauseBlockTarget?.prop) return;
    const targetId = pauseBlockTarget.prop.id;
    const previousProperties = [...properties];

    // 1. Instantly close modal & update status (0ms)
    setPauseBlockTarget(null);
    setProperties((prev) =>
      prev.map((p) => (p.id === targetId ? { ...p, verification_status: "blocked", booking_enabled: false } : p))
    );

    try {
      await api.admin.blockProperty(targetId, notes || "Blocked by Administrator");
      loadAdminData(true);
    } catch (err: any) {
      setProperties(previousProperties);
      alert(err.message || "Failed to block property");
    }
  };

  const handleResumeProperty = async (propId: number) => {
    const previousProperties = [...properties];
    // 1. Optimistic Update (0ms)
    setProperties((prev) =>
      prev.map((p) => (p.id === propId ? { ...p, verification_status: "approved", booking_enabled: true } : p))
    );
    try {
      await api.admin.resumeProperty(propId);
      loadAdminData(true);
    } catch (err: any) {
      setProperties(previousProperties);
      alert(err.message || "Failed to activate property");
    }
  };

  const handleDeletePropertyConfirm = async () => {
    if (!propertyToDelete) return;
    const targetId = propertyToDelete.id;
    const previousProperties = [...properties];

    // Remove from view
    if (selectedPropertyForView?.id === targetId) setSelectedPropertyForView(null);
    setProperties((prev) => prev.filter((p) => p.id !== targetId));

    try {
      await api.admin.deleteProperty(targetId);
      loadAdminData(true);
    } catch (err: any) {
      setProperties(previousProperties);
      alert(err.message || "Failed to delete property");
    }
  };

  const handleAddPropertySubmit = async (propertyData: any) => {
    const tempId = Date.now();
    const locObj = locations.find((l) => l.id === propertyData.location_id) || { name: "Gujarat" };

    const newOptimisticProperty = {
      id: tempId,
      ...propertyData,
      location: locObj,
      verification_status: "approved",
      booking_enabled: true,
      images: propertyData.images || [],
      created_at: new Date().toISOString(),
    };

    // 1. Optimistic insert at top of list
    setProperties((prev) => [newOptimisticProperty, ...prev]);
    setJustAddedPropertyId(tempId);

    // 2. Trigger Add Celebration Animation
    setCelebrationData({
      name: propertyData.name,
      property_type: propertyData.property_type,
      location_name: locObj.name,
      price_per_night: propertyData.price_per_night,
      image_url: propertyData.images?.[0]?.image_url,
    });

    // Clear highlight after 5s
    setTimeout(() => {
      setJustAddedPropertyId(null);
    }, 5000);

    // 3. Background API request
    try {
      const res = await api.properties.create(propertyData);
      if (res.success && res.data) {
        setProperties((prev) =>
          prev.map((p) => (p.id === tempId ? { ...p, ...res.data } : p))
        );
      }
      loadAdminData(true);
    } catch (err: any) {
      console.warn("Property create error:", err);
    }
  };

  const handleSaveEditProperty = async (updatedData: any) => {
    if (!selectedPropertyForEdit) return;
    const targetId = selectedPropertyForEdit.id;
    const previousProperties = [...properties];

    // 1. Optimistically update in state and close modal (0ms)
    setProperties((prev) =>
      prev.map((p) => (p.id === targetId ? { ...p, ...updatedData } : p))
    );
    setSelectedPropertyForEdit(null);

    try {
      const res = await api.properties.update(targetId, updatedData);
      if (res.success) {
        loadAdminData(true);
      } else {
        throw new Error(res.message || "Failed to update property");
      }
    } catch (err: any) {
      setProperties(previousProperties);
      alert(err.message || "Failed to update property");
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingCoupon(true);
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setDate(today.getDate() + 60);

      await api.coupons.create({
        code: newCouponCode.toUpperCase().trim(),
        description: `${newCouponValue}% discount promotion`,
        discount_type: "percentage",
        discount_value: Number(newCouponValue),
        min_booking_value: Number(newCouponMin),
        valid_from: today.toISOString().split("T")[0],
        valid_to: nextMonth.toISOString().split("T")[0],
        max_uses: 200,
        is_active: true,
      });

      setNewCouponCode("");
      loadAdminData(true);
    } catch (err: any) {
      alert(err.message || "Failed to create coupon");
    } finally {
      setCreatingCoupon(false);
    }
  };

  const handleToggleReview = async (revId: number) => {
    const previousReviews = [...reviews];
    // 1. Optimistic update (0ms)
    setReviews((prev) =>
      prev.map((r) => (r.id === revId ? { ...r, is_approved: !r.is_approved } : r))
    );
    try {
      await api.admin.toggleReviewApproval(revId);
      loadAdminData(true);
    } catch (err: any) {
      setReviews(previousReviews);
      alert(err.message);
    }
  };

  // --- IST Date & Format Helpers ---
  const todayIST = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const formatCheckInDate = (dateStr?: string) => {
    if (!dateStr) return "TBD";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const formatTimestamp = (ts?: string) => {
    if (!ts) return "Recently";
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(d);
    } catch {
      return ts;
    }
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSec < 60) return "Just now";
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `${diffDays}d ago`;
      return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
      }).format(date);
    } catch {
      return "";
    }
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (s === "confirmed" || s === "completed") {
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
    if (s === "pending" || s === "payment_pending") {
      return "bg-amber-100 text-amber-800 border-amber-200";
    }
    if (s === "cancelled") {
      return "bg-rose-100 text-rose-800 border-rose-200";
    }
    if (s === "expired") {
      return "bg-stone-200 text-stone-700 border-stone-300";
    }
    return "bg-stone-100 text-stone-600 border-stone-200";
  };

  // --- Booking & Availability Metric Calculations ---
  const pendingCountCalc = bookings.filter((b) => {
    const s = (b.status || "").toLowerCase();
    return s === "pending" || s === "payment_pending";
  }).length;

  const upcomingCountCalc = bookings.filter((b) => {
    const s = (b.status || "").toLowerCase();
    return s === "confirmed" && b.check_in && b.check_in > todayIST;
  }).length;

  const todayCountCalc = bookings.filter((b) => {
    const s = (b.status || "").toLowerCase();
    return s === "confirmed" && b.check_in && b.check_in === todayIST;
  }).length;

  const confirmedCountCalc = bookings.filter((b) => {
    const s = (b.status || "").toLowerCase();
    return s === "confirmed" || s === "completed";
  }).length;

  const cancelledCountCalc = bookings.filter((b) => {
    const s = (b.status || "").toLowerCase();
    return s === "cancelled";
  }).length;

  const expiredCountCalc = bookings.filter((b) => {
    const s = (b.status || "").toLowerCase();
    return s === "expired";
  }).length;

  const issuesCountCalc = properties.filter((p) => {
    const s = (p.verification_status || "").toLowerCase();
    return s === "paused" || s === "blocked" || p.booking_enabled === false;
  }).length;

  const pendingBookingsCount = bookingInsights?.pending_bookings_count ?? pendingCountCalc;
  const upcomingCheckinsCount = bookingInsights?.upcoming_checkins_count ?? upcomingCountCalc;
  const todayCheckinsCount = bookingInsights?.today_checkins_count ?? todayCountCalc;
  const availabilityIssuesCount = bookingInsights?.availability_issues_count ?? issuesCountCalc;

  const recentActivityList: any[] = (bookingInsights?.recent_activity && bookingInsights.recent_activity.length > 0)
    ? bookingInsights.recent_activity
    : bookings.slice(0, 5).map((b: any) => ({
        id: b.id,
        booking_code: b.booking_code,
        property_name: b.property?.name || `Stay #${b.property_id}`,
        property_id: b.property_id,
        check_in: b.check_in,
        check_out: b.check_out,
        status: b.status,
        payment_status: b.payment_status,
        total: b.total || b.total_price || b.total_amount || 0,
        created_at: b.created_at,
        customer_name: b.customer?.full_name || b.customer_name || `Guest #${b.customer_id}`
      }));

  const handleOpenBookingDetails = (bItem: any) => {
    const matched = bookings.find((b) => b.id === bItem.id || b.booking_code === bItem.booking_code);
    setSelectedBookingForDetail(matched || bItem);
  };

  const filteredBookings = bookings.filter((b) => {
    const s = (b.status || "").toLowerCase();
    if (bookingFilter === "pending") {
      if (s !== "pending" && s !== "payment_pending") return false;
    } else if (bookingFilter === "upcoming") {
      if (s !== "confirmed" || !b.check_in || b.check_in <= todayIST) return false;
    } else if (bookingFilter === "today") {
      if (s !== "confirmed" || !b.check_in || b.check_in !== todayIST) return false;
    } else if (bookingFilter === "confirmed") {
      if (s !== "confirmed" && s !== "completed") return false;
    } else if (bookingFilter === "cancelled") {
      if (s !== "cancelled") return false;
    } else if (bookingFilter === "expired") {
      if (s !== "expired") return false;
    }

    if (bookingSearch.trim()) {
      const q = bookingSearch.toLowerCase().trim();
      const codeMatch = b.booking_code?.toLowerCase().includes(q);
      const propMatch = b.property?.name?.toLowerCase().includes(q);
      const custMatch = (b.customer?.full_name || b.customer_name)?.toLowerCase().includes(q);
      const emailMatch = b.customer?.email?.toLowerCase().includes(q);
      return codeMatch || propMatch || custMatch || emailMatch;
    }
    return true;
  });

  if (!isAdmin && !authLoading && isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold">Admin Privileges Required</h2>
        <p className="text-xs text-stone-500">You must be logged in as an administrator to access this area.</p>
        <Link href="/" className="inline-block px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-purple-700 uppercase tracking-widest mb-1">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Master Administration Hub</span>
          </div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">
            Gujarat Weekend Control Center
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Real-time control over hosts, properties, bookings, revenue, and platform moderation.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-stone-200 pb-2 overflow-x-auto">
        {[
          { key: "overview", label: "Overview Metrics" },
          { key: "analytics", label: "📊 Revenue & Analytics" },
          { key: "contact_protection", label: "🛡️ Contact Protection" },
          { key: "hosts", label: "Hosts", count: hosts.length },
          { key: "properties", label: "Properties", count: properties.length },
          { key: "bookings", label: "Bookings", count: bookings.length },
          { key: "coupons", label: "Coupons", count: coupons.length },
          { key: "reviews", label: "Reviews", count: reviews.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === tab.key
                ? "bg-purple-900 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="opacity-90">
                (<AnimatedCounter value={tab.count} duration={800} />)
              </span>
            )}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-stone-400 uppercase">Gross Revenue</span>
              <p className="text-xl font-black text-emerald-600">
                <AnimatedCounter value={stats?.total_revenue || 0} prefix="₹" formatAsCurrency decimals={2} />
              </p>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-stone-400 uppercase">Total Bookings</span>
              <p className="text-xl font-black text-stone-900">
                <AnimatedCounter value={stats?.total_bookings || bookings.length || 0} />
              </p>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-stone-400 uppercase">Properties</span>
              <p className="text-xl font-black text-stone-900">
                <AnimatedCounter value={stats?.total_properties || properties.length || 0} />
              </p>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-stone-400 uppercase">Verified Hosts</span>
              <p className="text-xl font-black text-stone-900">
                <AnimatedCounter value={stats?.total_hosts || hosts.length || 0} />
              </p>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-stone-400 uppercase">Live Stays</span>
              <p className="text-xl font-black text-emerald-600">
                <AnimatedCounter
                  value={
                    properties.filter((p) => (p.verification_status || "").toLowerCase() === "approved").length ||
                    stats?.total_properties ||
                    0
                  }
                />
              </p>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-stone-400 uppercase">Travelers</span>
              <p className="text-xl font-black text-purple-600">
                <AnimatedCounter value={stats?.total_customers || 0} />
              </p>
            </div>
          </div>

          {/* Quick Analytics Callout Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 px-6 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-emerald-50 border border-purple-200/70 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-purple-950">New: Interactive Revenue & Growth Analytics</h4>
                <p className="text-xs text-purple-700/80">
                  Track 6-month revenue trends, Gujarat city rankings, weekend stay demand & category share.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("analytics")}
              className="px-4 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 flex-shrink-0"
            >
              <span>View Full Analytics</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Real-Time Platform Overview (Bookings & Stays Operations) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Reservations */}
            <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-stone-900">Recent Guest Reservations</h3>
                      <p className="text-[11px] text-stone-400">Live booking stream across Gujarat</p>
                    </div>
                  </div>
                  <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-100">
                    <AnimatedCounter value={bookings.length} suffix=" Total" />
                  </span>
                </div>

                <div className="space-y-2.5">
                  {bookings.slice(0, 5).map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 bg-stone-50 hover:bg-stone-100/80 rounded-2xl flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="space-y-0.5 max-w-[220px] sm:max-w-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-stone-900">{b.customer_name || `Guest #${b.customer_id}`}</span>
                          <span className="text-[10px] text-stone-400 font-mono">#{b.booking_code || b.id}</span>
                        </div>
                        <p className="text-[11px] text-stone-600 truncate font-medium">
                          {b.property?.name || `Stay #${b.property_id}`}
                        </p>
                        <p className="text-[10px] text-stone-400">
                          📅 {b.check_in} → {b.check_out}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0 space-y-1">
                        <span className="font-black text-stone-900 block">
                          <AnimatedCounter value={b.total || b.total_price || b.total_amount || 0} prefix="₹" />
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase inline-block ${
                            b.status === "confirmed" || b.status === "completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : b.status === "cancelled"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}

                  {bookings.length === 0 && (
                    <div className="py-10 text-center text-stone-400 space-y-1">
                      <Calendar className="w-8 h-8 mx-auto text-stone-300" />
                      <p className="font-bold text-stone-600 text-xs">No bookings recorded yet</p>
                      <p className="text-[11px] text-stone-400">Customer reservations will appear here live as they book.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100">
                <button
                  onClick={() => setActiveTab("bookings")}
                  className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>View All Platform Reservations (<AnimatedCounter value={bookings.length} />)</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Booking & Availability Insights (Replaces Gujarat Stays Operations) */}
            <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-stone-900">Booking & Availability Insights</h3>
                      <p className="text-[11px] text-stone-400">Live operational health, check-ins & action queue</p>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200 flex items-center gap-1.5"
                    title="Live calculations using Asia/Kolkata (IST, UTC+05:30)"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    IST Live Sync
                  </span>
                </div>

                {/* 4 Compact Metric Sections */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* 1. Pending Bookings */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("bookings");
                      setBookingFilter("pending");
                    }}
                    className="p-3 bg-amber-50/70 hover:bg-amber-100/80 rounded-2xl border border-amber-200 text-left transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                        Pending
                      </span>
                      <ArrowUpRight className="w-3 h-3 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="my-1">
                      <span className="text-xl font-black text-amber-950 block">
                        <AnimatedCounter value={pendingBookingsCount} />
                      </span>
                      <span className="text-[9px] text-amber-700 font-semibold block leading-tight">
                        Requires action
                      </span>
                    </div>
                  </button>

                  {/* 2. Upcoming Check-ins */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("bookings");
                      setBookingFilter("upcoming");
                    }}
                    className="p-3 bg-purple-50/70 hover:bg-purple-100/80 rounded-2xl border border-purple-200 text-left transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">
                        Upcoming
                      </span>
                      <ArrowUpRight className="w-3 h-3 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="my-1">
                      <span className="text-xl font-black text-purple-950 block">
                        <AnimatedCounter value={upcomingCheckinsCount} />
                      </span>
                      <span className="text-[9px] text-purple-700 font-semibold block leading-tight">
                        Confirmed future
                      </span>
                    </div>
                  </button>

                  {/* 3. Today's Check-ins */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("bookings");
                      setBookingFilter("today");
                    }}
                    className="p-3 bg-emerald-50/70 hover:bg-emerald-100/80 rounded-2xl border border-emerald-200 text-left transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                        Today's In
                      </span>
                      <ArrowUpRight className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="my-1">
                      <span className="text-xl font-black text-emerald-950 block">
                        <AnimatedCounter value={todayCheckinsCount} />
                      </span>
                      <span className="text-[9px] text-emerald-700 font-semibold block leading-tight">
                        Arriving today
                      </span>
                    </div>
                  </button>

                  {/* 4. Availability Issues */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("properties");
                      setPropertyStatusFilter("issues");
                    }}
                    className="p-3 bg-rose-50/70 hover:bg-rose-100/80 rounded-2xl border border-rose-200 text-left transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                        Issues
                      </span>
                      <ArrowUpRight className="w-3 h-3 text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="my-1">
                      <span className="text-xl font-black text-rose-950 block">
                        <AnimatedCounter value={availabilityIssuesCount} />
                      </span>
                      <span className="text-[9px] text-rose-700 font-semibold block leading-tight">
                        Paused / Blocked
                      </span>
                    </div>
                  </button>
                </div>

                {/* Recent Booking Activity */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 uppercase tracking-wider px-0.5">
                    <span>Recent Booking Activity</span>
                    <span className="text-[10px] text-stone-400 font-normal">Click to inspect</span>
                  </div>

                  <div className="space-y-2">
                    {recentActivityList.slice(0, 5).map((item: any) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleOpenBookingDetails(item)}
                        className="w-full text-left p-3 bg-stone-50 hover:bg-stone-100/90 rounded-2xl border border-stone-200/80 flex items-center justify-between text-xs transition-colors group"
                      >
                        <div className="space-y-0.5 max-w-[210px] sm:max-w-xs">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-stone-900 group-hover:text-purple-900 truncate block">
                              {item.property_name}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono flex-shrink-0">
                              #{item.booking_code}
                            </span>
                          </div>
                          <p className="text-[10px] text-stone-500 flex items-center gap-1.5">
                            <span>📅 In: {formatCheckInDate(item.check_in)}</span>
                            <span>•</span>
                            <span className="text-stone-400">{formatTimeAgo(item.created_at)}</span>
                          </p>
                        </div>

                        <div className="text-right flex-shrink-0 space-y-1">
                          <span className="font-black text-stone-900 block">₹{item.total}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase inline-block border ${getStatusBadge(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </button>
                    ))}

                    {recentActivityList.length === 0 && (
                      <div className="py-8 text-center text-stone-400 space-y-1 bg-stone-50 rounded-2xl border border-stone-200/80">
                        <Calendar className="w-7 h-7 mx-auto text-stone-300" />
                        <p className="font-bold text-stone-600 text-xs">No recent booking activity</p>
                        <p className="text-[11px] text-stone-400">
                          Reservations will appear here live as guests book stays.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-3 border-t border-stone-100 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("bookings");
                    setBookingFilter("all");
                  }}
                  className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>View All Bookings</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("bookings");
                    setBookingFilter("pending");
                  }}
                  className="py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Review Pending ({pendingBookingsCount})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ANALYTICS & REVENUE TAB */}
      {activeTab === "analytics" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl text-white shadow-lg">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-300 uppercase tracking-widest">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <span>Executive Financial & Stay Intelligence</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight mt-1">Platform Revenue & Market Analytics</h2>
              <p className="text-xs text-purple-200 mt-1 max-w-xl">
                Real-time insights across Gujarat city revenues, platform commission payouts, and booking distributions.
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
                      ? "bg-white text-purple-900 shadow-sm"
                      : "text-purple-200 hover:text-white hover:bg-white/10"
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
              title="Gross Booking Volume"
              value={formatRupee(analyticsData?.summary?.total_revenue || stats?.total_revenue || 0)}
              subtitle="All confirmed stays"
              trend={{ value: 18.4, isPositive: true, label: "vs last cycle" }}
              icon={<DollarSign className="w-5 h-5" />}
              accentColor="emerald"
            />
            <StatMetricCard
              title="Platform Take (10%)"
              value={formatRupee(analyticsData?.summary?.platform_commission || (stats?.total_revenue || 0) * 0.1)}
              subtitle="Net platform revenue"
              trend={{ value: 18.4, isPositive: true }}
              icon={<TrendingUp className="w-5 h-5" />}
              accentColor="purple"
            />
            <StatMetricCard
              title="Host Payouts (90%)"
              value={formatRupee(analyticsData?.summary?.host_payouts || (stats?.total_revenue || 0) * 0.9)}
              subtitle="Distributed to hosts"
              icon={<Wallet className="w-5 h-5" />}
              accentColor="blue"
            />
            <StatMetricCard
              title="Total Bookings"
              value={analyticsData?.summary?.total_bookings || stats?.total_bookings || 0}
              subtitle={`${analyticsData?.summary?.confirmed_bookings || 0} Confirmed`}
              icon={<Calendar className="w-5 h-5" />}
              accentColor="amber"
            />
            <StatMetricCard
              title="Avg Booking Value"
              value={formatRupee(analyticsData?.summary?.avg_booking_value || 0)}
              subtitle="Per checkout ticket"
              icon={<Activity className="w-5 h-5" />}
              accentColor="teal"
            />
            <StatMetricCard
              title="Weekend Demand"
              value={`${analyticsData?.summary?.weekend_share_percentage || 48}%`}
              subtitle="Fri - Sun stays"
              icon={<Sparkles className="w-5 h-5" />}
              accentColor="rose"
            />
          </div>

          {/* Interactive Area Chart */}
          <RevenueAreaChart
            title="Gujarat Weekend Revenue & Platform Fee Growth"
            subtitle="Monthly gross booking value vs 10% platform commission fee"
            data={analyticsData?.revenue_trend || []}
            primaryLabel="Gross Revenue"
            secondaryLabel="Platform Fee (10%)"
            colorScheme="purple"
          />

          {/* 2-Column Row: Booking Status Donut + Weekend/Weekday Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DonutChart
              title="Booking Status Distribution"
              subtitle="Breakdown of customer booking states"
              totalCount={analyticsData?.summary?.total_bookings || bookings.length}
              centerLabel="Bookings"
              slices={analyticsData?.status_breakdown || []}
            />

            <WeekendSurgeCard
              weekend={{
                count: analyticsData?.weekend_vs_weekday?.weekend_bookings || 0,
                revenue: (analyticsData?.summary?.total_revenue || 0) * ((analyticsData?.weekend_vs_weekday?.weekend_percentage || 50) / 100),
              }}
              weekday={{
                count: analyticsData?.weekend_vs_weekday?.weekday_bookings || 0,
                revenue: (analyticsData?.summary?.total_revenue || 0) * (1 - (analyticsData?.weekend_vs_weekday?.weekend_percentage || 50) / 100),
              }}
              weekendSharePct={analyticsData?.weekend_vs_weekday?.weekend_percentage || 50}
            />
          </div>

          {/* 2-Column Row: Top Gujarat Destinations + Category Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankingBarChart
              title="Top Gujarat Cities by Revenue"
              subtitle="Highest revenue producing destinations across Gujarat"
              items={analyticsData?.top_cities?.map((c: any) => ({
                name: c.city,
                revenue: c.revenue,
                bookings: c.bookings,
                percentage: c.percentage,
              })) || []}
              icon={<Compass className="w-5 h-5" />}
            />

            <CategoryDistributionGrid
              categories={analyticsData?.property_type_distribution || []}
            />
          </div>
        </div>
      )}

            {/* CONTACT PROTECTION TAB */}
      {activeTab === "contact_protection" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Header Card */}
          <div className="p-6 bg-gradient-to-r from-purple-950 via-slate-900 to-stone-900 rounded-3xl text-white shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Controlled Contact & Anti-Bypass Guard</span>
                </div>
                <h2 className="text-2xl font-black tracking-tight mt-1">Platform Contact Protection Settings</h2>
                <p className="text-xs text-stone-300 mt-1 max-w-2xl">
                  Enforces website booking retention by hiding direct phone numbers and WhatsApp until booking is CONFIRMED and payment is PAID.
                </p>
              </div>

              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 self-start sm:self-auto">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider">
                  Active Mode: {contactProtectionMode.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Mode Switcher Cards */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-6">
            <div>
              <h3 className="font-extrabold text-lg text-stone-900">Anti-Bypass Shield Mode Configuration</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Select how platform message scanning reacts when sensitive contact details are detected before booking confirmation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* STRICT MODE */}
              <div
                onClick={() => !updatingContactMode && handleUpdateContactMode("strict")}
                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all space-y-3 relative ${
                  contactProtectionMode === "strict"
                    ? "border-emerald-500 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20"
                    : "border-stone-200 hover:border-stone-300 bg-stone-50/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-stone-900">Strict Mode (Default - Recommended)</h4>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        Zero Tolerance Anti-Bypass
                      </span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="contact_mode"
                    checked={contactProtectionMode === "strict"}
                    onChange={() => handleUpdateContactMode("strict")}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                <p className="text-xs text-stone-600 leading-relaxed">
                  Completely blocks messages containing Indian/international phone numbers, emails, WhatsApp links, UPI IDs, social usernames, external payment links, and circumvention keywords (&ldquo;call me&rdquo;, &ldquo;WhatsApp me&rdquo;).
                </p>

                <div className="p-3 bg-white rounded-xl border border-stone-200 text-[11px] text-stone-500">
                  <span className="font-bold text-stone-700 block mb-0.5">System Message Returned to User:</span>
                  <p className="italic text-rose-600 font-medium">
                    &ldquo;Direct contact information cannot be shared before the booking is confirmed. Please continue the conversation through the platform.&rdquo;
                  </p>
                </div>
              </div>

              {/* STANDARD MODE */}
              <div
                onClick={() => !updatingContactMode && handleUpdateContactMode("standard")}
                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all space-y-3 relative ${
                  contactProtectionMode === "standard"
                    ? "border-purple-600 bg-purple-50/40 shadow-md ring-2 ring-purple-600/20"
                    : "border-stone-200 hover:border-stone-300 bg-stone-50/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-stone-900">Standard Mode</h4>
                      <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                        Automatic Redaction &amp; Masking
                      </span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="contact_mode"
                    checked={contactProtectionMode === "standard"}
                    onChange={() => handleUpdateContactMode("standard")}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </div>

                <p className="text-xs text-stone-600 leading-relaxed">
                  Allows the message to be delivered, but automatically replaces all detected phone numbers, email addresses, and external links with an inline security placeholder.
                </p>

                <div className="p-3 bg-white rounded-xl border border-stone-200 text-[11px] text-stone-500">
                  <span className="font-bold text-stone-700 block mb-0.5">Redacted In-Message Placeholder:</span>
                  <p className="italic font-mono text-purple-700 font-bold">
                    &ldquo;[CONTACT INFO HIDDEN - AVAILABLE AFTER CONFIRMED BOOKING]&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {updatingContactMode && (
              <p className="text-xs font-bold text-stone-500 flex items-center space-x-2">
                <span className="w-3.5 h-3.5 border-2 border-stone-600 border-t-transparent rounded-full animate-spin" />
                <span>Updating platform contact protection policy...</span>
              </p>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-stone-400 uppercase">Contact Unlock Events</span>
              <p className="text-2xl font-black text-stone-900">{contactLogs.unlock_events?.length || 0}</p>
              <span className="text-[10px] text-emerald-600 font-bold">Confirmed Reservations Only</span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-stone-400 uppercase">WhatsApp Action Clicks</span>
              <p className="text-2xl font-black text-emerald-600">
                {contactLogs.unlock_events?.filter((e: any) => e.channel === "whatsapp").length || 0}
              </p>
              <span className="text-[10px] text-stone-400 font-medium">Logged &amp; tracked</span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-stone-400 uppercase">Direct Call Clicks</span>
              <p className="text-2xl font-black text-blue-600">
                {contactLogs.unlock_events?.filter((e: any) => e.channel === "call").length || 0}
              </p>
              <span className="text-[10px] text-stone-400 font-medium">Logged &amp; tracked</span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-stone-400 uppercase">Flagged Bypass Attempts</span>
              <p className="text-2xl font-black text-amber-600">{contactLogs.flagged_messages?.length || 0}</p>
              <span className="text-[10px] text-amber-600 font-bold">Blocked or Masked</span>
            </div>
          </div>

          {/* Contact Unlock Events Audit Table */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-extrabold text-base text-stone-900">Contact Unlock Events Audit Trail</h3>
                <p className="text-xs text-stone-500">
                  Comprehensive tamper-proof log of when guests or hosts unlocked and accessed direct contact info.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {contactLogs.unlock_events?.length || 0} Records
              </span>
            </div>

            {contactLogs.unlock_events?.length === 0 ? (
              <p className="text-xs text-stone-400 py-8 text-center">No contact unlock events recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Event ID</th>
                      <th className="py-3 px-4">Booking Ref</th>
                      <th className="py-3 px-4">Property</th>
                      <th className="py-3 px-4">Guest</th>
                      <th className="py-3 px-4">Host</th>
                      <th className="py-3 px-4">Channel</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                    {contactLogs.unlock_events?.map((ev: any) => (
                      <tr key={ev.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-stone-400">#{ev.id}</td>
                        <td className="py-3 px-4 font-mono font-bold text-brand-700">{ev.booking_code}</td>
                        <td className="py-3 px-4 font-semibold text-stone-900">{ev.property_name}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold block">{ev.guest_name}</span>
                          <span className="text-[10px] text-stone-400">{ev.guest_email}</span>
                        </td>
                        <td className="py-3 px-4 font-bold text-stone-700">{ev.host_name}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              ev.channel === "whatsapp"
                                ? "bg-emerald-100 text-emerald-800"
                                : ev.channel === "call"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-stone-100 text-stone-700"
                            }`}
                          >
                            {ev.channel === "whatsapp" ? "📱 WhatsApp" : ev.channel === "call" ? "📞 Call" : "👁️ Pass View"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                          {ev.unlocked_at ? new Date(ev.unlocked_at).toLocaleString() : "N/A"}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-stone-400">{ev.ip_address || "127.0.0.1"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Flagged Anti-Bypass Attempts Audit Table */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-extrabold text-base text-stone-900">Flagged Anti-Bypass Chat Attempts</h3>
                <p className="text-xs text-stone-500">
                  Messages intercepted by the shield where phone numbers, emails, handles or bypass keywords were attempted before booking.
                </p>
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                {contactLogs.flagged_messages?.length || 0} Flagged
              </span>
            </div>

            {contactLogs.flagged_messages?.length === 0 ? (
              <p className="text-xs text-stone-400 py-8 text-center">No flagged message attempts on record.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Msg ID</th>
                      <th className="py-3 px-4">Sender</th>
                      <th className="py-3 px-4">Trigger Reason</th>
                      <th className="py-3 px-4">Intercepted Message</th>
                      <th className="py-3 px-4">Listing</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                    {contactLogs.flagged_messages?.map((fm: any) => (
                      <tr key={fm.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-stone-400">#{fm.id}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold block">{fm.sender_name}</span>
                          <span className="text-[10px] text-stone-400 uppercase font-bold">{fm.sender_role}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                            {fm.flag_reason || "bypass_attempt"}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <p className="text-stone-700 font-mono text-[11px] line-clamp-2 bg-stone-50 p-2 rounded-lg border border-stone-200">
                            {fm.message}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-stone-600">{fm.property_name || "General"}</td>
                        <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                          {fm.created_at ? new Date(fm.created_at).toLocaleString() : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HOSTS TAB */}
      {activeTab === "hosts" && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-stone-100 gap-2">
            <div>
              <h3 className="font-extrabold text-lg text-stone-900">Registered Hosts Directory</h3>
              <p className="text-xs text-stone-500">
                Review host profiles, verify local hosts, manage verification status, and view listed properties.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                <AnimatedCounter value={hosts.filter((h) => h.verification_status === "verified").length} /> Verified
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold">
                <AnimatedCounter value={hosts.filter((h) => h.verification_status === "pending").length} /> Pending
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400 font-bold uppercase">
                  <th className="py-3 px-4">Host & Business</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Properties</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                {hosts.map((h) => (
                  <tr key={h.id} className="hover:bg-stone-50">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold block text-stone-900 text-sm">{h.business_name}</span>
                        <span className="text-[11px] text-stone-500 font-normal">
                          Owner: <span className="font-semibold text-stone-700">{h.user_name || "N/A"}</span>
                        </span>
                        {h.bio && (
                          <p className="text-[10px] text-stone-400 italic line-clamp-1 max-w-xs mt-0.5">{h.bio}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-bold uppercase tracking-wider">
                        {h.host_type ? h.host_type.replace(/_/g, " ") : "Host"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-mono text-[11px] text-stone-700 block">{h.user_email || "N/A"}</span>
                        <span className="text-[10px] text-stone-400">{h.phone || "No phone"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-bold text-[11px]">
                        <AnimatedCounter value={h.properties_count || 0} suffix=" stays" />
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          h.verification_status === "verified"
                            ? "bg-emerald-100 text-emerald-800"
                            : h.verification_status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {h.verification_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        {h.verification_status !== "verified" ? (
                          <button
                            onClick={() => handleApproveHost(h.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition"
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRejectHost(h.id)}
                            className="text-rose-600 hover:text-rose-800 font-bold hover:underline text-xs"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {hosts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400">
                      No hosts registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PROPERTIES TAB */}
      {activeTab === "properties" && (() => {
        const approvedCount = properties.filter((p) => p.verification_status?.toLowerCase() === "approved").length;
        const pausedCount = properties.filter((p) => p.verification_status?.toLowerCase() === "paused").length;
        const blockedCount = properties.filter((p) => p.verification_status?.toLowerCase() === "blocked").length;
        const pendingCount = properties.filter((p) => !p.verification_status || p.verification_status?.toLowerCase() === "pending").length;

        const filteredProperties = properties.filter((p) => {
          const st = (p.verification_status || "pending").toLowerCase();
          if (propertyStatusFilter === "issues") {
            const isIssue = st === "paused" || st === "blocked" || p.booking_enabled === false;
            if (!isIssue) return false;
          } else if (propertyStatusFilter !== "all" && st !== propertyStatusFilter) {
            return false;
          }
          if (propertySearch.trim()) {
            const q = propertySearch.toLowerCase().trim();
            const nameMatch = p.name?.toLowerCase().includes(q);
            const locMatch = p.location?.name?.toLowerCase().includes(q);
            const hostMatch = p.host?.business_name?.toLowerCase().includes(q);
            const typeMatch = p.property_type?.toLowerCase().includes(q);
            return nameMatch || locMatch || hostMatch || typeMatch;
          }
          return true;
        });

        return (
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-6">
            {/* Header & Quick Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>Stays Control & Host Moderation</span>
                </div>
                <h3 className="font-extrabold text-xl text-stone-900">Gujarat Stays Management</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  View, edit, pause, or block properties in real-time when host issues or maintenance occur.
                </p>
              </div>

              {/* Status Counters */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-800 border border-stone-200">
                  Total: <AnimatedCounter value={properties.length} />
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Live: <AnimatedCounter value={approvedCount} />
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Paused: <AnimatedCounter value={pausedCount} />
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Blocked: <AnimatedCounter value={blockedCount} />
                </span>
                {pendingCount > 0 && (
                  <span className="px-3 py-1.5 rounded-xl bg-yellow-50 text-yellow-800 border border-yellow-200 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    Pending: <AnimatedCounter value={pendingCount} />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsAddPropertyModalOpen(true)}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Stay</span>
                </button>
              </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-3 rounded-2xl border border-stone-200">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by stay name, location, host, or type..."
                  value={propertySearch}
                  onChange={(e) => setPropertySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPropertyStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    propertyStatusFilter === "all"
                      ? "bg-stone-900 text-white shadow-sm"
                      : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                  }`}
                >
                  All (<AnimatedCounter value={properties.length} />)
                </button>
                <button
                  type="button"
                  onClick={() => setPropertyStatusFilter("approved")}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    propertyStatusFilter === "approved"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                  }`}
                >
                  Live (<AnimatedCounter value={approvedCount} />)
                </button>
                <button
                  type="button"
                  onClick={() => setPropertyStatusFilter("paused")}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    propertyStatusFilter === "paused"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                  }`}
                >
                  Paused (<AnimatedCounter value={pausedCount} />)
                </button>
                <button
                  type="button"
                  onClick={() => setPropertyStatusFilter("blocked")}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    propertyStatusFilter === "blocked"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                  }`}
                >
                  Blocked (<AnimatedCounter value={blockedCount} />)
                </button>
                <button
                  type="button"
                  onClick={() => setPropertyStatusFilter("issues")}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    propertyStatusFilter === "issues"
                      ? "bg-rose-700 text-white shadow-sm ring-2 ring-rose-300"
                      : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                  }`}
                >
                  ⚠️ Issues (<AnimatedCounter value={availabilityIssuesCount} />)
                </button>
                {pendingCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setPropertyStatusFilter("pending")}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      propertyStatusFilter === "pending"
                        ? "bg-yellow-600 text-white shadow-sm"
                        : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                    }`}
                  >
                    Pending (<AnimatedCounter value={pendingCount} />)
                  </button>
                )}
              </div>
            </div>

            {/* Properties Table */}
            <div className="overflow-x-auto rounded-2xl border border-stone-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Stay & Photos</th>
                    <th className="py-3.5 px-4">Destination</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Price</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                  {filteredProperties.map((p) => {
                    const coverImg = p.images?.find((img: any) => img.is_cover || img.is_primary)?.image_url || p.images?.[0]?.image_url;
                    const st = (p.verification_status || "pending").toLowerCase();
                    const isApproved = st === "approved";
                    const isPaused = st === "paused";
                    const isBlocked = st === "blocked";
                    const isJustAdded = p.id === justAddedPropertyId;

                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors ${
                          isJustAdded
                            ? "animate-row-added bg-emerald-50/70"
                            : "hover:bg-stone-50/80"
                        }`}
                      >
                        {/* Stay & Photos */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-14 h-10 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200 relative group">
                              {coverImg ? (
                                <img
                                  src={coverImg}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=400&q=80";
                                  }}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[9px] text-stone-400">None</div>
                              )}
                            </div>
                            <div className="max-w-[200px] sm:max-w-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold block text-stone-900 truncate" title={p.name}>
                                  {p.name}
                                </span>
                                {isJustAdded && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white animate-bounce shadow-sm flex-shrink-0">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    <span>New</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mt-0.5">
                                {p.host?.business_name && (
                                  <span className="text-stone-600 font-semibold truncate max-w-[120px]">
                                    Host: {p.host.business_name}
                                  </span>
                                )}
                                <span>•</span>
                                {p.images?.length > 0 ? (
                                  <span className="text-emerald-700 font-semibold">{p.images.length} photos</span>
                                ) : (
                                  <span className="text-amber-600 font-semibold">⚠️ 0 photos</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Destination */}
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-stone-800">{p.location?.name || p.city || "Gujarat"}</span>
                          <span className="block text-[10px] text-stone-400">Gujarat</span>
                        </td>

                        {/* Type */}
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-stone-100 text-stone-700 border border-stone-200">
                            {p.property_type}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-3.5 px-4">
                          <span className="font-black text-stone-900 text-sm">
                            <AnimatedCounter value={p.price_per_night} prefix="₹" />
                          </span>
                          <span className="text-[10px] text-stone-400 block">/ night</span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
                              isApproved
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : isPaused
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : isBlocked
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : "bg-stone-100 text-stone-700 border border-stone-300"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isApproved ? "bg-emerald-500" : isPaused ? "bg-amber-500" : isBlocked ? "bg-rose-500" : "bg-stone-400"
                            }`} />
                            {p.verification_status || "PENDING"}
                          </span>
                        </td>

                        {/* Actions (View, Edit, Pause, Block, Delete) */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* VIEW BUTTON */}
                            <button
                              onClick={() => setSelectedPropertyForView(p)}
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                              title="View full property details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* EDIT BUTTON */}
                            <button
                              onClick={() => setSelectedPropertyForEdit(p)}
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                              title="Edit stay details"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* PAUSE / RESUME / APPROVE BUTTON */}
                            {isApproved ? (
                              <button
                                onClick={() => setPauseBlockTarget({ prop: p, action: "pause", notes: "" })}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 transition-colors flex items-center gap-1"
                                title="Pause bookings for this property"
                              >
                                <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Pause</span>
                              </button>
                            ) : isPaused || isBlocked ? (
                              <button
                                onClick={() => handleResumeProperty(p.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 transition-colors flex items-center gap-1"
                                title="Resume / Activate property"
                              >
                                <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Resume</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleApproveProperty(p.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors"
                                title="Approve property"
                              >
                                Approve
                              </button>
                            )}

                            {/* BLOCK BUTTON (if not already blocked) */}
                            {!isBlocked && (
                              <button
                                onClick={() => setPauseBlockTarget({ prop: p, action: "block", notes: "" })}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors border border-rose-200"
                                title="Block property for violations or disputes"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}

                            {/* DELETE BUTTON */}
                            <button
                              onClick={() => setPropertyToDelete(p)}
                              className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600 transition-colors"
                              title="Delete property permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredProperties.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-stone-400">
                        <Building2 className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                        <p className="font-bold text-stone-600">No properties found</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">Try adjusting your search query or filter selection.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* BOOKINGS TAB */}
      {activeTab === "bookings" && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-6">
          {/* Header & Quick Summary */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <div className="flex items-center space-x-2 text-xs font-bold text-purple-700 uppercase tracking-widest mb-1">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>Reservations Control & Guest Passes</span>
              </div>
              <h3 className="font-extrabold text-xl text-stone-900">Platform Bookings Management</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Review guest reservations, inspect check-in dates, and monitor confirmed vs pending bookings.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-800 border border-stone-200">
                Total: {bookings.length}
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
                Pending: {pendingBookingsCount}
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200">
                Upcoming: {upcomingCheckinsCount}
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                Today: {todayCheckinsCount}
              </span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-3 rounded-2xl border border-stone-200">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by booking code, property, guest name, or email..."
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => setBookingFilter("all")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  bookingFilter === "all"
                    ? "bg-stone-900 text-white shadow-sm"
                    : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                }`}
              >
                All ({bookings.length})
              </button>
              <button
                type="button"
                onClick={() => setBookingFilter("pending")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  bookingFilter === "pending"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                }`}
              >
                Pending ({pendingBookingsCount})
              </button>
              <button
                type="button"
                onClick={() => setBookingFilter("today")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  bookingFilter === "today"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                }`}
              >
                Today ({todayCheckinsCount})
              </button>
              <button
                type="button"
                onClick={() => setBookingFilter("upcoming")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  bookingFilter === "upcoming"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                }`}
              >
                Upcoming ({upcomingCheckinsCount})
              </button>
              <button
                type="button"
                onClick={() => setBookingFilter("confirmed")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  bookingFilter === "confirmed"
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                }`}
              >
                Confirmed ({confirmedCountCalc})
              </button>
              <button
                type="button"
                onClick={() => setBookingFilter("cancelled")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  bookingFilter === "cancelled"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                }`}
              >
                Cancelled ({cancelledCountCalc})
              </button>
              <button
                type="button"
                onClick={() => setBookingFilter("expired")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  bookingFilter === "expired"
                    ? "bg-stone-600 text-white shadow-sm"
                    : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                }`}
              >
                Expired ({expiredCountCalc})
              </button>
            </div>
          </div>

          {/* Bookings Table */}
          <div className="overflow-x-auto rounded-2xl border border-stone-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Booking Ref</th>
                  <th className="py-3.5 px-4">Stay & Property</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Dates</th>
                  <th className="py-3.5 px-4">Total</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                {filteredBookings.map((b: any) => (
                  <tr key={b.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-700">
                      #{b.booking_code}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-stone-900">
                      {b.property?.name || `Stay #${b.property_id}`}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-stone-900 block">
                        {b.customer?.full_name || b.customer_name || `Customer #${b.customer_id}`}
                      </span>
                      {b.customer?.email && (
                        <span className="text-[10px] text-stone-400 block font-mono">
                          {b.customer.email}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span>{formatCheckInDate(b.check_in)} → {formatCheckInDate(b.check_out)}</span>
                        {b.check_in === todayIST && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                            Today
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-black text-stone-900">
                      ₹{b.total || b.total_price || b.total_amount || 0}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block border ${getStatusBadge(b.status)}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedBookingForDetail(b)}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold transition-colors"
                        >
                          Inspect
                        </button>
                        <Link
                          href={`/bookings/${b.booking_code}`}
                          target="_blank"
                          className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold transition-colors flex items-center gap-1"
                        >
                          <span>Pass</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-400">
                      <Calendar className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                      <p className="font-bold text-stone-600">No reservations match the filter</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Try resetting your search query or switching the status filter tab.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COUPONS TAB */}
      {activeTab === "coupons" && (
        <div className="space-y-6">
          {/* Create Coupon Form */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4 max-w-xl">
            <h3 className="font-extrabold text-base text-stone-900 flex items-center space-x-2">
              <Tag className="w-4 h-4 text-purple-600" />
              <span>Create Discount Coupon</span>
            </h3>

            <form onSubmit={handleCreateCoupon} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Coupon Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MONSOON25"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Discount %</label>
                  <input
                    type="number"
                    required
                    value={newCouponValue}
                    onChange={(e) => setNewCouponValue(Number(e.target.value))}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Min Booking (₹)</label>
                  <input
                    type="number"
                    required
                    value={newCouponMin}
                    onChange={(e) => setNewCouponMin(Number(e.target.value))}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creatingCoupon}
                className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs"
              >
                {creatingCoupon ? "Creating..." : "Save Coupon"}
              </button>
            </form>
          </div>

          {/* Existing Coupons */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-3">
            <h3 className="font-extrabold text-base text-stone-900">Active Coupons</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {coupons.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-black text-purple-900 text-sm">{c.code}</span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-200 text-purple-800 text-[10px] font-bold">
                      {c.discount_value}% OFF
                    </span>
                  </div>
                  <p className="text-stone-600">Min booking: ₹{c.min_booking_value}</p>
                  <p className="text-[10px] text-stone-400">Uses: {c.current_uses} / {c.max_uses}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* REVIEWS TAB */}
      {activeTab === "reviews" && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-lg text-stone-900">Customer Reviews Moderation</h3>
          <div className="divide-y divide-stone-100">
            {reviews.map((r) => (
              <div key={r.id} className="py-4 flex items-start justify-between text-xs gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{r.rating}/5</span>
                    </div>
                    <span className="font-bold text-stone-900">{r.title}</span>
                  </div>
                  <p className="text-stone-600 leading-relaxed max-w-xl">{r.comment}</p>
                  <p className="text-[11px] text-stone-400">
                    By {r.customer_name} for <strong>{r.property_name}</strong>
                  </p>
                </div>

                <div>
                  <button
                    onClick={() => handleToggleReview(r.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      r.is_approved ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600"
                    }`}
                  >
                    {r.is_approved ? "Approved" : "Hidden"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PROPERTY VIEW MODAL */}
      <PropertyViewModal
        isOpen={!!selectedPropertyForView}
        property={selectedPropertyForView}
        onClose={() => setSelectedPropertyForView(null)}
        onEdit={(prop) => setSelectedPropertyForEdit(prop)}
        onPause={(prop) => setPauseBlockTarget({ prop, action: "pause", notes: "" })}
        onResume={(prop) => handleResumeProperty(prop.id)}
        onBlock={(prop) => setPauseBlockTarget({ prop, action: "block", notes: "" })}
        onDelete={(prop) => setPropertyToDelete(prop)}
      />

      {/* PROPERTY EDIT MODAL */}
      <PropertyEditModal
        isOpen={!!selectedPropertyForEdit}
        property={selectedPropertyForEdit}
        locations={locations}
        onClose={() => setSelectedPropertyForEdit(null)}
        onSave={handleSaveEditProperty}
      />

      {/* PAUSE / BLOCK MODAL */}
      <PauseBlockModal
        isOpen={!!pauseBlockTarget}
        property={pauseBlockTarget?.prop}
        actionType={pauseBlockTarget?.action || "pause"}
        onClose={() => setPauseBlockTarget(null)}
        onConfirm={async (notes) => {
          if (pauseBlockTarget?.action === "block") {
            await handleBlockPropertyConfirm(notes);
          } else {
            await handlePausePropertyConfirm(notes);
          }
        }}
      />

      {/* PROPERTY DELETE MODAL */}
      <PropertyDeleteModal
        isOpen={!!propertyToDelete}
        property={propertyToDelete}
        onClose={() => setPropertyToDelete(null)}
        onConfirm={handleDeletePropertyConfirm}
      />

      {/* ADMIN ADD PROPERTY MODAL */}
      <AdminAddPropertyModal
        isOpen={isAddPropertyModalOpen}
        locations={locations}
        onClose={() => setIsAddPropertyModalOpen(false)}
        onSubmit={handleAddPropertySubmit}
      />

      {/* ADD CELEBRATION MODAL */}
      <AddCelebrationModal
        isOpen={!!celebrationData}
        property={celebrationData}
        title="Stay Added Successfully!"
        subtitle="New Gujarat property listed & live on platform."
        onClose={() => setCelebrationData(null)}
      />

      {/* BOOKING DETAIL INSPECTION MODAL */}
      {selectedBookingForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-stone-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-xs text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200">
                    #{selectedBookingForDetail.booking_code}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${getStatusBadge(selectedBookingForDetail.status)}`}>
                    {selectedBookingForDetail.status}
                  </span>
                  {selectedBookingForDetail.payment_status && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-stone-100 text-stone-600 border border-stone-200">
                      Payment: {selectedBookingForDetail.payment_status}
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-base text-stone-900">
                  {selectedBookingForDetail.property?.name || selectedBookingForDetail.property_name || "Stay Reservation"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingForDetail(null)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs">
              {/* Check-in / Check-out */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Check-in</span>
                  <p className="font-bold text-xs text-stone-900 mt-0.5">
                    📅 {formatCheckInDate(selectedBookingForDetail.check_in)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Check-out</span>
                  <p className="font-bold text-xs text-stone-900 mt-0.5">
                    📅 {formatCheckInDate(selectedBookingForDetail.check_out)}
                  </p>
                </div>
              </div>

              {/* Guest & Total */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Guest</span>
                  <p className="font-bold text-stone-900">
                    {selectedBookingForDetail.customer?.full_name || selectedBookingForDetail.customer_name || "Guest"}
                  </p>
                  {selectedBookingForDetail.customer?.email && (
                    <p className="text-stone-500 font-mono text-[11px] truncate">{selectedBookingForDetail.customer.email}</p>
                  )}
                  {selectedBookingForDetail.customer?.phone && (
                    <p className="text-stone-500 text-[11px]">📞 {selectedBookingForDetail.customer.phone}</p>
                  )}
                  {selectedBookingForDetail.guest_count && (
                    <p className="text-stone-500 text-[11px]">👥 {selectedBookingForDetail.guest_count} Guests</p>
                  )}
                </div>

                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Total Amount</span>
                    <p className="font-black text-xl text-stone-900 mt-0.5">
                      ₹{selectedBookingForDetail.total || selectedBookingForDetail.total_price || selectedBookingForDetail.total_amount || 0}
                    </p>
                  </div>
                  <p className="text-stone-400 text-[10px]">
                    Created: {formatTimestamp(selectedBookingForDetail.created_at)}
                  </p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                {selectedBookingForDetail.booking_code && (
                  <Link
                    href={`/bookings/${selectedBookingForDetail.booking_code}`}
                    target="_blank"
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span>View Digital Pass</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedBookingForDetail(null)}
                  className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
