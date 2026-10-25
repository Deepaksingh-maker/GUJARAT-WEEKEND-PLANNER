"use client";

import React, { useEffect, useState, useRef } from "react";

interface AnimatedCounterProps {
  value: number | string;
  duration?: number; // ms, default 1200
  prefix?: string; // e.g. "₹"
  suffix?: string; // e.g. "%" or " stays"
  decimals?: number; // default auto-detected or 0
  formatAsCurrency?: boolean;
  className?: string;
}

// Ease-out expo: snappy start, smooth decelerating landing
const easeOutExpo = (t: number): number => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1200,
  prefix = "",
  suffix = "",
  decimals,
  formatAsCurrency = false,
  className = "",
}) => {
  // Parse numeric target from value (handles "₹7,77,375.64", "48%", or raw number 103)
  const parseTarget = (val: number | string): { num: number; detectedDecimals: number; detectedPrefix: string; detectedSuffix: string } => {
    if (typeof val === "number") {
      const dec = val % 1 !== 0 ? (val.toString().split(".")[1]?.length || 2) : 0;
      return { num: val, detectedDecimals: Math.min(dec, 2), detectedPrefix: "", detectedSuffix: "" };
    }
    const str = String(val).trim();
    let detectedP = "";
    let detectedS = "";
    if (str.startsWith("₹")) detectedP = "₹";
    if (str.endsWith("%")) detectedS = "%";

    // Clean out currency, commas, %, and whitespace
    const cleaned = str.replace(/[₹,\s%]/g, "");
    const parsed = parseFloat(cleaned);
    const num = isNaN(parsed) ? 0 : parsed;
    const dec = cleaned.includes(".") ? (cleaned.split(".")[1]?.length || 2) : 0;
    return { num, detectedDecimals: Math.min(dec, 2), detectedPrefix: detectedP, detectedSuffix: detectedS };
  };

  const targetInfo = parseTarget(value);
  const targetNumber = targetInfo.num;
  const activeDecimals = decimals !== undefined ? decimals : targetInfo.detectedDecimals;
  const activePrefix = prefix || targetInfo.detectedPrefix;
  const activeSuffix = suffix || targetInfo.detectedSuffix;
  const isCurrency = formatAsCurrency || activePrefix === "₹";

  const [displayValue, setDisplayValue] = useState<number>(0);
  const prevValueRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const startVal = prevValueRef.current;
    const endVal = targetNumber;
    const diff = endVal - startVal;

    if (diff === 0) {
      setDisplayValue(endVal);
      return;
    }

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      const current = startVal + diff * eased;

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
        prevValueRef.current = endVal;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [targetNumber, duration]);

  // Format using Indian grouping
  const formatNumber = (num: number): string => {
    if (activeDecimals > 0) {
      return num.toLocaleString("en-IN", {
        minimumFractionDigits: activeDecimals,
        maximumFractionDigits: activeDecimals,
      });
    }
    return Math.round(num).toLocaleString("en-IN");
  };

  return (
    <span className={`inline-block tabular-nums transition-colors duration-200 ${className}`}>
      {activePrefix}
      {formatNumber(displayValue)}
      {activeSuffix}
    </span>
  );
};

export default AnimatedCounter;
