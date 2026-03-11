import Link from "next/link";
import { CreatorPerformanceSummary, Strategy } from "@/lib/types";

interface CreatorPerformancePanelProps {
  summary: CreatorPerformanceSummary;
  strategies: Strategy[];
}

const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;

export const CreatorPerformancePanel = ({ summary, strategies }: CreatorPerformancePanelProps) => {
  return (
    <section className="panel creatorPanel">
      <div className="panelHeaderRow">
        <div>
          <span className="eyebrow">Creator Performance</span>
          <h1>@{summary.creatorHandle}</h1>
        </div>
        <div className="creatorSnapshot">
          <strong>${summary.totalVolumeUsd.toLocaleString()}</strong>
          <span>Tracked live notional</span>
        </div>
      </div>

      <div className="metricGrid compactMetricGrid">
        <div>
          <span>Strategies</span>
          <strong>{summary.strategyCount}</strong>
        </div>
        <div>
          <span>Followers</span>
          <strong>{summary.totalFollowers}</strong>
        </div>
        <div>
          <span>Orders</span>
          <strong>{summary.totalOrders}</strong>
        </div>
        <div>
          <span>Fill Rate</span>
          <strong>{percent(summary.fillRate)}</strong>
        </div>
      </div>

      <div className="creatorStrategyList">
        {strategies.map((strategy) => (
          <Link key={strategy.id} href={`/strategies/${strategy.id}`} className="creatorStrategyRow">
            <div>
              <strong>{strategy.name}</strong>
              <p>{strategy.market.question}</p>
            </div>
            <span>{strategy.followerCount} followers</span>
          </Link>
        ))}
      </div>
    </section>
  );
};
