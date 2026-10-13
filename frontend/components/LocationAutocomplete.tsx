"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, X, Loader2, Compass } from "lucide-react";
import { api } from "@/lib/api";

export interface GujaratLocation {
  id: number;
  name: string;
  slug: string;
  type?: string;
  taluka?: string | null;
  district?: string | null;
  state: string;
  country: string;
  display_name?: string;
  subtitle?: string;
  properties_count?: number;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, location?: GujaratLocation | null) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
  variant?: "hero" | "filter" | "form";
  onSelectLocation?: (location: GujaratLocation) => void;
}

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = "Search Gujarat destination, city, taluka...",
  label,
  className = "",
  inputClassName = "",
  disabled = false,
  required = false,
  variant = "filter",
  onSelectLocation,
}: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value || "");
  const [suggestions, setSuggestions] = useState<GujaratLocation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with external value changes
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions with 300ms debounce
  const fetchSuggestions = (query: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(false);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.locations.search(trimmed, 10);
        if (res.success && Array.isArray(res.data)) {
          setSuggestions(res.data);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error("Failed to search Gujarat locations:", err);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
        setHasSearched(true);
      }
    }, 300);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val, null);
    setIsOpen(true);
    setSelectedIndex(-1);
    fetchSuggestions(val);
  };

  const handleSelect = (loc: GujaratLocation) => {
    setInputValue(loc.name);
    onChange(loc.name, loc);
    if (onSelectLocation) {
      onSelectLocation(loc);
    }
    setIsOpen(false);
    setSuggestions([]);
    setHasSearched(false);
  };

  const handleClear = () => {
    setInputValue("");
    onChange("", null);
    setSuggestions([]);
    setIsOpen(false);
    setHasSearched(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Helper for type badges
  const formatType = (type?: string) => {
    if (!type) return "Gujarat";
    switch (type.toLowerCase()) {
      case "district":
        return "District";
      case "tourist":
        return "Tourist Destination";
      case "city":
        return "City";
      case "town":
        return "Town";
      case "taluka":
        return "Taluka";
      case "village":
        return "Village";
      case "locality":
        return "Locality";
      default:
        return "Gujarat";
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <MapPin
          className={`absolute left-3.5 w-4 h-4 pointer-events-none transition-colors ${
            isOpen ? "text-brand-600" : "text-stone-400"
          }`}
        />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (inputValue.trim()) {
              setIsOpen(true);
              if (suggestions.length === 0 && !hasSearched) {
                fetchSuggestions(inputValue);
              }
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete="off"
          className={
            inputClassName ||
            (variant === "hero"
              ? "w-full pl-10 pr-9 py-2 bg-transparent text-sm font-bold text-stone-800 placeholder-stone-400 focus:outline-none cursor-text"
              : variant === "form"
              ? "w-full pl-10 pr-9 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              : "w-full pl-10 pr-9 py-3 rounded-2xl border border-stone-200 text-sm font-bold text-stone-800 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all")
          }
        />

        {/* Loading Spinner or Clear Button */}
        <div className="absolute right-3 flex items-center">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />
          ) : inputValue ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
              title="Clear location"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-stone-200/90 overflow-hidden max-h-72 overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Header indicator */}
          <div className="px-3.5 py-2 bg-stone-50 border-b border-stone-100 flex items-center justify-between text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            <span className="flex items-center space-x-1.5">
              <Compass className="w-3.5 h-3.5 text-brand-600" />
              <span>Gujarat, India Locations</span>
            </span>
            {suggestions.length > 0 && <span>{suggestions.length} matches</span>}
          </div>

          {suggestions.length > 0 ? (
            <ul className="divide-y divide-stone-100 py-1" role="listbox">
              {suggestions.map((loc, idx) => {
                const isSelected = idx === selectedIndex;
                const subtitle =
                  loc.subtitle ||
                  [loc.taluka, loc.district, "Gujarat"].filter(Boolean).join(", ");

                return (
                  <li
                    key={loc.id || `${loc.name}-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(loc)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`px-4 py-3 cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-brand-50/80 text-brand-950"
                        : "hover:bg-stone-50 text-stone-800"
                    }`}
                  >
                    <div className="flex items-start space-x-3 min-w-0 pr-2">
                      <div
                        className={`p-2 rounded-xl mt-0.5 flex-shrink-0 ${
                          isSelected ? "bg-brand-500 text-white" : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-stone-900 tracking-tight truncate">
                            {loc.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 uppercase tracking-wider flex-shrink-0">
                            {formatType(loc.type)}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 truncate mt-0.5 font-medium">
                          {subtitle}
                        </p>
                      </div>
                    </div>

                    {loc.properties_count !== undefined && loc.properties_count > 0 && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg flex-shrink-0 border border-emerald-200/60">
                        {loc.properties_count} stay{loc.properties_count > 1 ? "s" : ""}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : hasSearched && !isLoading ? (
            <div className="p-6 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <MapPin className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-stone-800">
                No Gujarat locations found
              </p>
              <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                Search is restricted to Gujarat, India. Locations outside Gujarat (like Mumbai, Delhi, Jaipur) are not supported.
              </p>
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-stone-400 font-medium">
              Type to search any district, city, town, taluka or tourist spot in Gujarat...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
