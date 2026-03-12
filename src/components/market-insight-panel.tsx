"use client";

import { useEffect, useMemo, useState } from "react";
import { AiProvider, Market, MarketInsight, RuntimeConfig } from "@/lib/types";

interface MarketInsightPanelProps {
  market: Market | null;
  runtime: RuntimeConfig | null;
  insight: MarketInsight | null;
  pending: boolean;
  onGenerate: (options: { angle?: string; provider?: AiProvider; model?: string }) => Promise<void>;
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

const toProviderLabel = (provider: AiProvider): string => {
  return provider === "anthropic" ? "Anthropic" : "OpenAI";
};

export const MarketInsightPanel = ({
  market,
  runtime,
  insight,
  pending,
  onGenerate
}: MarketInsightPanelProps) => {
  const [angle, setAngle] = useState("");
  const [provider, setProvider] = useState<AiProvider | "">("");
  const [model, setModel] = useState("");

  const enabledProviders = useMemo(
    () => runtime?.aiProviders.filter((entry) => entry.enabled) ?? [],
    [runtime?.aiProviders]
  );

  useEffect(() => {
    setAngle("");
  }, [market?.id]);

  useEffect(() => {
    if (!runtime) {
      return;
    }

    const fallbackProvider = runtime.aiDefaultProvider ?? enabledProviders[0]?.id ?? "";
    setProvider((current) => {
      if (current && enabledProviders.some((entry) => entry.id === current)) {
        return current;
      }

      return fallbackProvider;
    });
  }, [enabledProviders, runtime]);

  useEffect(() => {
    if (!provider) {
      setModel("");
      return;
    }

    const providerConfig = enabledProviders.find((entry) => entry.id === provider);
    setModel(providerConfig?.defaultModel ?? "");
  }, [enabledProviders, provider]);

  const selectedProvider = enabledProviders.find((entry) => entry.id === provider) ?? null;

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
        <p className="emptyState">Fetching backend runtime so the AI panel can determine which providers are enabled.</p>
      </section>
    );
  }

  if (!runtime.aiEnabled || enabledProviders.length === 0) {
    return (
      <section className="panel insightPanel">
        <div className="panelHeaderRow">
          <div>
            <span className="eyebrow">AI Market Thesis</span>
            <h2>No provider configured</h2>
          </div>
          <span className="tag">Offline</span>
        </div>
        <p>
          Set <code>OPENAI_API_KEY</code> and/or <code>ANTHROPIC_API_KEY</code> on the backend to enable
          multi-model market insights.
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
          <span className="tag">{selectedProvider ? toProviderLabel(selectedProvider.id) : "AI"}</span>
          {selectedProvider?.webSearchEnabled ? <span className="tag">Grounded Web</span> : null}
        </div>
      </div>

      <p className="insightIntro">
        Pick a provider and model, then generate a structured thesis with fair odds, confidence, catalysts, and
        execution guidance for <strong>{market.question}</strong>.
      </p>

      <div className="inputGrid insightControlGrid">
        <label className="compactField">
          Provider
          <select value={provider} onChange={(event) => setProvider(event.target.value as AiProvider)}>
            {enabledProviders.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <label className="compactField">
          Model
          <input
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder={selectedProvider?.defaultModel ?? "Enter provider model"}
          />
        </label>
      </div>

      <label className="compactField">
        Optional angle
        <input
          value={angle}
          onChange={(event) => setAngle(event.target.value)}
          placeholder="Ex: focus on event risk, momentum, or why the market may be mispriced"
        />
      </label>

      <div className="insightActions">
        <button
          type="button"
          onClick={() =>
            void onGenerate({
              angle: angle.trim() || undefined,
              provider: provider || undefined,
              model: model.trim() || undefined
            })
          }
          disabled={pending || !provider}
        >
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
            <span>Provider: {toProviderLabel(insight.provider)} / {insight.model}</span>
            <span>Horizon: {insight.timeHorizon}</span>
            <span>Generated: {formatDate(insight.generatedAt)}</span>
          </div>
          <p className="insightDisclaimer">{insight.disclaimer}</p>
        </div>
      ) : (
        <p className="emptyState">No thesis yet. Pick a provider, then generate one to score this market.</p>
      )}
    </section>
  );
};
