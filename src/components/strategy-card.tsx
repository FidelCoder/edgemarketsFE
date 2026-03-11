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

const formatAction = (value: Strategy["action"]): string => value.replace(/_/g, " ").toUpperCase();

const formatTrigger = (strategy: Strategy): string => {
  const trigger = strategy.triggerType.replace(/_/g, " ");
  return `${trigger} ${strategy.conditionValue}`;
};

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
      <div className="strategyCardHead">
        <div>
          <span className="eyebrow">Creator strategy</span>
          <h3>
            <Link href={`/strategies/${strategy.id}`}>{strategy.name}</Link>
          </h3>
        </div>
        <div className="strategyTagRow">
          <span className="tag">@{strategy.creatorHandle}</span>
          <span className="tag">{strategy.followerCount} followers</span>
        </div>
      </div>

      <p>{strategy.description}</p>

      <div className="strategyStatGrid">
        <div>
          <span>Action</span>
          <strong>{formatAction(strategy.action)}</strong>
        </div>
        <div>
          <span>Trigger</span>
          <strong>{formatTrigger(strategy)}</strong>
        </div>
        <div>
          <span>Allocation</span>
          <strong>${strategy.allocationUsd.toLocaleString()}</strong>
        </div>
        <div>
          <span>Market</span>
          <strong>{strategy.market.category}</strong>
        </div>
      </div>

      <div className="strategyMarketStrip">
        <div>
          <span>Underlying market</span>
          <strong>{strategy.market.question}</strong>
        </div>
        <div className="strategyOdds">
          <span className="marketOdd marketOddYes">YES {Math.round(strategy.market.yesPrice * 100)}c</span>
          <span className="marketOdd marketOddNo">NO {Math.round(strategy.market.noPrice * 100)}c</span>
        </div>
      </div>

      <div className="strategyActions strategyActionsWide">
        <button className="tradeAction" disabled={isBusy || !canExecuteLive} onClick={() => onExecuteLive(strategy)}>
          {livePending ? "Submitting..." : canExecuteLive ? "Trade Live" : "Connect Wallet"}
        </button>
        <button disabled={isBusy || alreadyFollowing} onClick={() => onFollow(strategy)}>
          {alreadyFollowing ? "Following" : followPending ? "Following..." : "Follow"}
        </button>
        <button className="ghostAction" disabled={isBusy} onClick={() => onQueueTrigger(strategy)}>
          {triggerPending ? "Queueing..." : "Queue Trigger"}
        </button>
      </div>
    </article>
  );
};
