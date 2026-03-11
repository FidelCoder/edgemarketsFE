"use client";

import { Market } from "@/lib/types";

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

export const MarketListPanel = ({
  markets,
  selectedMarketId,
  searchValue,
  loading,
  strategyCountByMarket,
  onSearchChange,
  onSelectMarket
}: MarketListPanelProps) => {
  return (
    <section className="panel marketListPanel">
      <div className="marketListHeader">
        <div>
          <span className="eyebrow">Live Predictions</span>
          <h2>Market Board</h2>
        </div>
        <span className="tag">{loading ? "Syncing" : `${markets.length} live`}</span>
      </div>

      <label className="searchField">
        <span>Search</span>
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search politics, crypto, macro..."
        />
      </label>

      {markets.length === 0 ? (
        <p className="emptyState">No live Polymarket markets are available right now.</p>
      ) : (
        <div className="marketRows">
          {markets.map((market) => {
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
                    <span className="marketCategory">{market.category}</span>
                    <span className="marketStrategyCount">{strategyCount} strat</span>
                  </div>
                  <strong>{market.question}</strong>
                  <div className="marketRowMeta">
                    <span>{formatLiquidity(market.liquidityUsd)} liquidity</span>
                    <span>{market.negRisk ? "Neg risk" : "Standard book"}</span>
                  </div>
                </div>

                <div className="marketOdds">
                  <span className="marketOdd marketOddYes">YES {formatCents(market.yesPrice)}</span>
                  <span className="marketOdd marketOddNo">NO {formatCents(market.noPrice)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
