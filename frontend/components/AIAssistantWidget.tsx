"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  Bot, Sparkles, X, Send, Compass, MapPin, 
  ChevronRight, RefreshCw, MessageSquare 
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  links?: { title: string; url: string }[];
  time: string;
}

const QUICK_PROMPTS = [
  "🦁 Best Gir lion safari & villa stay",
  "🌧️ Saputara monsoon weekend guide",
  "🏊 Villas with private pool near Ahmedabad",
  "🏰 Polo Forest camping & heritage trek",
  "⛺ Statue of Unity / Ekta Nagar tips"
];

// Rich local intelligence for Gujarat destinations
const AI_KNOWLEDGE: { keywords: string[]; response: string; links?: { title: string; url: string }[] }[] = [
  {
    keywords: ["gir", "lion", "safari", "sasan"],
    response: "🦁 **Gir National Park & Sasan Gir Guide:**\n\n• **Safari Bookings:** Gir Jungle Safari & Devalia Safari Park permits must be booked on the official forest department portal in advance.\n• **Best Season:** October to May (peak lion sightings).\n• **Recommended Stays:** Mango orchard farmhouses and luxury river retreats.\n• **Food:** Authentic Kathiyawadi dining (Bajra no rotlo, ringna no olo, and fresh Chaas).",
    links: [
      { title: "Explore Stays in Sasan Gir", url: "/explore?location=sasan-gir" },
      { title: "Browse Wildlife Activities", url: "/activities" }
    ]
  },
  {
    keywords: ["saputara", "hill", "hills", "waterfall"],
    response: "🌧️ **Saputara Weekend Getaway (Dang District):**\n\n• **Vibe:** Gujarat's premier hill station with lush green plateaus and rolling clouds.\n• **Top Attractions:** Table Point ropeway, Saputara Lake boating, Sunset Point, and Gira Waterfalls.\n• **Driving Time:** ~4.5 hours from Surat, ~7.5 hours from Ahmedabad.\n• **Stay Tips:** Book cliff-view villas or wooden valley cottages.",
    links: [
      { title: "Explore Saputara Stays", url: "/explore?location=saputara" }
    ]
  },
  {
    keywords: ["polo", "forest", "harnav", "ruins"],
    response: "🏰 **Polo Forest Escape (Vijaynagar):**\n\n• **Vibe:** Ancient 15th-century Jain & Shiva temple ruins nestled along the Harnav River.\n• **Best Time:** July to February when river streams flow through dense teak forests.\n• **Distance:** 150 km from Ahmedabad (~3.5 hrs drive).\n• **Activity:** Great for nature photography, rock trekking, and eco-campsites.",
    links: [
      { title: "Polo Forest Retreats", url: "/explore?location=polo-forest" }
    ]
  },
  {
    keywords: ["pool", "private pool", "farmhouse", "villa", "sanand"],
    response: "🏊 **Private Pool Villas & Farmhouses:**\n\n• We have hand-verified private villas featuring private pools, party lawns, and badminton courts.\n• **Popular Hubs:** Sanand, Bavla, and Mehsana (all within 45–90 mins drive from Ahmedabad/Gandhinagar).\n• **Perks:** Exclusive privacy, DJ-friendly speaker setups, and in-house cook options.",
    links: [
      { title: "View Private Pool Stays", url: "/explore?pool=true" }
    ]
  },
  {
    keywords: ["statue", "unity", "sou", "ekta nagar", "narmada", "tent city"],
    response: "⛺ **Statue of Unity & Ekta Nagar:**\n\n• **Must-See:** The 182-meter tall monument, Viewing Gallery, Jungle Safari, Laser Show at 7 PM, and Valley of Flowers.\n• **Drive:** ~2.5 hrs from Vadodara, ~4 hrs from Ahmedabad/Surat.\n• **Stay:** Premium glamping tents or riverside cottages along the Narmada River.",
    links: [
      { title: "Explore Ekta Nagar Stays", url: "/explore?location=ekta-nagar" }
    ]
  },
  {
    keywords: ["kutch", "rann", "bhuj", "desert", "mandvi"],
    response: "🌊 **Kutch & White Rann:**\n\n• **White Desert:** Visit during Full Moon nights during Rann Utsav (Nov to Feb) for the magical salt expanse.\n• **Mandvi Beach:** Coastal retreats, camel rides, and Vijay Vilas heritage palace.\n• **Handicrafts:** Rogan art in Nirona, Ajrakh block prints, and mirror embroidery in Bhujodi.",
    links: [
      { title: "Explore Kutch Getaways", url: "/explore?location=kutch" }
    ]
  },
  {
    keywords: ["food", "jain", "swaminarayan", "veg", "vegetarian"],
    response: "🍲 **Food & Dining Across Gujarat Stays:**\n\n• **100% Pure Vegetarian:** Most properties in our Gujarat network offer dedicated pure vegetarian kitchens.\n• **Jain & Swaminarayan Options:** Onion/garlic-free meals are available upon host request when booking.\n• **Local Delicacies:** Undhiyu, Sev Usal, Gujarati Thali, and Dal Baati available at farmhouses.",
    links: [
      { title: "Find Family-Friendly Stays", url: "/explore" }
    ]
  }
];

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial-welcome",
      sender: "ai",
      text: "Namaste! 🙏 I am your **Gujarat Weekend AI Guide**.\n\nI can help you find verified villas with private pools, planned itineraries, safari tips for Sasan Gir, or monsoon getaways in Saputara.\n\nWhere would you like to travel?",
      time: "Just now"
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const generateAIResponse = (userQuery: string) => {
    const lower = userQuery.toLowerCase();
    for (const item of AI_KNOWLEDGE) {
      if (item.keywords.some((k) => lower.includes(k))) {
        return { text: item.response, links: item.links };
      }
    }

    return {
      text: `That sounds like a wonderful plan! We have curated villas, resorts, and camping retreats across **Saputara, Sasan Gir, Polo Forest, Kutch, and Ekta Nagar**.\n\nCheck out our interactive Weekend Planner to generate a custom itinerary with drive times, or explore stays directly:`,
      links: [
        { title: "Generate Custom Itinerary", url: "/weekend-planner" },
        { title: "Browse All Stays", url: "/explore" }
      ]
    };
  };

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: "user",
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const responseData = generateAIResponse(query);
      const aiMsg: Message = {
        id: String(Date.now() + 1),
        sender: "ai",
        text: responseData.text,
        links: responseData.links,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, aiMsg]);
    }, 700);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-16 md:bottom-6 right-3 sm:right-5 z-30">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="group relative flex items-center space-x-2 px-3.5 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-brand-600 via-amber-500 to-brand-500 text-white rounded-full shadow-xl shadow-brand-500/30 hover:scale-105 active:scale-95 transition-all border border-white/20"
          aria-label="Open AI Weekend Assistant"
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200 animate-spin-slow" />
            <span className="absolute -top-1 -right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
          </div>
          <span className="font-extrabold text-[11px] sm:text-xs tracking-wide">
            {isOpen ? "Close Guide" : "AI Travel Guide"}
          </span>
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-16 md:bottom-20 right-2 sm:right-6 z-50 w-[calc(100vw-1rem)] sm:w-[410px] h-[75vh] max-h-[520px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-stone-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white flex items-center justify-between border-b border-stone-800">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-brand-500 to-amber-400 flex items-center justify-center text-white shadow-md">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-extrabold text-sm">Gujarat Weekend AI</h3>
                  <span className="px-1.5 py-0.2 bg-brand-500/30 text-brand-300 text-[9px] font-bold rounded uppercase">
                    GJ Guide
                  </span>
                </div>
                <p className="text-[11px] text-stone-400">Instant trip recommendations & stay advice</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Prompt Chips */}
          <div className="p-2.5 bg-stone-50 border-b border-stone-100 flex items-center space-x-1.5 overflow-x-auto no-scrollbar text-[11px]">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(prompt)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white border border-stone-200 hover:border-brand-500 hover:text-brand-600 text-stone-700 font-semibold shadow-xs transition-colors flex-shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-stone-50/50">
            {messages.map((m) => {
              const isMe = m.sender === "user";
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                      isMe
                        ? "bg-brand-600 text-white rounded-br-none"
                        : "bg-white text-stone-800 border border-stone-200/80 rounded-bl-none"
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.text}</p>

                    {m.links && m.links.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-stone-100 space-y-1.5">
                        <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider block">
                          Suggested Stays:
                        </span>
                        {m.links.map((link, lIdx) => (
                          <Link
                            key={lIdx}
                            href={link.url}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-between p-2 rounded-xl bg-brand-50/60 hover:bg-brand-100/70 border border-brand-200/60 text-brand-700 font-bold transition-colors"
                          >
                            <span>{link.title}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1 px-1">{m.time}</span>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center space-x-1.5 p-3 rounded-2xl bg-white border border-stone-200 max-w-[100px]">
                <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-stone-200 flex items-center space-x-2"
          >
            <input
              type="text"
              placeholder="Ask about Saputara, Gir, pool villas..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-stone-100 border border-stone-200/80 rounded-2xl px-4 py-2.5 text-xs font-semibold text-stone-900 focus:outline-none focus:border-brand-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-500/25 active:scale-95 transition-all disabled:opacity-40"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
