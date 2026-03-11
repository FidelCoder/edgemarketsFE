"use client";

import { Follow } from "@/lib/types";

interface FollowedStrategiesProps {
  follows: Follow[];
  userId: string;
}

const shorten = (value: string): string => {
  if (value.length <= 24) {
    return value;
  }

  return `${value.slice(0, 12)}...${value.slice(-6)}`;
};

export const FollowedStrategies = ({ follows, userId }: FollowedStrategiesProps) => {
  return (
    <section className="panel followedPanel">
      <div className="panelHeaderRow">
        <h2>Active Allocations</h2>
        <span className="tag">{shorten(userId)}</span>
      </div>

      {follows.length === 0 ? (
        <p>No active follows yet. Pick a strategy from the marketplace.</p>
      ) : (
        <div className="followList">
          {follows.map((follow) => (
            <article key={follow.id} className="followItem">
              <div>
                <strong>{follow.strategy.name}</strong>
                <p>{follow.strategy.market.question}</p>
              </div>
              <div className="followMeta">
                <span>Daily loss cap: ${follow.maxDailyLossUsd.toLocaleString()}</span>
                <span>Max market exposure: ${follow.maxMarketExposureUsd.toLocaleString()}</span>
                <span>Funding stablecoin: {follow.fundingStablecoin}</span>
                <span>Status: {follow.status}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
