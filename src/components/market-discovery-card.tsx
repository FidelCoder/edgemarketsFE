"use client";

import { Market, MarketContext } from "@/lib/types";
import { MarketAvatar } from "./market-avatar";
import { MarketSparkline } from "./market-sparkline";

interface MarketDiscoveryCardProps {
  market: Market;
  strategyCount: number;
  isActive: boolean;
  isDimmed: boolean;
  isHovered: boolean;
  intel: MarketContext | null;
  intelLoading: boolean;
  onSelect: (marketId: string) => void;
  onHoverStart: (marketId: string) => void;
  onHoverEnd: () => void;
}

const formatCents = (value: number): string => `${Math.round(value * 100)}c`;

const formatLiquidity = (value: number): string => {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}k`;
  }

  return `$${Math.round(value)}`;
};

const formatDate = (value: string | null): string => {
  if (!value) {
    return "Open";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Open";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
};

const formatSignedPercent = (value: number | null): string => {
  if (value === null) {
    return "--";
  }

  const signed = (value * 100).toFixed(1);
  return `${value >= 0 ? "+" : ""}${signed}%`;
};

const formatPercent = (value: number | null): string => {
  if (value === null) {
    return "--";
  }

  return `${Math.round(value * 100)}%`;
};

export const MarketDiscoveryCard = ({
  market,
  strategyCount,
  isActive,
  isDimmed,
  isHovered,
  intel,
  intelLoading,
  onSelect,
  onHoverStart,
  onHoverEnd
}: MarketDiscoveryCardProps) => {
  return (
    <button
      type="button"
      className={`marketDiscoveryCard ${isActive ? "marketDiscoveryCardActive" : ""} ${isDimmed ? "marketDiscoveryCardDimmed" : ""} ${isHovered ? "marketDiscoveryCardHovered" : ""}`.trim()}
      onClick={() => onSelect(market.id)}
      onMouseEnter={() => onHoverStart(market.id)}
      onMouseLeave={onHoverEnd}
      onFocus={() => onHoverStart(market.id)}
      onBlur={onHoverEnd}
    >
      <div className="marketDiscoveryTop">
        <div className="marketDiscoveryLead">
          <MarketAvatar market={market} size="sm" />
          <div>
            <span className="marketCategory">{market.category}</span>
            <span className="marketDiscoverySubcategory">{market.subcategory}</span>
          </div>
        </div>
        <span className="marketDiscoveryVolume">{formatLiquidity(market.liquidityUsd)} vol</span>
      </div>

      <strong>{market.question}</strong>

      <div className="marketDiscoveryOutcomeGrid">
        <div className="marketDiscoveryOutcome marketDiscoveryOutcomeYes">
          <span>YES</span>
          <strong>{formatCents(market.yesPrice)}</strong>
        </div>
        <div className="marketDiscoveryOutcome marketDiscoveryOutcomeNo">
          <span>NO</span>
          <strong>{formatCents(market.noPrice)}</strong>
        </div>
      </div>

      <div className="marketDiscoveryFooter">
        <span>{strategyCount} strategies</span>
        <span>{market.negRisk ? "Neg risk" : "Standard"}</span>
        <span>{formatDate(market.endDate)}</span>
      </div>

      <div className="marketDiscoveryIntel">
        <div className="marketDiscoveryIntelHeader">
          <span>Quick intel</span>
          <span>{intel?.priceHistory.length ? `${intel.priceHistory.length} pts` : "Live preview"}</span>
        </div>

        {intelLoading && !intel ? (
          <p className="marketDiscoveryIntelMessage">Loading live chart and flow...</p>
        ) : intel ? (
          <>
            <MarketSparkline points={intel.priceHistory} tone={market.yesPrice >= 0.5 ? "yes" : "no"} />
            <div className="marketDiscoveryIntelGrid">
              <div>
                <span>1d</span>
                <strong>{formatSignedPercent(intel.oneDayPriceChange)}</strong>
              </div>
              <div>
                <span>1w</span>
                <strong>{formatSignedPercent(intel.oneWeekPriceChange)}</strong>
              </div>
              <div>
                <span>Bid / Ask</span>
                <strong>
                  {formatPercent(intel.bestBid)} / {formatPercent(intel.bestAsk)}
                </strong>
              </div>
              <div>
                <span>Comments</span>
                <strong>{intel.commentCount ?? intel.comments.length}</strong>
              </div>
            </div>
          </>
        ) : (
          <p className="marketDiscoveryIntelMessage">Hovering shows chart, change, depth, and comment flow. Click for full chart.</p>
        )}
      </div>
    </button>
  );
};
