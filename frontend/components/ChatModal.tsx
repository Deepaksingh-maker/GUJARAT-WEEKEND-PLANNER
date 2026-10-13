"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { X, Send, ShieldCheck, MessageCircle, Clock, Building2, User, AlertTriangle, Lock, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostUserId: number;
  hostName: string;
  hostType?: string;
  propertyId?: number;
  propertyName?: string;
  bookingId?: number;
}

export default function ChatModal({
  isOpen,
  onClose,
  hostUserId,
  hostName,
  hostType,
  propertyId,
  propertyName,
  bookingId,
}: ChatModalProps) {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [shieldWarning, setShieldWarning] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  const loadThread = async () => {
    if (!isAuthenticated || !hostUserId) return;
    try {
      setLoading(true);
      const res = await api.messages.getThread(hostUserId, propertyId);
      if (res.success && res.data) {
        setMessages((prev) => {
          if (
            prev.length === res.data.length &&
            prev[prev.length - 1]?.id === res.data[res.data.length - 1]?.id
          ) {
            return prev;
          }
          return res.data;
        });
      }
    } catch (err) {
      console.error("Failed to load chat messages", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setShieldWarning(null);
      prevMsgCountRef.current = 0;
      loadThread();
      const interval = setInterval(loadThread, 5000); // 5s poll while modal is open
      return () => clearInterval(interval);
    }
  }, [isOpen, hostUserId, propertyId]);

  useEffect(() => {
    if (messages.length > 0 && messages.length !== prevMsgCountRef.current) {
      const isInitial = prevMsgCountRef.current === 0;
      setTimeout(() => {
        scrollToBottom(isInitial ? "auto" : "smooth");
      }, 50);
      prevMsgCountRef.current = messages.length;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const text = inputMessage.trim();
    setShieldWarning(null);

    // Optimistic message
    const tempId = Date.now();
    const optimisticMsg = {
      id: tempId,
      sender_id: user?.id,
      receiver_id: hostUserId,
      property_id: propertyId,
      booking_id: bookingId,
      message: text,
      created_at: new Date().toISOString(),
      sender_name: user?.full_name,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputMessage("");

    try {
      setSending(true);
      const res = await api.messages.send({
        receiver_id: hostUserId,
        property_id: propertyId,
        booking_id: bookingId,
        message: text,
      });

      if (res.success && res.data) {
        // If message was masked by server in standard mode
        if (res.data.is_flagged) {
          setShieldWarning("Direct contact details were automatically masked. Direct phone & WhatsApp unlock after booking confirmation.");
        }
        setTimeout(loadThread, 500);
      }
    } catch (err: any) {
      // Revert optimistic message on error (such as anti-bypass strict block)
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputMessage(text);
      const errMsg = err?.message || "Direct contact information cannot be shared before the booking is confirmed. Please continue the conversation through the platform.";
      setShieldWarning(errMsg);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col h-[580px]">
        {/* Modal Header */}
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center text-white font-bold shadow-md">
              {hostName ? hostName[0] : "H"}
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="font-extrabold text-sm">{hostName}</h3>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-[11px] text-stone-300">
                {hostType ? hostType.replace("_", " ") : "Verified Host"}
                {propertyName ? ` • ${propertyName}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Link
              href={`/messages?host_id=${hostUserId}&property_id=${propertyId || ""}&property_name=${encodeURIComponent(propertyName || "")}`}
              onClick={onClose}
              className="p-1.5 px-2.5 text-stone-300 hover:text-white hover:bg-stone-800 rounded-xl transition-colors flex items-center space-x-1 text-xs font-semibold"
              title="Open full Message Box"
            >
              <ExternalLink className="w-3.5 h-3.5 text-brand-400" />
              <span className="hidden sm:inline">Message Box</span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security Policy Strip */}
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-[11px] text-emerald-900 font-semibold">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span>Platform Protected Chat • Host phone & WhatsApp unlock after confirmed booking</span>
          </div>
        </div>

        {/* Message Thread Body */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50">
          {loading && messages.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400 animate-pulse">
              Loading conversation...
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-stone-200 mx-auto flex items-center justify-center text-brand-600">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-stone-800">Direct Message with Host</h4>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                Ask about availability, private pool rules, check-in times, or Gujarati/Jain dining.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.sender_id === user?.id;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                      isMe
                        ? "bg-brand-600 text-white rounded-br-none"
                        : "bg-white text-stone-800 border border-stone-200/80 rounded-bl-none"
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed font-medium">{m.message}</p>
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1 px-1">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Anti-Bypass Warning Alert */}
        {shieldWarning && (
          <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-200 text-amber-900 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{shieldWarning}</p>
            </div>
            <button
              type="button"
              onClick={() => setShieldWarning(null)}
              className="text-amber-500 hover:text-amber-800 font-bold ml-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Input Footer */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-white border-t border-stone-200 flex items-center space-x-2"
        >
          <input
            type="text"
            required
            placeholder={`Ask ${hostName} anything about this stay...`}
            value={inputMessage}
            onChange={(e) => {
              setInputMessage(e.target.value);
              if (shieldWarning) setShieldWarning(null);
            }}
            className="flex-1 bg-stone-100 border border-stone-200/80 rounded-2xl px-4 py-2.5 text-xs font-semibold text-stone-900 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <button
            type="submit"
            disabled={sending || !inputMessage.trim()}
            className="p-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-500/25 active:scale-95 transition-all disabled:opacity-40"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
