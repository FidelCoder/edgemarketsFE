"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { edgeApi } from "@/lib/api";
import { OrderRecord, Strategy } from "@/lib/types";
import { StrategyHistoryList } from "./strategy-history-list";

interface StrategyPageProps {
  strategyId: string;
}

export const StrategyPage = ({ strategyId }: StrategyPageProps) => {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [history, setHistory] = useState<OrderRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([edgeApi.getStrategy(strategyId), edgeApi.getStrategyHistory(strategyId, 50)])
      .then(([nextStrategy, nextHistory]) => {
        setStrategy(nextStrategy);
        setHistory(nextHistory);
      })
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "Could not load strategy page.");
      });
  }, [strategyId]);

  if (error) {
    return <p className="errorBanner">{error}</p>;
  }

  if (!strategy) {
    return <p className="statusMessage">Loading strategy history...</p>;
  }

  return (
    <main className="pageShell">
      <Link href="/" className="backLink">
        Back to desk
      </Link>

      <section className="panel strategyPageHero">
        <div className="panelHeaderRow">
          <div>
            <span className="eyebrow">Strategy History</span>
            <h1>{strategy.name}</h1>
            <p>{strategy.description}</p>
          </div>
          <span className="tag">@{strategy.creatorHandle}</span>
        </div>

        <div className="metricGrid compactMetricGrid">
          <div>
            <span>Market</span>
            <strong>{strategy.market.question}</strong>
          </div>
          <div>
            <span>Action</span>
            <strong>{strategy.action}</strong>
          </div>
          <div>
            <span>Trigger</span>
            <strong>
              {strategy.triggerType} {strategy.conditionValue}
            </strong>
          </div>
          <div>
            <span>Allocation</span>
            <strong>${strategy.allocationUsd.toLocaleString()}</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panelHeaderRow">
          <h2>Execution History</h2>
          <span className="tag">{history.length} records</span>
        </div>
        <StrategyHistoryList orders={history} />
      </section>
    </main>
  );
};
