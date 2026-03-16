"use client";

import { Market, MarketInsight } from "@/lib/types";

interface MarketInsightSummaryCardProps {
  market: Market;
  insight: MarketInsight | null;
  pending: boolean;
  onGenerate: () => void;
}

const toPercent = (value: number): string => `${Math.round(value * 100)}%`;
const toEdge = (value: number): string => `${value > 0 ? "+" : ""}${value.toFixed(1)} pts`;

const formatBias = (value: MarketInsight["tradeBias"]): string => {
  if (value === "buy_yes") {
    return "Buy YES";
  }

  if (value === "buy_no") {
    return "Buy NO";
  }

  return "Wait";
};

export const MarketInsightSummaryCard = ({
  market,
  insight,
  pending,
  onGenerate
}: MarketInsightSummaryCardProps) => {
  const isCurrentInsight = insight?.marketId === market.id;

  return (
    <article className="marketContextCard">
      <div className="marketContextCardHead">
        <div>
          <span className="eyebrow">AI Edge</span>
          <h3>Model vs market pricing</h3>
        </div>
        <button type="button" className="ghostAction" onClick={onGenerate} disabled={pending}>
          {pending ? "Refreshing..." : isCurrentInsight ? "Refresh AI Edge" : "Generate AI Edge"}
        </button>
      </div>

      {!isCurrentInsight || !insight ? (
        <p className="emptyState">
          Generate an AI thesis to compare model fair odds against live market pricing for this contract.
        </p>
      ) : (
        <div className="marketInsightSummary">
          <div className="marketInsightMetricGrid">
            <div>
              <span>Market YES</span>
              <strong>{toPercent(insight.marketProbabilityYes)}</strong>
            </div>
            <div>
              <span>Fair YES</span>
              <strong>{toPercent(insight.fairProbabilityYes)}</strong>
            </div>
            <div>
              <span>Edge</span>
              <strong>{toEdge(insight.edgePercentagePoints)}</strong>
            </div>
            <div>
              <span>Bias</span>
              <strong>{formatBias(insight.tradeBias)}</strong>
            </div>
          </div>

          <div className="insightTextBlock">
            <span>Why the model differs</span>
            <p>{insight.summary}</p>
          </div>

          <div className="marketInsightSignalRow">
            <span>Confidence {toPercent(insight.confidence)}</span>
            <span>{insight.sources.length} sources</span>
            <span>{insight.provider} / {insight.model}</span>
          </div>
        </div>
      )}
    </article>
  );
};
