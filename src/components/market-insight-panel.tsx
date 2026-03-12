"use client";

import { useEffect, useState } from "react";
import { Market, MarketInsight, RuntimeConfig } from "@/lib/types";

interface MarketInsightPanelProps {
  market: Market | null;
  runtime: RuntimeConfig | null;
  insight: MarketInsight | null;
  pending: boolean;
  onGenerate: (angle?: string) => Promise<void>;
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

const formatDate = (value: string): string => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

export const MarketInsightPanel = ({
  market,
  runtime,
  insight,
  pending,
  onGenerate
}: MarketInsightPanelProps) => {
  const [angle, setAngle] = useState("");

  useEffect(() => {
    setAngle("");
  }, [market?.id]);

  if (!market) {
    return (
      <section className="panel insightPanel emptyPanel">
        <span className="eyebrow">AI Market Thesis</span>
        <h2>No market selected</h2>
        <p className="emptyState">Pick a live market to generate a structured AI thesis and execution view.</p>
      </section>
    );
  }

  if (!runtime) {
    return (
      <section className="panel insightPanel emptyPanel">
        <span className="eyebrow">AI Market Thesis</span>
        <h2>Loading runtime</h2>
        <p className="emptyState">Fetching backend runtime so the AI panel can determine whether insight generation is available.</p>
      </section>
    );
  }

  if (!runtime?.aiEnabled) {
    return (
      <section className="panel insightPanel">
        <div className="panelHeaderRow">
          <div>
            <span className="eyebrow">AI Market Thesis</span>
            <h2>Provider not configured</h2>
          </div>
          <span className="tag">Offline</span>
        </div>
        <p>
          Set <code>OPENAI_API_KEY</code> on the backend to enable structured market insights for the selected
          Polymarket contract.
        </p>
      </section>
    );
  }

  return (
    <section className="panel insightPanel">
      <div className="panelHeaderRow">
        <div>
          <span className="eyebrow">AI Market Thesis</span>
          <h2>Model view on this market</h2>
        </div>
        <div className="featuredTags">
          <span className="tag">{runtime.aiModel ?? "AI"}</span>
          {runtime.aiWebSearchEnabled ? <span className="tag">Grounded Web</span> : null}
        </div>
      </div>

      <p className="insightIntro">
        Generate a structured thesis with fair odds, confidence, catalysts, and execution guidance for{" "}
        <strong>{market.question}</strong>.
      </p>

      <label className="compactField">
        Optional angle
        <input
          value={angle}
          onChange={(event) => setAngle(event.target.value)}
          placeholder="Ex: focus on event risk, momentum, or why the market may be mispriced"
        />
      </label>

      <div className="insightActions">
        <button type="button" onClick={() => void onGenerate(angle.trim() || undefined)} disabled={pending}>
          {pending ? "Generating..." : insight ? "Refresh Insight" : "Generate Insight"}
        </button>
      </div>

      {insight ? (
        <div className="insightBody">
          <div className="insightMetrics">
            <article className="insightMetric">
              <span>Market YES</span>
              <strong>{toPercent(insight.marketProbabilityYes)}</strong>
            </article>
            <article className="insightMetric">
              <span>Fair YES</span>
              <strong>{toPercent(insight.fairProbabilityYes)}</strong>
            </article>
            <article className="insightMetric">
              <span>Edge</span>
              <strong>{toEdge(insight.edgePercentagePoints)}</strong>
            </article>
            <article className="insightMetric">
              <span>Confidence</span>
              <strong>{toPercent(insight.confidence)}</strong>
            </article>
            <article className="insightMetric">
              <span>Bias</span>
              <strong>{formatBias(insight.tradeBias)}</strong>
            </article>
          </div>

          <div className="insightTextBlock">
            <span>Summary</span>
            <p>{insight.summary}</p>
          </div>

          <div className="insightColumns">
            <div className="insightTextBlock">
              <span>Base case</span>
              <p>{insight.thesis}</p>
            </div>
            <div className="insightTextBlock">
              <span>Counter case</span>
              <p>{insight.counterThesis}</p>
            </div>
          </div>

          <div className="insightColumns">
            <div className="insightListBlock">
              <span>Catalysts</span>
              <ul>
                {insight.keyCatalysts.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="insightListBlock">
              <span>Risk flags</span>
              <ul>
                {insight.riskFlags.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="insightTextBlock">
            <span>Execution plan</span>
            <ul className="insightExecutionList">
              {insight.executionPlan.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          {insight.sources.length > 0 ? (
            <div className="insightListBlock">
              <span>Sources</span>
              <ul className="insightSources">
                {insight.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="insightFooter">
            <span>Horizon: {insight.timeHorizon}</span>
            <span>Generated: {formatDate(insight.generatedAt)}</span>
          </div>
          <p className="insightDisclaimer">{insight.disclaimer}</p>
        </div>
      ) : (
        <p className="emptyState">No thesis yet. Generate one to score this market before you publish or trade.</p>
      )}
    </section>
  );
};
