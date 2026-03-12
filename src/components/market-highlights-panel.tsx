"use client";

import { useEffect, useMemo, useState } from "react";
import { Market } from "@/lib/types";

interface MarketHighlightsPanelProps {
  markets: Market[];
  selectedMarketId: string | null;
  strategyCountByMarket: Record<string, number>;
  onSelectMarket: (marketId: string) => void;
}

const ROTATION_MS = 10000;

const formatCents = (value: number): string => `${Math.round(value * 100)}c`;

const formatLiquidity = (value: number): string => {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }

  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}k`;
  }

  return `$${Math.round(value)}`;
};

const scoreMarket = (market: Market): number => {
  const balanceScore = 1 - Math.abs(market.yesPrice - 0.5) * 1.4;
  const liquidityScore = Math.log10(Math.max(market.liquidityUsd, 1));
  const liveBookBonus = market.orderBookEnabled ? 1.2 : 0.7;
  return balanceScore * liquidityScore * liveBookBonus;
};

export const MarketHighlightsPanel = ({
  markets,
  selectedMarketId,
  strategyCountByMarket,
  onSelectMarket
}: MarketHighlightsPanelProps) => {
  const highlights = useMemo(() => {
    const candidates = markets.filter((market) => market.yesPrice > 0.03 && market.yesPrice < 0.97);
    const source = candidates.length >= 4 ? candidates : markets;
    return [...source].sort((left, right) => scoreMarket(right) - scoreMarket(left)).slice(0, 5);
  }, [markets]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [highlights.length]);

  useEffect(() => {
    if (highlights.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % highlights.length);
    }, ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [highlights]);

  const activeMarket = highlights[activeIndex] ?? null;

  if (!activeMarket) {
    return null;
  }

  return (
    <section className="panel marketHighlightsPanel">
      <div className="panelHeaderRow">
        <div>
          <span className="eyebrow">Market Highlights</span>
          <h2>Rotating high-signal markets</h2>
        </div>
        <span className="tag">Auto spotlight / 10s</span>
      </div>

      <div className="highlightHero">
        <div className="highlightMain">
          <div className="featuredTags">
            <span className="tag">{activeMarket.category}</span>
            <span className="tag">
              {strategyCountByMarket[activeMarket.id] ?? 0} strategies
            </span>
            <span className="tag">{activeMarket.negRisk ? "Negative risk" : "Standard book"}</span>
          </div>

          <h3>{activeMarket.question}</h3>
          <p>
            Rotating spotlight surfaces markets with live order books, stronger liquidity, and more balanced odds so the
            center stage stays focused on tradable setups rather than dead contracts.
          </p>

          <div className="highlightStats">
            <div>
              <span>YES</span>
              <strong>{formatCents(activeMarket.yesPrice)}</strong>
            </div>
            <div>
              <span>NO</span>
              <strong>{formatCents(activeMarket.noPrice)}</strong>
            </div>
            <div>
              <span>Liquidity</span>
              <strong>{formatLiquidity(activeMarket.liquidityUsd)}</strong>
            </div>
          </div>

          <div className="highlightActions">
            <button type="button" onClick={() => onSelectMarket(activeMarket.id)}>
              {selectedMarketId === activeMarket.id ? "Open Now" : "Inspect Market"}
            </button>
          </div>
        </div>

        <div className="highlightNav">
          {highlights.map((market, index) => (
            <button
              key={market.id}
              type="button"
              className={`highlightNavItem ${index === activeIndex ? "highlightNavItemActive" : ""}`.trim()}
              onClick={() => setActiveIndex(index)}
            >
              <span>{market.category}</span>
              <strong>{market.question}</strong>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
