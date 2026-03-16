"use client";

import { useEffect, useMemo, useState } from "react";
import { edgeApi } from "@/lib/api";
import { Market, MarketContext } from "@/lib/types";
import { MarketDiscoveryCard } from "./market-discovery-card";

interface MarketListPanelProps {
  markets: Market[];
  selectedMarketId: string | null;
  loading: boolean;
  strategyCountByMarket: Record<string, number>;
  onSelectMarket: (marketId: string) => void;
}

type FeedMode = "trending" | "breaking" | "new" | "ending_soon" | "live";

const FEED_MODES: Array<{ id: FeedMode; label: string }> = [
  { id: "trending", label: "Trending" },
  { id: "breaking", label: "Breaking" },
  { id: "new", label: "New" },
  { id: "ending_soon", label: "Ending Soon" },
  { id: "live", label: "Live" }
];

const toSortedEntries = (counts: Record<string, number>): string[] => {
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1])
    .map(([label]) => label);
};

const scoreBreakingMarket = (market: Market): number => {
  const timeScore = market.updatedAt ? new Date(market.updatedAt).getTime() / 1_000_000_000_000 : 0;
  const eventScore = ["Politics", "World", "Macro", "Finance"].includes(market.category) ? 1.2 : 0.8;
  return market.liquidityUsd * eventScore + timeScore;
};

const sortByFeedMode = (markets: Market[], feedMode: FeedMode): Market[] => {
  switch (feedMode) {
    case "breaking":
      return [...markets].sort((left, right) => scoreBreakingMarket(right) - scoreBreakingMarket(left));
    case "new":
      return [...markets].sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      );
    case "ending_soon":
      return [...markets].sort((left, right) => {
        const leftTime = left.endDate ? new Date(left.endDate).getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.endDate ? new Date(right.endDate).getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      });
    case "live":
      return [...markets].sort((left, right) => {
        if (left.orderBookEnabled !== right.orderBookEnabled) {
          return Number(right.orderBookEnabled) - Number(left.orderBookEnabled);
        }
        return right.liquidityUsd - left.liquidityUsd;
      });
    case "trending":
    default:
      return [...markets].sort((left, right) => right.liquidityUsd - left.liquidityUsd);
  }
};

const buildSections = (
  markets: Market[],
  activeCategory: string,
  activeSubcategory: string
): Array<{ label: string; markets: Market[] }> => {
  if (activeCategory === "All") {
    const grouped = markets.reduce<Record<string, Market[]>>((accumulator, market) => {
      accumulator[market.category] = [...(accumulator[market.category] ?? []), market];
      return accumulator;
    }, {});

    return Object.entries(grouped)
      .sort((left, right) => (right[1][0]?.liquidityUsd ?? 0) - (left[1][0]?.liquidityUsd ?? 0))
      .map(([label, sectionMarkets]) => ({ label, markets: sectionMarkets.slice(0, 6) }));
  }

  if (activeSubcategory === "All") {
    const grouped = markets.reduce<Record<string, Market[]>>((accumulator, market) => {
      accumulator[market.subcategory] = [...(accumulator[market.subcategory] ?? []), market];
      return accumulator;
    }, {});

    return Object.entries(grouped)
      .sort((left, right) => (right[1][0]?.liquidityUsd ?? 0) - (left[1][0]?.liquidityUsd ?? 0))
      .map(([label, sectionMarkets]) => ({ label, markets: sectionMarkets.slice(0, 6) }));
  }

  return [{ label: activeSubcategory, markets }];
};

