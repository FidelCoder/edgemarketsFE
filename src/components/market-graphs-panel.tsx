import { Market } from "@/lib/types";

interface MarketGraphsPanelProps {
  market: Market;
  peerMarkets: Market[];
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const toPercent = (value: number): string => `${Math.round(value * 100)}%`;

const computeLiquidityPercentile = (market: Market, peerMarkets: Market[]): number => {
  if (peerMarkets.length <= 1) {
    return 1;
  }

  const sorted = [...peerMarkets].sort((left, right) => left.liquidityUsd - right.liquidityUsd);
  const index = sorted.findIndex((entry) => entry.id === market.id);

  if (index < 0) {
    return 0.5;
  }

  return clamp(index / (sorted.length - 1), 0, 1);
};

const computeBalanceScore = (market: Market): number => {
  return clamp(1 - Math.abs(market.yesPrice - 0.5) * 2, 0, 1);
};

const computeUrgencyScore = (market: Market): number => {
  if (!market.endDate) {
    return 0.2;
  }

  const endDate = new Date(market.endDate).getTime();
  const now = Date.now();
  const daysRemaining = Math.max((endDate - now) / (1000 * 60 * 60 * 24), 0);

  return clamp(1 - daysRemaining / 30, 0, 1);
};

const formatDaysRemaining = (market: Market): string => {
  if (!market.endDate) {
    return "Open ended";
  }

  const endDate = new Date(market.endDate).getTime();
  const now = Date.now();
  const daysRemaining = Math.max((endDate - now) / (1000 * 60 * 60 * 24), 0);

  if (daysRemaining < 1) {
    return "Under 1 day";
  }

  if (daysRemaining < 7) {
    return `${Math.round(daysRemaining)}d`;
  }

  return `${Math.round(daysRemaining)}d remaining`;
};

export const MarketGraphsPanel = ({ market, peerMarkets }: MarketGraphsPanelProps) => {
  const liquidityPercentile = computeLiquidityPercentile(market, peerMarkets);
  const balanceScore = computeBalanceScore(market);
  const urgencyScore = computeUrgencyScore(market);

  return (
    <section className="marketGraphsPanel">
      <div className="marketGraphCard">
        <div className="marketGraphHeader">
          <strong>Probability Split</strong>
          <span>{toPercent(market.yesPrice)} / {toPercent(market.noPrice)}</span>
        </div>
        <div className="probabilityBar">
          <div className="probabilityBarYes" style={{ width: `${market.yesPrice * 100}%` }} />
          <div className="probabilityBarNo" style={{ width: `${market.noPrice * 100}%` }} />
        </div>
      </div>

      <div className="marketGraphCard">
        <div className="marketGraphHeader">
          <strong>Liquidity Rank</strong>
          <span>{Math.round(liquidityPercentile * 100)}th pct</span>
        </div>
        <div className="singleGraphTrack">
          <div className="singleGraphFill singleGraphFillBlue" style={{ width: `${liquidityPercentile * 100}%` }} />
        </div>
      </div>

      <div className="marketGraphCard">
        <div className="marketGraphHeader">
          <strong>Market Balance</strong>
          <span>{Math.round(balanceScore * 100)} / 100</span>
        </div>
        <div className="singleGraphTrack">
          <div className="singleGraphFill singleGraphFillGreen" style={{ width: `${balanceScore * 100}%` }} />
        </div>
      </div>

      <div className="marketGraphCard">
        <div className="marketGraphHeader">
          <strong>Resolution Clock</strong>
          <span>{formatDaysRemaining(market)}</span>
        </div>
        <div className="singleGraphTrack">
          <div className="singleGraphFill singleGraphFillAmber" style={{ width: `${urgencyScore * 100}%` }} />
        </div>
      </div>
    </section>
  );
};
