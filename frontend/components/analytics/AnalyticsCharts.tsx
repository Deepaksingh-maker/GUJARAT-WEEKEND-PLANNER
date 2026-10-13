"use client";

import React, { useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Building, 
  Users, 
  CheckCircle, 
  Clock, 
  XCircle,
  MapPin,
  Sparkles,
  Info
} from "lucide-react";

// Format currency helper
export const formatRupee = (amount: number = 0): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

// 1. KPI Stat Metric Card
interface StatMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  icon: React.ReactNode;
  accentColor?: "emerald" | "blue" | "purple" | "amber" | "rose" | "teal";
}

export function StatMetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  accentColor = "emerald",
}: StatMetricCardProps) {
  const colorStyles = {
    emerald: "from-emerald-500/10 to-teal-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    blue: "from-blue-500/10 to-cyan-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20",
    purple: "from-purple-500/10 to-pink-500/5 text-purple-600 dark:text-purple-400 border-purple-500/20",
    amber: "from-amber-500/10 to-orange-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20",
    rose: "from-rose-500/10 to-red-500/5 text-rose-600 dark:text-rose-400 border-rose-500/20",
    teal: "from-teal-500/10 to-emerald-500/5 text-teal-600 dark:text-teal-400 border-teal-500/20",
  };

  const iconBgStyles = {
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300",
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300",
    rose: "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300",
    teal: "bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-300",
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 bg-gradient-to-br bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 ${colorStyles[accentColor]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconBgStyles[accentColor]}`}>
          {icon}
        </div>
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-1.5 text-xs font-medium">
          <span
            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full ${
              trend.isPositive
                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
            }`}
          >
            {trend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value > 0 ? `+${trend.value}%` : `${trend.value}%`}
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            {trend.label || "vs last period"}
          </span>
        </div>
      )}
    </div>
  );
}

// 2. Interactive SVG Revenue & Earnings Area Chart
export interface TimelineDataPoint {
  month: string;
  revenue: number;
  secondary?: number; // e.g. platform commission or host earnings
  bookings?: number;
}

interface RevenueAreaChartProps {
  title: string;
  subtitle?: string;
  data: TimelineDataPoint[];
  primaryLabel?: string;
  secondaryLabel?: string;
  colorScheme?: "emerald" | "blue" | "purple";
}