export const MarketListPanel = ({
  markets,
  selectedMarketId,
  loading,
  strategyCountByMarket,
  onSelectMarket
}: MarketListPanelProps) => {
  const [feedMode, setFeedMode] = useState<FeedMode>("trending");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activeSubcategory, setActiveSubcategory] = useState<string>("All");
  const [hoveredMarketId, setHoveredMarketId] = useState<string | null>(null);
  const [contextCache, setContextCache] = useState<Record<string, MarketContext>>({});
  const [loadingContextIds, setLoadingContextIds] = useState<string[]>([]);

  const rankedMarkets = useMemo(() => sortByFeedMode(markets, feedMode), [feedMode, markets]);

  const categories = useMemo(() => {
    const counts = rankedMarkets.reduce<Record<string, number>>((accumulator, market) => {
      accumulator[market.category] = (accumulator[market.category] ?? 0) + 1;
      return accumulator;
    }, {});

    return ["All", ...toSortedEntries(counts)];
  }, [rankedMarkets]);

  useEffect(() => {
    if (!categories.includes(activeCategory)) {
      setActiveCategory("All");
    }
  }, [activeCategory, categories]);

  const categoryMarkets = useMemo(() => {
    if (activeCategory === "All") {
      return rankedMarkets;
    }

    return rankedMarkets.filter((market) => market.category === activeCategory);
  }, [activeCategory, rankedMarkets]);

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

  const sections = useMemo(
    () => buildSections(visibleMarkets, activeCategory, activeSubcategory),
    [activeCategory, activeSubcategory, visibleMarkets]
  );

  const primeMarketContext = (marketId: string) => {
    if (contextCache[marketId] || loadingContextIds.includes(marketId)) {
      return;
    }

    setLoadingContextIds((current) => [...current, marketId]);
    edgeApi
      .getMarketContext(marketId)
      .then((context) => {
        setContextCache((current) => ({
          ...current,
          [marketId]: context
        }));
      })
      .catch(() => undefined)
      .finally(() => {
        setLoadingContextIds((current) => current.filter((entry) => entry !== marketId));
      });
  };

  useEffect(() => {
    if (selectedMarketId) {
      primeMarketContext(selectedMarketId);
    }
  }, [selectedMarketId]);

  return (
    <section className="panel marketListPanel marketExplorerPanel">
      <div className="marketExplorerTop">
        <div>
          <span className="eyebrow">Explore Markets</span>
          <h2>Curated market board</h2>
          <p>Switch feeds, drill into categories, and scan dense cards across live prediction markets.</p>
        </div>
        <div className="marketExplorerMeta">
          <span className="tag">{FEED_MODES.find((item) => item.id === feedMode)?.label}</span>
          <span className="tag">{loading ? "Syncing" : `${visibleMarkets.length} showing`}</span>
        </div>
      </div>

      <div className="marketFeedTabs">
        {FEED_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`marketFeedTab ${feedMode === mode.id ? "marketFeedTabActive" : ""}`.trim()}
            onClick={() => setFeedMode(mode.id)}
          >
            {mode.label}
          </button>
        ))}
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

      {subcategories.length > 1 ? (
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
      ) : null}

      {visibleMarkets.length === 0 ? (
        <p className="emptyState">No markets match the current feed or category selection.</p>
      ) : (
        <div className="marketSectionsStack">
          {sections.map((section) => (
            <section key={section.label} className="marketCardSection">
              <div className="marketSectionHeader marketSectionHeaderWide">
                <div>
                  <strong>{section.label}</strong>
                  <p>{section.markets.length} markets surfaced in this slice.</p>
                </div>
                <span className="tag">{feedMode.replace("_", " ")}</span>
              </div>

              <div className="marketCardGrid">
                {section.markets.map((market) => {
                  const strategyCount = strategyCountByMarket[market.id] ?? 0;
                  const isActive = market.id === selectedMarketId;
                  const isHovered = hoveredMarketId === market.id;
                  const isDimmed = hoveredMarketId !== null && hoveredMarketId !== market.id && !isActive;

                  return (
                    <MarketDiscoveryCard
                      key={market.id}
                      market={market}
                      strategyCount={strategyCount}
                      isActive={isActive}
                      isDimmed={isDimmed}
                      isHovered={isHovered}
                      intel={contextCache[market.id] ?? null}
                      intelLoading={loadingContextIds.includes(market.id)}
                      onSelect={onSelectMarket}
                      onHoverStart={(marketId) => {
                        setHoveredMarketId(marketId);
                        primeMarketContext(marketId);
                      }}
                      onHoverEnd={() => setHoveredMarketId((current) => (current === market.id ? null : current))}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
};
