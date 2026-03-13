"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AiProvider,
  AgentEvaluationSnapshot,
  AgentReviewRecord,
  AgentSession,
  AuthSession,
  AutomationPlan,
  GenerateAutomationPlanPayload,
  Market,
  PnlLedgerEntry,
  PnlLedgerRollupItem,
  PnlLedgerRollups,
  PnlLedgerSummary,
  RuntimeConfig
} from "@/lib/types";

interface AgentAutomationPanelProps {
  runtime: RuntimeConfig | null;
  authSession: AuthSession | null;
  markets: Market[];
  plan: AutomationPlan | null;
  session: AgentSession | null;
  evaluation: AgentEvaluationSnapshot | null;
  pnlSummary: PnlLedgerSummary | null;
  pnlEntries: PnlLedgerEntry[];
  pnlRollups: PnlLedgerRollups | null;
  agentReviews: AgentReviewRecord[];
  planPending: boolean;
  executionPending: boolean;
  onGeneratePlan: (payload: GenerateAutomationPlanPayload) => Promise<void>;
  onExecutePlan: () => Promise<void>;
  onHaltPlan: () => void;
}

const defaultForm = {
  bankrollUsd: "1000",
  targetReturnPct: "18",
  timeHorizonDays: "21",
  maxDrawdownPct: "8",
  dailyLossLimitUsd: "75",
  maxPositions: "4",
  reserveRatioPct: "20",
  profitReinvestmentPct: "60",
  rebalanceIntervalHours: "24",
  maxConsecutiveLosses: "2",
  objective: "Compound steadily while preserving capital first."
};

const formatUsd = (value: number): string => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const formatPercent = (value: number): string => `${value.toFixed(1)}%`;
const formatProbability = (value: number): string => formatPercent(value * 100);

