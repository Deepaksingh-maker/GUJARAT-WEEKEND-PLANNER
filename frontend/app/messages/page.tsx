"use client";

import React, { Suspense, useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  MessageSquare, 
  Send, 
  Search, 
  ShieldCheck, 
  CheckCheck, 
  Clock, 
  ArrowLeft, 
  ExternalLink, 
  Sparkles, 
  Lock, 
  Building2, 
  AlertTriangle, 
  Phone, 
  Compass, 
  ChevronRight,
  Smile,
  RefreshCw
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface ConversationItem {
  conversation_id?: string;
  other_user: {
    id: number;
    full_name: string;
    email: string;
    role: string;
    business_name?: string | null;
    avatar_url?: string | null;
  };
  property_id?: number | null;
  property_name?: string | null;
  property_image?: string | null;
  booking_id?: number | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_flagged?: boolean;
}

interface ChatMsg {
  id: number;
  sender_id: number;
  receiver_id: number;
  property_id?: number | null;
  booking_id?: number | null;
  message: string;
  is_read: boolean;
  is_flagged?: boolean;
  flag_reason?: string | null;
  created_at: string;
  sender_name?: string | null;
  receiver_name?: string | null;
  property_name?: string | null;
}

const QUICK_SUGGESTIONS = [
  "Namaste! Is early check-in possible?",
  "Is authentic Gujarati Kathiyawadi food available?",
  "Is the swimming pool completely private?",
  "What are the best outdoor sights nearby?",
  "Is parking available for family SUVs?"
];

function MessagesPageContent() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Query params to initiate chat with a specific host/property
  const queryHostId = searchParams.get("host_id") ? Number(searchParams.get("host_id")) : null;
  const queryPropertyId = searchParams.get("property_id") ? Number(searchParams.get("property_id")) : null;
  const queryPropertyName = searchParams.get("property_name") || null;

  // Conversations state
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "unread">("all");

  // Selected active conversation
  const [activeOtherUserId, setActiveOtherUserId] = useState<number | null>(queryHostId);
  const [activePropertyId, setActivePropertyId] = useState<number | null>(queryPropertyId);
  const [activePropertyName, setActivePropertyName] = useState<string | null>(queryPropertyName);

  // Active chat thread state
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [shieldWarning, setShieldWarning] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const initialSelectionDoneRef = useRef(false);

  // Auto-scroll ONLY inside the chat container (never scrolls the window or page)
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login?redirect=/messages");
    }
  }, [authLoading, isAuthenticated, router]);

  // Load all user conversations
  const loadConversations = useCallback(async (silent = false) => {
    if (!isAuthenticated) return;
    try {
      if (!silent) setLoadingConversations(true);
      const res = await api.messages.getConversations();
      if (res.success && res.data) {
        setConversations(res.data);

        // ONLY perform initial auto-selection ONCE, and NEVER on background poll
        if (!initialSelectionDoneRef.current) {
          initialSelectionDoneRef.current = true;

          if (queryHostId) {
            const match = res.data.find((c: ConversationItem) => c.other_user.id === queryHostId);
            if (match) {
              setActiveOtherUserId(match.other_user.id);
              setActivePropertyId(match.property_id || queryPropertyId || null);
              setActivePropertyName(match.property_name || queryPropertyName || null);
            } else {
              setActiveOtherUserId(queryHostId);
              setActivePropertyId(queryPropertyId || null);
              setActivePropertyName(queryPropertyName || null);
            }
          } else {
            // Only auto-open first chat on DESKTOP screens (width >= 768px),
            // NEVER on mobile screens so mobile users can view their Inbox list first!
            const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
            if (isDesktop && res.data.length > 0) {
              const first = res.data[0];
              setActiveOtherUserId(first.other_user.id);
              setActivePropertyId(first.property_id || null);
              setActivePropertyName(first.property_name || null);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  }, [isAuthenticated, queryHostId, queryPropertyId, queryPropertyName]);

  // Initial load and periodic poll for conversations
  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
      const interval = setInterval(() => loadConversations(true), 8000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loadConversations]);

  // Handle mobile back gesture/button via popstate
  useEffect(() => {
    const handlePopState = () => {
      if (activeOtherUserId && typeof window !== "undefined" && window.innerWidth < 768) {
        setActiveOtherUserId(null);
        setActivePropertyId(null);
        setActivePropertyName(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeOtherUserId]);

  const handleBackToInbox = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768 && window.history.state?.inChat) {
      window.history.back();
    } else {
      setActiveOtherUserId(null);
      setActivePropertyId(null);
      setActivePropertyName(null);
      if (queryHostId) {
        router.replace("/messages");
      }
    }
  };

  // Load message thread for active conversation
  const loadThread = async (silent = false) => {
    if (!isAuthenticated || !activeOtherUserId) return;
    try {
      if (!silent) setLoadingThread(true);
      const res = await api.messages.getThread(activeOtherUserId, activePropertyId || undefined);
      if (res.success && res.data) {
        setMessages((prev) => {
          // Prevent unnecessary state update and re-scroll if messages haven't changed
          if (
            prev.length === res.data.length &&
            prev[prev.length - 1]?.id === res.data[res.data.length - 1]?.id &&
            prev[prev.length - 1]?.is_read === res.data[res.data.length - 1]?.is_read
          ) {
            return prev;
          }
          return res.data;
        });
      }
    } catch (err) {
      console.error("Failed to load chat thread:", err);
    } finally {
      if (!silent) setLoadingThread(false);
    }
  };

  // When active conversation changes, load its thread
  useEffect(() => {
    if (activeOtherUserId) {
      setShieldWarning(null);
      prevMessageCountRef.current = 0;
      loadThread();
      const interval = setInterval(() => loadThread(true), 4000); // 4s live polling
      return () => clearInterval(interval);
    } else {
      setMessages([]);
      prevMessageCountRef.current = 0;
    }
  }, [activeOtherUserId, activePropertyId]);

  // Only scroll when message count actually changes or on initial thread load
  useEffect(() => {
    if (messages.length > 0 && messages.length !== prevMessageCountRef.current) {
      const isInitial = prevMessageCountRef.current === 0;
      // Small timeout to allow DOM to render before measuring scrollHeight
      setTimeout(() => {
        scrollToBottom(isInitial ? "auto" : "smooth");
      }, 50);
      prevMessageCountRef.current = messages.length;
    }
  }, [messages]);

  // Handle selecting a conversation from the sidebar
  const handleSelectConversation = (conv: ConversationItem) => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      window.history.pushState({ inChat: true }, "");
    }
    setActiveOtherUserId(conv.other_user.id);
    setActivePropertyId(conv.property_id || null);
    setActivePropertyName(conv.property_name || null);
    setShieldWarning(null);

    // Optimistically mark unread count as 0 for this conversation
    setConversations((prev) =>
      prev.map((c) =>
        c.other_user.id === conv.other_user.id && c.property_id === conv.property_id
          ? { ...c, unread_count: 0 }
          : c
      )
    );
  };


  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || !activeOtherUserId || sending) return;

    setShieldWarning(null);
    setInputMessage("");

    // Optimistic message in the thread
    const tempId = Date.now();
    const optimisticMsg: ChatMsg = {
      id: tempId,
      sender_id: user!.id,
      receiver_id: activeOtherUserId,
      property_id: activePropertyId,
      message: textToSend,
      is_read: false,
      created_at: new Date().toISOString(),
      sender_name: user?.full_name,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      setSending(true);
      const res = await api.messages.send({
        receiver_id: activeOtherUserId,
        property_id: activePropertyId || undefined,
        message: textToSend,
      });

      if (res.success && res.data) {
        // Replace temp optimistic message with server verified message
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? res.data : m))
        );
        // Refresh conversations to reflect latest message and ordering
        loadConversations(true);
      }
    } catch (err: any) {
      // Revert optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputMessage(textToSend);

      const errorMsg =
        err?.message ||
        err?.detail ||
        "Could not send message. Please ensure direct contact info is only shared after booking confirmation.";
      setShieldWarning(errorMsg);
    } finally {
      setSending(false);
    }
  };

  // Filter conversations based on search and tab
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchesSearch =
        c.other_user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.other_user.business_name &&
          c.other_user.business_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.property_name && c.property_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.last_message.toLowerCase().includes(searchQuery.toLowerCase());

      if (filterTab === "unread") {
        return matchesSearch && c.unread_count > 0;
      }
      return matchesSearch;
    });
  }, [conversations, searchQuery, filterTab]);

  // Find details of currently active conversation
  const activeConversation = useMemo(() => {
    return conversations.find(
      (c) => c.other_user.id === activeOtherUserId && c.property_id === activePropertyId
    ) || conversations.find((c) => c.other_user.id === activeOtherUserId);
  }, [conversations, activeOtherUserId, activePropertyId]);

  const activeHostName =
    activeConversation?.other_user.business_name ||
    activeConversation?.other_user.full_name ||
    "Gujarat Host";

  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);
  }, [conversations]);

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-stone-500">Opening Gujarat Weekend Message Box...</p>
      </div>
    );
  }

  return (
    <div className="bg-stone-50/60 min-h-[calc(100vh-80px)] py-2 sm:py-6">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        {/* Page Top Header - only show on desktop OR when inbox is showing on mobile */}
        <div className={`flex flex-wrap items-center justify-between gap-4 mb-3 sm:mb-5 ${activeOtherUserId ? "hidden md:flex" : "flex"}`}>
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">
              <Compass className="w-3.5 h-3.5" />
              <span>Gujarat Guest Communication Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight flex items-center gap-3">
              <span>My Message Box</span>
              {totalUnreadCount > 0 && (
                <span className="text-xs font-bold bg-brand-600 text-white px-2.5 py-0.5 rounded-full shadow-sm">
                  {totalUnreadCount} new {totalUnreadCount === 1 ? "reply" : "replies"}
                </span>
              )}
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/explore"
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-700 bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition-all shadow-sm"
            >
              Browse Gujarat Stays
            </Link>
            <Link
              href="/bookings"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-stone-900 hover:bg-black transition-all shadow-sm"
            >
              My Bookings
            </Link>
          </div>
        </div>

        {/* Main Messenger Container */}
        <div className="bg-white rounded-2xl md:rounded-3xl border border-stone-200 shadow-xl overflow-hidden flex flex-col md:flex-row h-[calc(100vh-190px)] min-h-[500px] md:h-[720px] md:max-h-[82vh]">
          {/* ================= LEFT SIDEBAR (CONVERSATIONS LIST) ================= */}
          <div
            className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-stone-200 bg-white min-h-0 h-full transition-all ${
              activeOtherUserId ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Sidebar Header & Search */}
            <div className="p-3.5 sm:p-4 border-b border-stone-100 space-y-3 bg-stone-50/50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-stone-500">
                  Inbox ({conversations.length})
                </span>
                <button
                  onClick={() => loadConversations()}
                  className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                  title="Refresh Conversations"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search host or property..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-stone-200 text-xs font-medium text-stone-900 focus:outline-none focus:border-brand-500 transition-colors placeholder:text-stone-400"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex p-0.5 bg-stone-200/70 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    filterTab === "all"
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  All ({conversations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("unread")}
                  className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    filterTab === "unread"
                      ? "bg-white text-brand-600 shadow-sm"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <span>Unread</span>
                  {totalUnreadCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                  )}
                </button>
              </div>
            </div>

            {/* Conversation List / Empty State */}
            <div
              className="flex-1 min-h-0 overflow-y-auto divide-y divide-stone-100 overscroll-contain"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {loadingConversations && conversations.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-stone-500 font-medium">Loading conversations...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center h-full space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-stone-900">Message Box Khali Hai</h3>
                    <p className="text-xs text-stone-500 mt-1 max-w-[220px] leading-relaxed">
                      {searchQuery
                        ? "No matching conversations found."
                        : "Jab aap kisi property ya stay ke host se connect karenge, unki chats yahan aayengi."}
                    </p>
                  </div>
                  {!searchQuery && (
                    <Link
                      href="/explore"
                      className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-md shadow-brand-500/20"
                    >
                      Explore Gujarat Stays
                    </Link>
                  )}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected =
                    activeOtherUserId === conv.other_user.id &&
                    activePropertyId === conv.property_id;

                  const displayName =
                    conv.other_user.business_name || conv.other_user.full_name;

                  return (
                    <div
                      key={conv.conversation_id || `${conv.other_user.id}_${conv.property_id}`}
                      onClick={() => handleSelectConversation(conv)}
                      className={`p-3.5 cursor-pointer transition-all flex items-start space-x-3 hover:bg-stone-50 relative ${
                        isSelected
                          ? "bg-brand-50/60 border-l-4 border-brand-600"
                          : conv.unread_count > 0
                          ? "bg-amber-50/40"
                          : ""
                      }`}
                    >
                      {/* Host / Property Thumbnail */}
                      <div className="relative flex-shrink-0">
                        {conv.property_image ? (
                          <img
                            src={conv.property_image}
                            alt={conv.property_name || "Stay"}
                            className="w-12 h-12 rounded-2xl object-cover border border-stone-200 shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-amber-500 text-white font-black text-sm flex items-center justify-center shadow-sm">
                            {displayName ? displayName[0].toUpperCase() : "H"}
                          </div>
                        )}
                        {conv.unread_count > 0 && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-brand-600 border-2 border-white" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4 className="text-xs font-extrabold text-stone-900 truncate">
                            {displayName}
                          </h4>
                          <span className="text-[10px] text-stone-400 font-medium flex-shrink-0">
                            {conv.last_message_time
                              ? new Date(conv.last_message_time).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })
                              : ""}
                          </span>
                        </div>

                        {conv.property_name && (
                          <p className="text-[11px] font-bold text-brand-600 truncate mb-1">
                            🏡 {conv.property_name}
                          </p>
                        )}

                        <p
                          className={`text-xs truncate ${
                            conv.unread_count > 0
                              ? "font-extrabold text-stone-900"
                              : "text-stone-500 font-normal"
                          }`}
                        >
                          {conv.last_message}
                        </p>
                      </div>

                      {conv.unread_count > 0 && (
                        <div className="flex-shrink-0 self-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-600 text-white">
                            {conv.unread_count}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ================= RIGHT MAIN PANEL (ACTIVE THREAD) ================= */}
          <div
            className={`fixed inset-0 z-[60] flex flex-col bg-stone-50 h-[100dvh] w-full md:static md:z-auto md:flex-1 md:h-full md:min-h-0 md:bg-white ${
              !activeOtherUserId ? "hidden md:flex" : "flex"
            }`}
          >
            {activeOtherUserId ? (
              <>
                {/* Active Chat Header */}
                <div className="flex-shrink-0 p-3 sm:p-4 border-b border-stone-200 bg-white flex items-center justify-between shadow-sm z-10">
                  <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                    {/* Mobile Back Button */}
                    <button
                      type="button"
                      onClick={handleBackToInbox}
                      className="md:hidden -ml-1 p-2 text-stone-700 hover:text-stone-900 active:bg-stone-100 rounded-xl transition-colors flex items-center justify-center flex-shrink-0"
                      title="Back to conversations list"
                      aria-label="Back to conversations list"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-brand-600 text-white font-bold flex items-center justify-center text-sm shadow-md flex-shrink-0">
                      {activeHostName[0]?.toUpperCase() || "H"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <h3 className="font-extrabold text-xs sm:text-sm text-stone-900 truncate">
                          {activeHostName}
                        </h3>
                        <span title="Verified Gujarat Host" className="flex-shrink-0">
                          <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-[10px] sm:text-[11px] text-stone-500 truncate">
                        <span className="flex-shrink-0">Gujarat Host Partner</span>
                        {activePropertyName && (
                          <>
                            <span>•</span>
                            <span className="font-bold text-brand-600 truncate">
                              {activePropertyName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                    {activePropertyId && (
                      <Link
                        href={`/property/${activePropertyId}`}
                        target="_blank"
                        className="flex items-center space-x-1 px-2.5 py-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200/80 transition-colors"
                        title="View Property Page"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">View Stay</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Safe Anti-Bypass Banner */}
                <div className="flex-shrink-0 px-3 py-2 bg-amber-50/80 border-b border-amber-200/60 text-[11px] text-amber-900 flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <p className="truncate sm:whitespace-normal">
                      <strong>Double-booking protected:</strong> Direct WhatsApp & phone contacts unlock upon confirmed booking payment.
                    </p>
                  </div>
                  <span className="hidden sm:inline-block text-[10px] font-extrabold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md flex-shrink-0 ml-2">
                    Secure Chat
                  </span>
                </div>

                {/* Messages Body */}
                <div
                  ref={chatContainerRef}
                  className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6 space-y-3.5 bg-stone-50/50 overscroll-contain"
                  style={{
                    WebkitOverflowScrolling: "touch",
                    touchAction: "pan-y",
                  }}
                >
                  {loadingThread && messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-stone-500 font-medium">Loading message history...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                      <div className="w-16 h-16 rounded-3xl bg-amber-100 text-brand-600 flex items-center justify-center shadow-inner">
                        <MessageSquare className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-base text-stone-900">
                          Start your inquiry with {activeHostName}
                        </h4>
                        <p className="text-xs text-stone-500 mt-1 max-w-sm leading-relaxed">
                          Ask questions about check-in timing, Kathiyawadi meals, private pool access, or custom group requirements.
                        </p>
                      </div>

                      {/* Quick Prompt Pills */}
                      <div className="flex flex-wrap justify-center gap-2 max-w-md pt-2">
                        {QUICK_SUGGESTIONS.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendMessage(undefined, suggestion)}
                            className="px-3 py-1.5 rounded-full bg-white border border-stone-200 hover:border-brand-500 hover:bg-brand-50 text-[11px] font-semibold text-stone-700 transition-all text-left shadow-sm"
                          >
                            + {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.sender_id === user?.id;
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
                            {!isMe && (
                              <div className="w-7 h-7 rounded-xl bg-stone-200 text-stone-700 font-extrabold text-[10px] flex items-center justify-center flex-shrink-0 shadow-sm">
                                {m.sender_name ? m.sender_name[0].toUpperCase() : "H"}
                              </div>
                            )}

                            <div
                              className={`rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed ${
                                isMe
                                  ? "bg-gradient-to-r from-brand-600 to-amber-600 text-white rounded-br-none"
                                  : "bg-white text-stone-900 border border-stone-200/80 rounded-bl-none font-medium"
                              }`}
                            >
                              {!isMe && (
                                <p className="text-[10px] font-bold text-brand-600 mb-1">
                                  {m.sender_name || activeHostName}
                                </p>
                              )}
                              <p className="whitespace-pre-line font-medium break-words">{m.message}</p>
                            </div>
                          </div>

                          {/* Timestamp & Status */}
                          <div
                            className={`flex items-center space-x-1 text-[10px] text-stone-400 mt-1 px-1 ${
                              isMe ? "justify-end" : "justify-start pl-9"
                            }`}
                          >
                            <span>
                              {m.created_at
                                ? new Date(m.created_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </span>
                            {isMe && (
                              <CheckCheck
                                className={`w-3.5 h-3.5 ${
                                  m.is_read ? "text-brand-500" : "text-stone-300"
                                }`}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Shield / Flag Warning Alert */}
                {shieldWarning && (
                  <div className="flex-shrink-0 px-4 py-2.5 bg-rose-50 border-t border-rose-200 text-rose-900 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p>{shieldWarning}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShieldWarning(null)}
                      className="text-rose-500 hover:text-rose-800 font-bold ml-1 flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Chat Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="flex-shrink-0 p-2.5 sm:p-4 bg-white border-t border-stone-200 flex items-center space-x-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
                >
                  <input
                    type="text"
                    required
                    placeholder={`Reply to ${activeHostName}...`}
                    value={inputMessage}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollToBottom("smooth");
                      }, 300);
                    }}
                    onChange={(e) => {
                      setInputMessage(e.target.value);
                      if (shieldWarning) setShieldWarning(null);
                    }}
                    className="flex-1 bg-stone-100 hover:bg-stone-100/80 focus:bg-white border border-stone-200 rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs font-semibold text-stone-900 focus:outline-none focus:border-brand-500 transition-all placeholder:text-stone-400 shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={sending || !inputMessage.trim()}
                    className="p-2.5 sm:p-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-500/25 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center flex-shrink-0"
                    title="Send Message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              // Empty State when no conversation is selected
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-brand-50 text-brand-600 flex items-center justify-center shadow-sm">
                  <MessageSquare className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900 tracking-tight">
                    Select a Conversation
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm leading-relaxed">
                    Choose a host from the left sidebar to read replies, discuss special requests, or clarify booking details.
                  </p>
                </div>
                <Link
                  href="/explore"
                  className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition-all shadow-md"
                >
                  Explore Stays & Connect with Hosts
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50" />}>
      <MessagesPageContent />
    </Suspense>
  );
}
