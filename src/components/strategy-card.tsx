"use client";

import Link from "next/link";
import { Strategy } from "@/lib/types";

interface StrategyCardProps {
  strategy: Strategy;
  followPending: boolean;
  triggerPending: boolean;
  livePending: boolean;
  alreadyFollowing: boolean;
  canExecuteLive: boolean;
  onFollow: (strategy: Strategy) => void;
  onQueueTrigger: (strategy: Strategy) => void;
  onExecuteLive: (strategy: Strategy) => void;
}

export const StrategyCard = ({
  strategy,
  followPending,
  triggerPending,
  livePending,
  alreadyFollowing,
  canExecuteLive,
  onFollow,
  onQueueTrigger,
  onExecuteLive
}: StrategyCardProps) => {
  const isBusy = followPending || triggerPending || livePending;

  return (
    <article className="panel strategyCard">
      <div className="panelHeaderRow">
        <div>
          <h3>
            <Link href={`/strategies/${strategy.id}`}>{strategy.name}</Link>
          </h3>
          <span className="eyebrow">
            by <Link href={`/creators/${strategy.creatorHandle}`}>@{strategy.creatorHandle}</Link>
          </span>
        </div>
        <span className="tag">{strategy.market.category}</span>
      </div>

      <p>{strategy.description}</p>

      <div className="metricGrid">
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
        <div>
          <span>Allocation</span>
          <strong>${strategy.allocationUsd.toLocaleString()}</strong>
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

      <div className="strategyActions strategyActionsWide">
        <button className="tradeAction" disabled={isBusy || !canExecuteLive} onClick={() => onExecuteLive(strategy)}>
          {livePending ? "Executing..." : canExecuteLive ? "Execute Live" : "Connect Wallet"}
        </button>
        <button disabled={isBusy || alreadyFollowing} onClick={() => onFollow(strategy)}>
          {alreadyFollowing ? "Already Following" : followPending ? "Following..." : "Follow Strategy"}
        </button>
        <button className="ghostAction" disabled={isBusy} onClick={() => onQueueTrigger(strategy)}>
          {triggerPending ? "Queueing..." : "Queue Trigger"}
        </button>
      </div>
    </article>
  );
};