export const AgentAutomationPanel = ({
  runtime,
  authSession,
  markets,
  plan,
  session,
  evaluation,
  pnlSummary,
  pnlEntries,
  pnlRollups,
  agentReviews,
  planPending,
  executionPending,
  onGeneratePlan,
  onExecutePlan,
  onHaltPlan
}: AgentAutomationPanelProps) => {
  const [values, setValues] = useState(defaultForm);
  const [provider, setProvider] = useState<AiProvider | "">("");
  const [model, setModel] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const enabledProviders = useMemo(
    () => runtime?.aiProviders.filter((entry) => entry.enabled) ?? [],
    [runtime?.aiProviders]
  );
  const availableCategories = useMemo(
    () => Array.from(new Set(markets.map((market) => market.category))).sort().slice(0, 10),
    [markets]
  );

  useEffect(() => {
    if (!runtime) {
      return;
    }

    const fallbackProvider = runtime.aiDefaultProvider ?? enabledProviders[0]?.id ?? "";
    setProvider((current) => current || fallbackProvider);
  }, [enabledProviders, runtime]);

  useEffect(() => {
    if (!provider) {
      setModel("");
      return;
    }

    const matchedProvider = enabledProviders.find((entry) => entry.id === provider);
    setModel(matchedProvider?.defaultModel ?? "");
  }, [enabledProviders, provider]);

  const selectedProvider = enabledProviders.find((entry) => entry.id === provider) ?? null;

  const renderRollupList = (title: string, items: PnlLedgerRollupItem[]) => (
    <div className="agentRollupBlock">
      <span>{title}</span>
      {items.length > 0 ? (
        <div className="agentRollupList">
          {items.map((item) => (
            <div key={item.key} className="agentRollupRow">
              <div>
                <strong>{item.label}</strong>
                <span>
                  {item.closedTrades} trades · {(item.winRate * 100).toFixed(1)}% win rate
                </span>
                {item.subtitle ? <span>{item.subtitle}</span> : null}
              </div>
              <div className={item.totalRealizedPnlUsd >= 0 ? "agentLedgerPositive" : "agentLedgerNegative"}>
                {formatUsd(item.totalRealizedPnlUsd)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="emptyState">No closed-trade groups yet.</p>
      )}
    </div>
  );

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((entry) => entry !== category) : [...current, category]
    );
  };

  const submitPlan = async () => {
    await onGeneratePlan({
      bankrollUsd: Number(values.bankrollUsd),
      targetReturnPct: Number(values.targetReturnPct),
      timeHorizonDays: Number(values.timeHorizonDays),
      maxDrawdownPct: Number(values.maxDrawdownPct),
      dailyLossLimitUsd: Number(values.dailyLossLimitUsd),
      maxPositions: Number(values.maxPositions),
      reserveRatio: Number(values.reserveRatioPct) / 100,
      profitReinvestmentPct: Number(values.profitReinvestmentPct),
      rebalanceIntervalHours: Number(values.rebalanceIntervalHours),
      maxConsecutiveLosses: Number(values.maxConsecutiveLosses),
      preferredCategories: selectedCategories.length > 0 ? selectedCategories : undefined,
      provider: provider || undefined,
      model: model.trim() || undefined,
      objective: values.objective.trim() || undefined
    });
  };

  return (
    <section className="panel railPanel agentPanel">
      <div className="panelHeaderRow">
        <div>
          <span className="eyebrow">Agent Layer</span>
          <h2>Automate bankroll allocation</h2>
          <p>Build a guarded multi-market plan, deploy capital across live markets, and halt automatically on risk breaches.</p>
        </div>
        <div className="featuredTags">
          <span className="tag">{selectedProvider?.label ?? "AI"}</span>
          <span className="tag">{runtime?.executionMode === "live" ? "Live execution" : "Live mode needed"}</span>
          <span className="tag">{runtime?.agentWorkerEnabled ? "Auto-review on" : "Auto-review off"}</span>
          <span className="tag">{authSession ? "Wallet ready" : "Wallet needed"}</span>
        </div>
      </div>

      {!runtime?.aiEnabled ? (
        <p className="emptyState">Configure Anthropic or OpenAI on the backend to enable the portfolio agent.</p>
      ) : (
        <>
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
                placeholder={selectedProvider?.defaultModel ?? "claude-sonnet-4-5"}
              />
            </label>
          </div>

          <div className="inputGrid">
            <label>
              Bankroll USD
              <input value={values.bankrollUsd} onChange={(event) => setValues({ ...values, bankrollUsd: event.target.value })} />
            </label>
            <label>
              Target Return %
              <input value={values.targetReturnPct} onChange={(event) => setValues({ ...values, targetReturnPct: event.target.value })} />
            </label>
            <label>
              Time Horizon Days
              <input value={values.timeHorizonDays} onChange={(event) => setValues({ ...values, timeHorizonDays: event.target.value })} />
            </label>
            <label>
              Max Positions
              <input value={values.maxPositions} onChange={(event) => setValues({ ...values, maxPositions: event.target.value })} />
            </label>
            <label>
              Max Drawdown %
              <input value={values.maxDrawdownPct} onChange={(event) => setValues({ ...values, maxDrawdownPct: event.target.value })} />
            </label>
            <label>
              Daily Loss Limit USD
              <input value={values.dailyLossLimitUsd} onChange={(event) => setValues({ ...values, dailyLossLimitUsd: event.target.value })} />
            </label>
            <label>
              Reserve %
              <input value={values.reserveRatioPct} onChange={(event) => setValues({ ...values, reserveRatioPct: event.target.value })} />
            </label>
            <label>
              Reinvest Profit %
              <input value={values.profitReinvestmentPct} onChange={(event) => setValues({ ...values, profitReinvestmentPct: event.target.value })} />
            </label>
            <label>
              Rebalance Hours
              <input value={values.rebalanceIntervalHours} onChange={(event) => setValues({ ...values, rebalanceIntervalHours: event.target.value })} />
            </label>
            <label>
              Max Consecutive Losses
              <input value={values.maxConsecutiveLosses} onChange={(event) => setValues({ ...values, maxConsecutiveLosses: event.target.value })} />
            </label>
          </div>

          <label>
            Objective
            <textarea
              value={values.objective}
              onChange={(event) => setValues({ ...values, objective: event.target.value })}
              placeholder="Tell the agent what kind of growth and discipline you want."
            />
          </label>

          <div className="agentCategoryStrip">
            {availableCategories.map((category) => (
              <button
                key={category}
                type="button"
                className={`marketTopicChip ${selectedCategories.includes(category) ? "marketTopicChipActive" : ""}`.trim()}
                onClick={() => toggleCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="agentActionRow">
            <button type="button" onClick={() => void submitPlan()} disabled={planPending}>
              {planPending ? "Building plan..." : "Generate Agent Plan"}
            </button>
            <button
              type="button"
              className="ghostAction"
              onClick={() => void onExecutePlan()}
              disabled={executionPending || !plan || !authSession || runtime?.executionMode !== "live"}
            >
              {executionPending ? "Executing..." : "Execute Plan"}
            </button>
            <button type="button" className="ghostAction" onClick={onHaltPlan} disabled={!session}>
              Halt Agent
            </button>
          </div>
        </>
      )}

      <div className="agentMicroCopy">
        <span>Capital reserve</span>
        <span>{values.reserveRatioPct}% held back</span>
        <span>Reinvest profits</span>
        <span>{values.profitReinvestmentPct}% on rebalance</span>
      </div>

      {session ? (
        <div className="agentSessionSummary">
          <div className="agentMetricGrid">
            <div>
              <span>Status</span>
              <strong>{session.status}</strong>
            </div>
            <div>
              <span>Deployable</span>
              <strong>{formatUsd(session.plan.deployableUsd)}</strong>
            </div>
            <div>
              <span>Reserve</span>
              <strong>{formatUsd(session.plan.reserveUsd)}</strong>
            </div>
            <div>
              <span>Rebalance</span>
              <strong>{session.plan.rebalanceIntervalHours}h</strong>
            </div>
            <div>
              <span>Last review</span>
              <strong>{session.lastReviewedAt ? new Date(session.lastReviewedAt).toLocaleString() : "--"}</strong>
            </div>
          </div>

          {evaluation ? (
            <div className="agentMetricGrid">
              <div>
                <span>Mark-to-market</span>
                <strong>{formatUsd(evaluation.markToMarketPnlUsd)}</strong>
              </div>
              <div>
                <span>Realized PnL</span>
                <strong>{formatUsd(evaluation.realizedPnlUsd)}</strong>
              </div>
              <div>
                <span>Drawdown</span>
                <strong>{formatPercent(evaluation.drawdownPct)}</strong>
              </div>
              <div>
                <span>Day PnL</span>
                <strong>{formatUsd(evaluation.dayPnlUsd)}</strong>
              </div>
              <div>
                <span>Effective bankroll</span>
                <strong>{formatUsd(evaluation.effectiveBankrollUsd)}</strong>
              </div>
              <div>
                <span>Loss streak</span>
                <strong>{evaluation.consecutiveLosses}</strong>
              </div>
              <div>
                <span>Compounding base</span>
                <strong>{formatUsd(evaluation.compoundingBankrollUsd)}</strong>
              </div>
            </div>
          ) : null}

          {session.haltReason ? <p className="emptyState">{session.haltReason}</p> : null}

          <div className="agentReviewHistory">
            <div className="insightTextBlock">
              <span>Review history</span>
              <p>
                Worker decisions recorded on each due review cycle so the agent state is inspectable.
              </p>
            </div>

            {agentReviews.length > 0 ? (
              <div className="agentReviewList">
                {agentReviews.map((review) => (
                  <div key={review.id} className="agentReviewRow">
                    <div>
                      <strong>{new Date(review.reviewedAt).toLocaleString()}</strong>
                      <span>
                        {formatUsd(review.evaluation.effectiveBankrollUsd)} effective ·{" "}
                        {formatUsd(review.evaluation.dayPnlUsd)} day PnL ·{" "}
                        {formatPercent(review.evaluation.drawdownPct)} drawdown
                      </span>
                    </div>
                    <div className="agentReviewMeta">
                      <span
                        className={
                          review.decision === "halt" ? "agentReviewDecision agentReviewDecisionHalt" : "agentReviewDecision agentReviewDecisionHold"
                        }
                      >
                        {review.decision === "halt" ? "Halt" : "Hold"}
                      </span>
                      <span>{review.reason ?? "Risk checks passed."}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="emptyState">No worker reviews yet. Start the agent and wait for the first scheduled review cycle.</p>
            )}
          </div>
        </div>
      ) : null}

      {plan ? (
        <div className="agentPlanBody">
          <div className="insightTextBlock">
            <span>Agent summary</span>
            <p>{plan.summary}</p>
          </div>

          <div className="insightTextBlock">
            <span>Compounding policy</span>
            <p>{plan.compoundingNote}</p>
          </div>

          <div className="insightColumns">
            <div className="insightListBlock">
              <span>Review plan</span>
              <ul>
                {plan.reviewPlan.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="insightListBlock">
              <span>Safeguards</span>
              <ul>
                {plan.safeguards.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="agentMetricGrid">
            <div>
              <span>Target return</span>
              <strong>{formatPercent(plan.targetReturnPct)}</strong>
            </div>
            <div>
              <span>Horizon</span>
              <strong>{plan.timeHorizonDays}d</strong>
            </div>
            <div>
              <span>Max drawdown</span>
              <strong>{formatPercent(plan.haltRules.maxDrawdownPct)}</strong>
            </div>
            <div>
              <span>Daily loss cap</span>
              <strong>{formatUsd(plan.haltRules.dailyLossLimitUsd)}</strong>
            </div>
          </div>

          {pnlSummary ? (
            <div className="agentPnlSummary">
              <div className="insightTextBlock">
                <span>Realized ledger</span>
                <p>
                  {pnlSummary.closedTrades} closed trades · {formatUsd(pnlSummary.totalRealizedPnlUsd)} realized ·{" "}
                  {(pnlSummary.winRate * 100).toFixed(1)}% win rate
                </p>
              </div>

              {pnlEntries.length > 0 ? (
                <div className="agentLedgerList">
                  {pnlEntries.map((entry) => (
                    <div key={entry.id} className="agentLedgerRow">
                      <div>
                        <strong>{entry.marketId}</strong>
                        <span>
                          {entry.outcome} · {entry.source}
                        </span>
                      </div>
                      <div className={entry.realizedPnlUsd >= 0 ? "agentLedgerPositive" : "agentLedgerNegative"}>
                        {formatUsd(entry.realizedPnlUsd)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="emptyState">No realized exits yet. Closed trades will appear here once the ledger matches buys against sells.</p>
              )}

              {pnlRollups ? (
                <div className="agentRollupGrid">
                  {renderRollupList("By market", pnlRollups.byMarket)}
                  {renderRollupList("By category", pnlRollups.byCategory)}
                  {renderRollupList("By strategy", pnlRollups.byStrategy)}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="agentLegList">
            {plan.legs.map((leg) => (
              <article key={leg.marketId} className="agentLegCard">
                <div className="agentLegTop">
                  <div>
                    <span className="eyebrow">{leg.category} · {leg.subcategory}</span>
                    <h3>{leg.question}</h3>
                  </div>
                  <span className="tag">{leg.action === "buy_yes" ? "Buy YES" : "Buy NO"}</span>
                </div>
                <div className="agentLegMetrics">
                  <span>{formatUsd(leg.allocationUsd)}</span>
                  <span>Market {formatProbability(leg.marketProbabilityYes)}</span>
                  <span>Fair {formatProbability(leg.fairProbabilityYes)}</span>
                  <span>Conviction {formatProbability(leg.conviction)}</span>
                </div>
                <p>{leg.rationale}</p>
                <div className="agentLegFooter">
                  <span>Stop {formatProbability(leg.stopLossProbability)}</span>
                  <span>Take profit {formatProbability(leg.takeProfitProbability)}</span>
                  <span>Hold {leg.maxHoldingHours}h</span>
                </div>
              </article>
            ))}
          </div>

          {plan.sources.length > 0 ? (
            <div className="insightListBlock">
              <span>Grounding sources</span>
              <ul>
                {plan.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
