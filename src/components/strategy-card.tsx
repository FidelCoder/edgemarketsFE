"use client";

import { Strategy } from "@/lib/types";

interface StrategyCardProps {
  strategy: Strategy;
  followPending: boolean;
  onFollow: (strategy: Strategy) => void;
}

export const StrategyCard = ({ strategy, followPending, onFollow }: StrategyCardProps) => {
  return (
    <article className="panel strategyCard">
      <div className="panelHeaderRow">
        <h3>{strategy.name}</h3>
        <span className="tag">{strategy.market.category}</span>
      </div>

      <p>{strategy.description}</p>

      <div className="metricGrid">
        <div>
          <span>Creator</span>
          <strong>@{strategy.creatorHandle}</strong>
        </div>
        <div>
          <span>Followers</span>
          <strong>{strategy.followerCount}</strong>
        </div>
        <div>
          <span>Trigger</span>
          <strong>
            {strategy.triggerType} {strategy.conditionValue}
          </strong>
        </div>
        <div>
          <span>Action</span>
          <strong>{strategy.action}</strong>
        </div>
      </div>

      <div className="marketContext">
        <div>
          <span>Market</span>
          <strong>{strategy.market.question}</strong>
        </div>
        <div className="priceRow">
          <span>YES {Math.round(strategy.market.yesPrice * 100)}%</span>
          <span>NO {Math.round(strategy.market.noPrice * 100)}%</span>
          <span>${strategy.market.liquidityUsd.toLocaleString()} liquidity</span>
        </div>
      </div>

      <button disabled={followPending} onClick={() => onFollow(strategy)}>
        {followPending ? "Following..." : "Follow Strategy"}
      </button>
    </article>
  );
};
