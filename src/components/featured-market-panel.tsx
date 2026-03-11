import { Market } from "@/lib/types";

interface FeaturedMarketPanelProps {
  market: Market | null;
  strategyCount: number;
}

const formatCents = (value: number): string => `${Math.round(value * 100)}c`;

const formatLiquidity = (value: number): string => {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }

  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}k`;
  }

  return `$${Math.round(value)}`;
};

const formatDate = (value: string | null): string => {
  if (!value) {
    return "Open ended";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

export const FeaturedMarketPanel = ({ market, strategyCount }: FeaturedMarketPanelProps) => {
  if (!market) {
    return (
      <section className="panel featuredMarketPanel emptyPanel">
        <span className="eyebrow">Selected Market</span>
        <h2>No live market selected</h2>
        <p className="emptyState">Once live Polymarket listings load, the selected market will appear here.</p>
      </section>
    );
  }

  return (
    <section className="panel featuredMarketPanel">
      <div className="featuredMarketTop">
        <div>
          <span className="eyebrow">{market.category}</span>
          <h2>{market.question}</h2>
          <p>Trade this live market directly or attach AI entry logic through a creator strategy.</p>
        </div>
        <div className="featuredTags">
          <span className="tag">{strategyCount} strategies</span>
          <span className="tag">{market.orderBookEnabled ? "Order book live" : "Read only"}</span>
        </div>
      </div>

      <div className="featuredOddsGrid">
        <article className="priceTile priceTileYes">
          <span>YES</span>
          <strong>{formatCents(market.yesPrice)}</strong>
          <small>{Math.round(market.yesPrice * 100)}% implied</small>
        </article>
        <article className="priceTile priceTileNo">
          <span>NO</span>
          <strong>{formatCents(market.noPrice)}</strong>
          <small>{Math.round(market.noPrice * 100)}% implied</small>
        </article>
      </div>

      <div className="marketFactsGrid">
        <div>
          <span>Liquidity</span>
          <strong>{formatLiquidity(market.liquidityUsd)}</strong>
        </div>
        <div>
          <span>Resolution</span>
          <strong>{formatDate(market.endDate)}</strong>
        </div>
        <div>
          <span>Book Type</span>
          <strong>{market.negRisk ? "Negative risk" : "Standard"}</strong>
        </div>
        <div>
          <span>Last Update</span>
          <strong>{formatDate(market.updatedAt)}</strong>
        </div>
      </div>
    </section>
  );
};
