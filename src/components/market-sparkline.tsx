"use client";

import { MarketPricePoint } from "@/lib/types";

interface MarketSparklineProps {
  points: MarketPricePoint[];
  tone?: "yes" | "no" | "neutral";
}

const buildLinePath = (points: MarketPricePoint[], width: number, height: number): string => {
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

  return `${buildLinePath(points, width, height)} L ${width},${height} L 0,${height} Z`;
};

export const MarketSparkline = ({ points, tone = "neutral" }: MarketSparklineProps) => {
  if (points.length === 0) {
    return null;
  }

  const areaPath = buildAreaPath(points, 100, 46);
  const linePath = buildLinePath(points, 100, 46);
  const gradientId = `spark-${tone}`;

  return (
    <svg viewBox="0 0 100 46" preserveAspectRatio="none" className={`marketSparkline marketSparkline${tone}`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={tone === "yes" ? "rgba(22, 199, 132, 0.42)" : tone === "no" ? "rgba(255, 91, 110, 0.42)" : "rgba(59, 130, 246, 0.34)"}
          />
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} className="marketSparklineLine" />
    </svg>
  );
};
