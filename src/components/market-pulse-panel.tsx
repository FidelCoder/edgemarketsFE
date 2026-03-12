import { Market } from "@/lib/types";
import { MarketAvatar } from "./market-avatar";

interface MarketPulsePanelProps {
  markets: Market[];
  selectedMarketId: string | null;
  onSelectMarket: (marketId: string) => void;
}

const formatLiquidity = (value: number): string => {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}k`;
  }

  return `$${Math.round(value)}`;
};

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

const getEndingSoonMarkets = (markets: Market[]): Market[] => {
  return [...markets]
    .filter((market) => market.endDate)
    .sort((left, right) => new Date(left.endDate ?? 0).getTime() - new Date(right.endDate ?? 0).getTime())
    .slice(0, 4);
};

const getMostActiveMarkets = (markets: Market[]): Market[] => {
  return [...markets].sort((left, right) => right.liquidityUsd - left.liquidityUsd).slice(0, 5);
};

const getHotTopics = (markets: Market[]) => {
  const topicMap = markets.reduce<Record<string, { count: number; liquidityUsd: number; leadMarketId: string }>>(
    (accumulator, market) => {
      const key = market.subcategory;
      const current = accumulator[key];

      if (!current) {
        accumulator[key] = {
          count: 1,
          liquidityUsd: market.liquidityUsd,
          leadMarketId: market.id
        };
        return accumulator;
      }

      accumulator[key] = {
        count: current.count + 1,
        liquidityUsd: current.liquidityUsd + market.liquidityUsd,
        leadMarketId: current.leadMarketId
      };
      return accumulator;
    },
    {}
  );

  return Object.entries(topicMap)
    .map(([label, value]) => ({ label, ...value }))
    .sort((left, right) => right.liquidityUsd - left.liquidityUsd)
    .slice(0, 8);
};

export const MarketPulsePanel = ({ markets, selectedMarketId, onSelectMarket }: MarketPulsePanelProps) => {
  const mostActive = getMostActiveMarkets(markets);
  const endingSoon = getEndingSoonMarkets(markets);
  const hotTopics = getHotTopics(markets);

  return (
    <section className="panel pulsePanel">
      <div className="panelHeaderRow">
        <div>
          <span className="eyebrow">Market Pulse</span>
          <h2>What traders are watching</h2>
        </div>
        <span className="tag">{markets.length} live markets</span>
      </div>

      <div className="pulseSection">
        <div className="pulseSectionHeader">
          <strong>Most active</strong>
          <span>Liquidity ranked</span>
        </div>
        <div className="pulseList">
          {mostActive.map((market, index) => (
            <button
              key={market.id}
              type="button"
              className={`pulseRow ${selectedMarketId === market.id ? "pulseRowActive" : ""}`.trim()}
              onClick={() => onSelectMarket(market.id)}
            >
              <span className="pulseRank">{index + 1}</span>
              <MarketAvatar market={market} size="sm" />
              <div className="pulseRowMain">
                <strong>{market.question}</strong>
                <span>{market.category} · {market.subcategory}</span>
              </div>
              <div className="pulseRowMeta">
                <strong>{formatPercent(market.yesPrice)}</strong>
                <span>{formatLiquidity(market.liquidityUsd)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {endingSoon.length > 0 ? (
        <div className="pulseSection">
          <div className="pulseSectionHeader">
            <strong>Ending soon</strong>
            <span>Resolution radar</span>
          </div>
          <div className="pulseChipGrid">
            {endingSoon.map((market) => (
              <button key={market.id} type="button" className="pulseChip" onClick={() => onSelectMarket(market.id)}>
                <span>{market.subcategory}</span>
                <strong>{formatPercent(market.yesPrice)} YES</strong>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="pulseSection">
        <div className="pulseSectionHeader">
          <strong>Hot topics</strong>
          <span>Volume clusters</span>
        </div>
        <div className="pulseChipGrid">
          {hotTopics.map((topic) => (
            <button key={topic.label} type="button" className="pulseChip" onClick={() => onSelectMarket(topic.leadMarketId)}>
              <span>{topic.label}</span>
              <strong>{formatLiquidity(topic.liquidityUsd)}</strong>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
