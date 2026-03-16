"use client";

import { useMemo, useState } from "react";
import { MarketPricePoint } from "@/lib/types";

interface MarketHistoryChartProps {
  history: MarketPricePoint[];
}

type ChartRange = "1D" | "1W" | "1M" | "ALL";

const RANGES: ChartRange[] = ["1D", "1W", "1M", "ALL"];

const RANGE_TO_MS: Record<Exclude<ChartRange, "ALL">, number> = {
  "1D": 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000
};

const buildPricePath = (points: MarketPricePoint[], width: number, height: number): string => {
  if (points.length === 0) {
    return "";
  }

  const prices = points.map((point) => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = Math.max(maxPrice - minPrice, 0.001);

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((point.price - minPrice) / range) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
};

const buildAreaPath = (points: MarketPricePoint[], width: number, height: number): string => {
  if (points.length === 0) {
    return "";
  }

  return `${buildPricePath(points, width, height)} L ${width},${height} L 0,${height} Z`;
};

const formatDate = (value: string): string => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const MarketHistoryChart = ({ history }: MarketHistoryChartProps) => {
  const [range, setRange] = useState<ChartRange>("1W");

  const filteredHistory = useMemo(() => {
    if (history.length === 0 || range === "ALL") {
      return history;
    }

    const latestTime = new Date(history[history.length - 1]?.timestamp ?? Date.now()).getTime();
    const cutoff = latestTime - RANGE_TO_MS[range];
    const filtered = history.filter((point) => new Date(point.timestamp).getTime() >= cutoff);

    return filtered.length >= 2 ? filtered : history.slice(-Math.min(history.length, 24));
  }, [history, range]);

  const linePath = useMemo(() => buildPricePath(filteredHistory, 100, 100), [filteredHistory]);
  const areaPath = useMemo(() => buildAreaPath(filteredHistory, 100, 100), [filteredHistory]);
  const prices = filteredHistory.map((point) => point.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

  if (history.length === 0) {
    return <p className="emptyState">Price history is not available for this market yet.</p>;
  }

  return (
    <div className="marketHistoryChartBlock">
      <div className="marketHistoryToolbar">
        <div className="marketRangeTabs">
          {RANGES.map((entry) => (
            <button
              key={entry}
              type="button"
              className={`marketRangeTab ${range === entry ? "marketRangeTabActive" : ""}`.trim()}
              onClick={() => setRange(entry)}
            >
              {entry}
            </button>
          ))}
        </div>

        <div className="featuredTags">
          <span className="tag">{filteredHistory.length} points</span>
          {minPrice !== null && maxPrice !== null ? (
            <span className="tag">
              {Math.round(minPrice * 100)}c - {Math.round(maxPrice * 100)}c
            </span>
          ) : null}
        </div>
      </div>

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="marketContextChart">
        <defs>
          <linearGradient id="marketChartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(22, 199, 132, 0.42)" />
            <stop offset="100%" stopColor="rgba(22, 199, 132, 0.02)" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#marketChartFill)" />
        <path d={linePath} className="marketContextChartLine" />
      </svg>

      <div className="marketContextAxisRow">
        <span>{formatDate(filteredHistory[0]?.timestamp ?? new Date().toISOString())}</span>
        <span>{formatDate(filteredHistory[filteredHistory.length - 1]?.timestamp ?? new Date().toISOString())}</span>
      </div>
    </div>
  );
};