export function RevenueAreaChart({
  title,
  subtitle,
  data = [],
  primaryLabel = "Total Revenue",
  secondaryLabel = "Platform Fee (10%)",
  colorScheme = "emerald",
}: RevenueAreaChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-8 text-center text-slate-500">
        No timeline data available
      </div>
    );
  }

  // Chart Dimensions
  const width = 720;
  const height = 280;
  const padding = { top: 25, right: 30, bottom: 45, left: 65 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Max value calculation
  const maxPrimary = Math.max(...data.map((d) => d.revenue), 1000);
  const maxVal = Math.ceil(maxPrimary * 1.15); // headroom

  // Coordinate mappings
  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + chartW / 2;
    return padding.left + (index / (data.length - 1)) * chartW;
  };

  const getY = (val: number) => {
    return padding.top + chartH - (val / maxVal) * chartH;
  };

  // Generate smooth SVG bezier path
  const makeSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i != pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const primaryPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.revenue) }));
  const primaryLinePath = makeSmoothPath(primaryPoints);
  const primaryAreaPath = `${primaryLinePath} L ${getX(data.length - 1)} ${padding.top + chartH} L ${getX(0)} ${padding.top + chartH} Z`;

  // Secondary curve if secondary data exists
  const hasSecondary = data.some((d) => (d.secondary ?? 0) > 0);
  const secondaryPoints = hasSecondary
    ? data.map((d, i) => ({ x: getX(i), y: getY(d.secondary || 0) }))
    : [];
  const secondaryLinePath = hasSecondary ? makeSmoothPath(secondaryPoints) : "";

  // Grid lines (4 steps)
  const yTicks = [0, 0.33, 0.66, 1].map((ratio) => ({
    val: Math.round(maxVal * ratio),
    y: padding.top + chartH - ratio * chartH,
  }));

  const activePoint = hoveredIdx !== null ? data[hoveredIdx] : data[data.length - 1];
  const activeX = hoveredIdx !== null ? getX(hoveredIdx) : getX(data.length - 1);
  const activeY = hoveredIdx !== null ? getY(data[hoveredIdx].revenue) : getY(data[data.length - 1].revenue);

  // Gradient themes
  const colorMap = {
    emerald: {
      line: "#10b981",
      secLine: "#3b82f6",
      fillStart: "rgba(16, 185, 129, 0.35)",
      fillEnd: "rgba(16, 185, 129, 0.0)",
      dot: "#059669",
    },
    blue: {
      line: "#3b82f6",
      secLine: "#8b5cf6",
      fillStart: "rgba(59, 130, 246, 0.35)",
      fillEnd: "rgba(59, 130, 246, 0.0)",
      dot: "#2563eb",
    },
    purple: {
      line: "#8b5cf6",
      secLine: "#ec4899",
      fillStart: "rgba(139, 92, 246, 0.35)",
      fillEnd: "rgba(139, 92, 246, 0.0)",
      dot: "#7c3aed",
    },
  };
  const theme = colorMap[colorScheme];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{title}</span>
            <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              Live Flow
            </span>
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.line }}></span>
            <span className="text-slate-600 dark:text-slate-300">{primaryLabel}</span>
          </div>
          {hasSecondary && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.secLine }}></span>
              <span className="text-slate-600 dark:text-slate-300">{secondaryLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id={`revGrad-${colorScheme}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.fillStart} />
              <stop offset="100%" stopColor={theme.fillEnd} />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={theme.line} floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Grid lines and Y axis labels */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={width - padding.right}
                y2={tick.y}
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800/80"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={tick.y + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-400 dark:fill-slate-500 font-medium"
              >
                ₹{tick.val >= 1000 ? `${(tick.val / 1000).toFixed(0)}k` : tick.val}
              </text>
            </g>
          ))}

          {/* Area Fill */}
          <path d={primaryAreaPath} fill={`url(#revGrad-${colorScheme})`} />

          {/* Secondary Line */}
          {hasSecondary && (
            <path
              d={secondaryLinePath}
              fill="none"
              stroke={theme.secLine}
              strokeWidth="2"
              strokeDasharray="4 3"
              opacity="0.8"
            />
          )}

          {/* Primary Trend Line */}
          <path
            d={primaryLinePath}
            fill="none"
            stroke={theme.line}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Hover Column Guide Line */}
          {hoveredIdx !== null && (
            <line
              x1={activeX}
              y1={padding.top}
              x2={activeX}
              y2={padding.top + chartH}
              stroke="currentColor"
              className="text-slate-400 dark:text-slate-500"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
          )}

          {/* Interactive Point Hotspots & Dots */}
          {data.map((d, i) => {
            const x = getX(i);
            const y = getY(d.revenue);
            const isHovered = hoveredIdx === i || (hoveredIdx === null && i === data.length - 1);
            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 4}
                  fill="#ffffff"
                  stroke={theme.line}
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-200"
                />
                {/* Invisible hover zone */}
                <rect
                  x={x - (chartW / (data.length * 2))}
                  y={padding.top}
                  width={chartW / data.length}
                  height={chartH}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
                {/* X Axis Month Label */}
                <text
                  x={x}
                  y={padding.top + chartH + 22}
                  textAnchor="middle"
                  className={`text-[11px] font-medium transition-colors ${
                    isHovered
                      ? "fill-slate-900 dark:fill-white font-bold"
                      : "fill-slate-400 dark:fill-slate-500"
                  }`}
                >
                  {d.month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Indicator */}
        {activePoint && (
          <div className="mt-3 flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 dark:text-white">
                {activePoint.month}:
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                {formatRupee(activePoint.revenue)}
              </span>
              {activePoint.secondary !== undefined && (
                <span className="text-slate-500 dark:text-slate-400">
                  • {secondaryLabel}: <span className="font-medium text-slate-700 dark:text-slate-300">{formatRupee(activePoint.secondary)}</span>
                </span>
              )}
            </div>
            {activePoint.bookings !== undefined && (
              <span className="px-2.5 py-1 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium">
                {activePoint.bookings} bookings
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 3. Status Donut / Ring Chart
export interface DonutSlice {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

interface DonutChartProps {
  title: string;
  subtitle?: string;
  totalCount: number;
  centerLabel?: string;
  slices: DonutSlice[];
}

export function DonutChart({
  title,
  subtitle,
  totalCount,
  centerLabel = "Bookings",
  slices = [],
}: DonutChartProps) {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  // SVG parameters
  const size = 200;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-4">
        {/* Ring Chart */}
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg width={size} height={size} className="w-full h-full -rotate-90">
            {/* Background track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="transparent"
              className="text-slate-100 dark:text-slate-800"
            />
            {/* Slices */}
            {slices.map((slice, i) => {
              const dashLength = (slice.percentage / 100) * circumference;
              const strokeDashoffset = -(accumulatedPercent / 100) * circumference;
              accumulatedPercent += slice.percentage;

              const isHighlighted = hoveredSlice === slice.label;

              return (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={slice.color}
                  strokeWidth={isHighlighted ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${dashLength} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  fill="transparent"
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredSlice(slice.label)}
                  onMouseLeave={() => setHoveredSlice(null)}
                />
              );
            })}
          </svg>

          {/* Donut Center Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {totalCount}
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {centerLabel}
            </span>
          </div>
        </div>

        {/* Legend list */}
        <div className="flex-1 w-full space-y-2">
          {slices.map((slice, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredSlice(slice.label)}
              onMouseLeave={() => setHoveredSlice(null)}
              className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                hoveredSlice === slice.label
                  ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 scale-[1.02]"
                  : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {slice.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-900 dark:text-white">{slice.count}</span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  ({slice.percentage}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 4. Horizontal Ranking Bar Chart (for Cities or Properties)
export interface RankingItem {
  id?: number | string;
  name: string;
  category?: string;
  revenue: number;
  bookings?: number;
  percentage?: number;
  color?: string;
}

interface RankingBarChartProps {
  title: string;
  subtitle?: string;
  items: RankingItem[];
  emptyMessage?: string;
  icon?: React.ReactNode;
}

export function RankingBarChart({
  title,
  subtitle,
  items = [],
  emptyMessage = "No ranking data yet",
  icon,
}: RankingBarChartProps) {
  const maxRevenue = Math.max(...items.map((it) => it.revenue), 1);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {icon && <span className="text-emerald-500">{icon}</span>}
            <span>{title}</span>
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-sm">{emptyMessage}</div>
      ) : (
        <div className="space-y-3.5">
          {items.map((item, idx) => {
            const barWidth = Math.max(Math.round((item.revenue / maxRevenue) * 100), 4);
            const rank = idx + 1;
            const rankBadgeColor =
              rank === 1
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300"
                : rank === 2
                ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                : rank === 3
                ? "bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400";

            return (
              <div key={item.id || idx} className="group">
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`w-5 h-5 flex items-center justify-center rounded-md text-[10px] font-bold border ${rankBadgeColor}`}
                    >
                      {rank}
                    </span>
                    <span className="truncate text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 transition-colors">
                      {item.name}
                    </span>
                    {item.category && (
                      <span className="hidden sm:inline-block text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatRupee(item.revenue)}
                    </span>
                    {item.bookings !== undefined && (
                      <span className="text-[11px] text-slate-400 font-normal">
                        ({item.bookings} bks)
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 group-hover:from-emerald-400 group-hover:to-teal-300"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 5. Weekend vs Weekday Surge Comparison Widget
interface WeekendComparisonProps {
  weekend: { count: number; revenue: number };
  weekday: { count: number; revenue: number };
  weekendSharePct: number;
}

export function WeekendSurgeCard({
  weekend,
  weekday,
  weekendSharePct,
}: WeekendComparisonProps) {
  const totalBks = weekend.count + weekday.count || 1;
  const weekendPct = Math.round((weekend.count / totalBks) * 100);
  const weekdayPct = 100 - weekendPct;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>Weekend vs Weekday Demand</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gujarat getaway booking preferences
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300">
          {weekendSharePct}% Weekend Dominance
        </span>
      </div>

      {/* Dual Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs font-semibold mb-1.5">
          <span className="text-emerald-600 dark:text-emerald-400">
            Fri - Sun (Weekend): {weekendPct}% ({weekend.count} bookings)
          </span>
          <span className="text-blue-600 dark:text-blue-400">
            Mon - Thu (Weekday): {weekdayPct}% ({weekday.count} bookings)
          </span>
        </div>
        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
            style={{ width: `${weekendPct}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-500"
            style={{ width: `${weekdayPct}%` }}
          />
        </div>
      </div>

      {/* Revenue comparison pills */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
          <p className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
            Weekend Revenue
          </p>
          <p className="text-base font-bold text-emerald-900 dark:text-emerald-100 mt-0.5">
            {formatRupee(weekend.revenue)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40">
          <p className="text-[11px] font-medium text-blue-800 dark:text-blue-300">
            Weekday Revenue
          </p>
          <p className="text-base font-bold text-blue-900 dark:text-blue-100 mt-0.5">
            {formatRupee(weekday.revenue)}
          </p>
        </div>
      </div>
    </div>
  );
}

// 6. Property Category Distribution Grid
export interface CategoryMetric {
  type: string;
  revenue: number;
  count: number;
}

export function CategoryDistributionGrid({
  categories = [],
}: {
  categories: CategoryMetric[];
}) {
  const totalRev = categories.reduce((sum, c) => sum + c.revenue, 0) || 1;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Building className="w-5 h-5 text-purple-500" />
          <span>Category Performance</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Revenue generated by property stay type
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {categories.map((cat, i) => {
          const share = Math.round((cat.revenue / totalRev) * 100);
          return (
            <div
              key={i}
              className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:border-purple-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold capitalize text-slate-700 dark:text-slate-300">
                  {cat.type}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300">
                  {share}%
                </span>
              </div>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                {formatRupee(cat.revenue)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {cat.count} total bookings
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
