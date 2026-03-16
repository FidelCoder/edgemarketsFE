"use client";

import { Market } from "@/lib/types";

interface MarketRelatedMarketsProps {
  market: Market;
  markets: Market[];
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

const getRelatedMarkets = (market: Market, markets: Market[]): Market[] => {
  const sameSubcategory = markets.filter((entry) => entry.id !== market.id && entry.subcategory === market.subcategory);
  const sameCategory = markets.filter(
    (entry) => entry.id !== market.id && entry.subcategory !== market.subcategory && entry.category === market.category
  );

  return [...sameSubcategory, ...sameCategory]
    .sort((left, right) => right.liquidityUsd - left.liquidityUsd)
    .slice(0, 4);
};

export const MarketRelatedMarkets = ({ market, markets, onSelectMarket }: MarketRelatedMarketsProps) => {
  const relatedMarkets = getRelatedMarkets(market, markets);

  return (
    <article className="marketContextCard">
      <div className="marketContextCardHead">
        <div>
          <span className="eyebrow">Related Markets</span>
          <h3>Same theme, faster comparison</h3>
        </div>
        <span className="tag">{relatedMarkets.length} surfaced</span>
      </div>

      {relatedMarkets.length === 0 ? (
        <p className="emptyState">No closely related markets surfaced from the current list yet.</p>
      ) : (
        <div className="relatedMarketList">
          {relatedMarkets.map((entry) => (
            <button key={entry.id} type="button" className="relatedMarketRow" onClick={() => onSelectMarket(entry.id)}>
              <div>
                <strong>{entry.question}</strong>
                <span>
                  {entry.category} · {entry.subcategory}
                </span>
              </div>
              <div className="relatedMarketMeta">
                <strong>{formatCents(entry.yesPrice)} YES</strong>
                <span>{formatLiquidity(entry.liquidityUsd)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </article>
  );
};
