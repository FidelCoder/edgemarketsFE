"use client";

import { useEffect, useMemo, useState } from "react";
import { Market } from "@/lib/types";
import { MarketAvatar } from "./market-avatar";

interface MarketListPanelProps {
  markets: Market[];
  selectedMarketId: string | null;
  searchValue: string;
  loading: boolean;
  strategyCountByMarket: Record<string, number>;
  onSearchChange: (value: string) => void;
  onSelectMarket: (marketId: string) => void;
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

const toSortedEntries = (counts: Record<string, number>): string[] => {
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1])
    .map(([label]) => label);
};

export const MarketListPanel = ({
  markets,
  selectedMarketId,
  searchValue,
  loading,
  strategyCountByMarket,
  onSearchChange,
  onSelectMarket
}: MarketListPanelProps) => {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activeSubcategory, setActiveSubcategory] = useState<string>("All");

  const categories = useMemo(() => {
    const counts = markets.reduce<Record<string, number>>((accumulator, market) => {
      accumulator[market.category] = (accumulator[market.category] ?? 0) + 1;
      return accumulator;
    }, {});

    return ["All", ...toSortedEntries(counts)];
  }, [markets]);

  useEffect(() => {
    if (!categories.includes(activeCategory)) {
      setActiveCategory("All");
    }
  }, [activeCategory, categories]);

  const categoryMarkets = useMemo(() => {
    if (activeCategory === "All") {
      return markets;
    }

    return markets.filter((market) => market.category === activeCategory);
  }, [activeCategory, markets]);

  const subcategories = useMemo(() => {
    const counts = categoryMarkets.reduce<Record<string, number>>((accumulator, market) => {
      accumulator[market.subcategory] = (accumulator[market.subcategory] ?? 0) + 1;
      return accumulator;
    }, {});

    return ["All", ...toSortedEntries(counts)];
  }, [categoryMarkets]);

  useEffect(() => {
    if (!subcategories.includes(activeSubcategory)) {
      setActiveSubcategory("All");
    }
  }, [activeSubcategory, subcategories]);

  const visibleMarkets = useMemo(() => {
    if (activeSubcategory === "All") {
      return categoryMarkets;
    }

    return categoryMarkets.filter((market) => market.subcategory === activeSubcategory);
  }, [activeSubcategory, categoryMarkets]);

  const groupedMarkets = useMemo(() => {
    return visibleMarkets.reduce<Record<string, Market[]>>((accumulator, market) => {
      const key = market.subcategory;
      accumulator[key] = [...(accumulator[key] ?? []), market];
      return accumulator;
    }, {});
  }, [visibleMarkets]);

  const sections = useMemo(() => {
    if (activeSubcategory !== "All") {
      return activeSubcategory in groupedMarkets ? [activeSubcategory] : [];
    }

    return Object.keys(groupedMarkets).sort((left, right) => {
      return (groupedMarkets[right]?.[0]?.liquidityUsd ?? 0) - (groupedMarkets[left]?.[0]?.liquidityUsd ?? 0);
    });
  }, [activeSubcategory, groupedMarkets]);

  return (
    <section className="panel marketListPanel">
      <div className="marketListHeader">
        <div>
          <span className="eyebrow">Live Predictions</span>
          <h2>Structured Market Board</h2>
        </div>
        <span className="tag">{loading ? "Syncing" : `${visibleMarkets.length} live`}</span>
      </div>

      <div className="marketTopicStrip">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={`marketTopicChip ${activeCategory === category ? "marketTopicChipActive" : ""}`.trim()}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="marketSubtopicStrip">
        {subcategories.map((subcategory) => (
          <button
            key={subcategory}
            type="button"
            className={`marketSubtopicChip ${activeSubcategory === subcategory ? "marketSubtopicChipActive" : ""}`.trim()}
            onClick={() => setActiveSubcategory(subcategory)}
          >
            {subcategory}
          </button>
        ))}
      </div>

      <label className="searchField">
        <span>Search</span>
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search elections, crypto, macro..."
        />
      </label>

      {visibleMarkets.length === 0 ? (
        <p className="emptyState">No markets match the current category, subcategory, or search.</p>
      ) : (
        <div className="marketRows">
          {sections.map((section) => (
            <div key={section} className="marketSection">
              <div className="marketSectionHeader">
                <strong>{section}</strong>
                <span>{groupedMarkets[section]?.length ?? 0} markets</span>
              </div>

              <div className="marketSectionRows">
                {(groupedMarkets[section] ?? []).map((market) => {
                  const isActive = market.id === selectedMarketId;
                  const strategyCount = strategyCountByMarket[market.id] ?? 0;

                  return (
                    <button
                      key={market.id}
                      type="button"
                      className={`marketRow ${isActive ? "marketRowActive" : ""}`.trim()}
                      onClick={() => onSelectMarket(market.id)}
                    >
                      <div className="marketRowMain">
                        <div className="marketRowTop">
                          <div className="marketRowLead">
                            <MarketAvatar market={market} size="sm" />
                            <span className="marketCategory">{market.category}</span>
                          </div>
                          <span className="marketStrategyCount">{strategyCount} strategies</span>
                        </div>
                        <strong>{market.question}</strong>
                        <div className="marketRowMeta">
                          <span>{market.subcategory}</span>
                          <span>{formatLiquidity(market.liquidityUsd)} liquidity</span>
                          <span>{market.negRisk ? "Neg risk" : "Standard book"}</span>
                        </div>
                      </div>

                      <div className="marketRowAside">
                        <span className="marketOdd marketOddYes">YES {formatCents(market.yesPrice)}</span>
                        <span className="marketOdd marketOddNo">NO {formatCents(market.noPrice)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
