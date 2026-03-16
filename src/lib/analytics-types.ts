import type { AgentReviewDecision } from "./types";

export interface AnalyticsDateRangeQuery {
  dateFrom?: string;
  dateTo?: string;
}

export interface PnlLedgerQueryOptions extends AnalyticsDateRangeQuery {
  limit?: number;
}

export interface AgentReviewQueryOptions extends AnalyticsDateRangeQuery {
  decision?: AgentReviewDecision;
  limit?: number;
}
