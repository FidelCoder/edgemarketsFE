"use client";

import { AgentReviewDecision, AgentReviewRecord, AgentReviewSummary, PnlLedgerEntry, PnlLedgerRollupItem, PnlLedgerRollups, PnlLedgerSummary } from "@/lib/types";

interface AgentAnalyticsPanelProps {
  pnlSummary: PnlLedgerSummary | null;
  pnlEntries: PnlLedgerEntry[];
  pnlRollups: PnlLedgerRollups | null;
  agentReviewSummary: AgentReviewSummary | null;
  agentReviews: AgentReviewRecord[];
  reviewFilter: AgentReviewDecision | "all";
  reviewLimit: number;
  dateFrom: string;
  dateTo: string;
  exportingPnl: boolean;
  exportingReviews: boolean;
  onReviewFilterChange: (value: AgentReviewDecision | "all") => void;
  onReviewLimitChange: (value: number) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onExportPnl: () => void;
  onExportReviews: () => void;
}

const formatUsd = (value: number): string => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

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

export const AgentAnalyticsPanel = ({
  pnlSummary,
  pnlEntries,
  pnlRollups,
  agentReviewSummary,
  agentReviews,
  reviewFilter,
  reviewLimit,
  dateFrom,
  dateTo,
  exportingPnl,
  exportingReviews,
  onReviewFilterChange,
  onReviewLimitChange,
  onDateFromChange,
  onDateToChange,
  onExportPnl,
  onExportReviews
}: AgentAnalyticsPanelProps) => {
  return (
    <>
      <div className="agentReviewHistory">
        <div className="insightTextBlock">
          <span>Analytics window</span>
          <p>Filter realized PnL and worker reviews by time window, then export the exact slice as CSV.</p>
        </div>

        <div className="agentAnalyticsToolbar">
          <label className="compactField">
            Date from
            <input type="date" value={dateFrom} onChange={(event) => onDateFromChange(event.target.value)} />
          </label>

          <label className="compactField">
            Date to
            <input type="date" value={dateTo} onChange={(event) => onDateToChange(event.target.value)} />
          </label>

          <label className="compactField">
            Decision
            <select
              value={reviewFilter}
              onChange={(event) => onReviewFilterChange(event.target.value as AgentReviewDecision | "all")}
            >
              <option value="all">All</option>
              <option value="hold">Hold</option>
              <option value="halt">Halt</option>
            </select>
          </label>

          <label className="compactField">
            Limit
            <select value={String(reviewLimit)} onChange={(event) => onReviewLimitChange(Number(event.target.value))}>
              <option value="5">5</option>
              <option value="8">8</option>
              <option value="12">12</option>
              <option value="20">20</option>
            </select>
          </label>

          <div className="agentExportActions">
            <button type="button" className="ghostAction" onClick={onExportPnl} disabled={exportingPnl}>
              {exportingPnl ? "Exporting PnL..." : "Export PnL CSV"}
            </button>
            <button type="button" className="ghostAction" onClick={onExportReviews} disabled={exportingReviews}>
              {exportingReviews ? "Exporting Reviews..." : "Export Reviews CSV"}
            </button>
          </div>
        </div>

        {agentReviewSummary ? (
          <div className="agentReviewSummaryGrid">
            <div>
              <span>Total reviews</span>
              <strong>{agentReviewSummary.totalReviews}</strong>
            </div>
            <div>
              <span>Hold / Halt</span>
              <strong>
                {agentReviewSummary.holdDecisions} / {agentReviewSummary.haltDecisions}
              </strong>
            </div>
            <div>
              <span>Halt rate</span>
              <strong>{(agentReviewSummary.haltRate * 100).toFixed(1)}%</strong>
            </div>
            <div>
              <span>Avg drawdown</span>
              <strong>{formatPercent(agentReviewSummary.averageDrawdownPct)}</strong>
            </div>
            <div>
              <span>Avg day PnL</span>
              <strong>{formatUsd(agentReviewSummary.averageDayPnlUsd)}</strong>
            </div>
          </div>
        ) : null}

        {agentReviews.length > 0 ? (
          <div className="agentReviewList">
            {agentReviews.map((review) => (
              <div key={review.id} className="agentReviewRow">
                <div>
                  <strong>{new Date(review.reviewedAt).toLocaleString()}</strong>
                  <span>
                    {formatUsd(review.evaluation.effectiveBankrollUsd)} effective · {formatUsd(review.evaluation.dayPnlUsd)} day
                    PnL · {formatPercent(review.evaluation.drawdownPct)} drawdown
                  </span>
                </div>
                <div className="agentReviewMeta">
                  <span
                    className={
                      review.decision === "halt"
                        ? "agentReviewDecision agentReviewDecisionHalt"
                        : "agentReviewDecision agentReviewDecisionHold"
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
          <p className="emptyState">No worker reviews found for the current filter window.</p>
        )}
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
            <p className="emptyState">No realized exits found for the current filter window.</p>
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
    </>
  );
};
