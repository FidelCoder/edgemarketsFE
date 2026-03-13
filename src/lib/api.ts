import { apiBaseUrl } from "./config";
import { AgentReviewQueryOptions, PnlLedgerQueryOptions } from "./analytics-types";
import {
  AgentReviewRecord,
  AgentReviewSummary,
  AgentSession,
  ApiEnvelope,
  AutomationPlan,
  AuditLog,
  AuditLogQuery,
  AuthChallenge,
  AuthSession,
  CreateOrderRecordPayload,
  CreateStrategyPayload,
  CreateTriggerJobPayload,
  CreatorPerformanceSummary,
  Follow,
  FollowStrategyPayload,
  GenerateMarketInsightPayload,
  GenerateAutomationPlanPayload,
  Market,
  MarketContext,
  MarketInsight,
  MutationResult,
  OrderQuery,
  OrderRecord,
  PnlLedgerEntry,
  PnlLedgerRollups,
  PnlLedgerSummary,
  PolymarketProfile,
  RuntimeConfig,
  StablecoinAsset,
  Strategy,
  UpsertAgentSessionPayload,
  TriggerJob
} from "./types";

const IDEMPOTENCY_HEADER = "idempotency-key";
const IDEMPOTENCY_STATUS_HEADER = "idempotency-status";

const toNetworkError = (error: unknown): Error => {
  if (!(error instanceof TypeError)) {
    return error instanceof Error ? error : new Error("Unexpected API error.");
  }

  const message = error.message.toLowerCase();
  const isLikelyNetworkError = message.includes("fetch") || message.includes("network");

  if (!isLikelyNetworkError) {
    return error;
  }

  return new Error(
    `Cannot reach backend at ${apiBaseUrl}. Start EdgeMarkets backend on port 4000 or set NEXT_PUBLIC_API_BASE_URL.`
  );
};

const buildRequest = (path: string, init?: RequestInit): Request => {
  return new Request(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });
};

const toQueryString = (query: Record<string, string | number | undefined>): string => {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};

const generateIdempotencyKey = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `edge:${crypto.randomUUID()}`;
  }

  const randomSegment = Math.random().toString(36).slice(2, 14);
  return `edge:${Date.now().toString(36)}:${randomSegment}`;
};

const parseIdempotencyStatus = (response: Response): "none" | "created" | "replayed" => {
  const rawStatus = response.headers.get(IDEMPOTENCY_STATUS_HEADER);

  if (rawStatus === "created" || rawStatus === "replayed") {
    return rawStatus;
  }

  return "none";
};

const parseEnvelope = async <T>(response: Response): Promise<ApiEnvelope<T>> => {
  let body: ApiEnvelope<T> | null = null;

  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(body?.error?.message ?? `Request failed with status ${response.status}.`);
  }

  if (!body || body.error) {
    throw new Error(body?.error?.message ?? "Unexpected API error.");
  }

  return body as ApiEnvelope<T>;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(buildRequest(path, init));
  } catch (error) {
    throw toNetworkError(error);
  }

  const body = await parseEnvelope<T>(response);

  if (!body.data) {
    throw new Error("API response did not include data.");
  }

  return body.data;
};

const requestMutation = async <T>(
  path: string,
  body: unknown,
  idempotencyKey = generateIdempotencyKey()
): Promise<MutationResult<T>> => {
  let response: Response;

  try {
    response = await fetch(
      buildRequest(path, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          [IDEMPOTENCY_HEADER]: idempotencyKey
        }
      })
    );
  } catch (error) {
    throw toNetworkError(error);
  }

  const envelope = await parseEnvelope<T>(response);

  if (!envelope.data) {
    throw new Error("API response did not include data.");
  }

  const returnedKey = response.headers.get(IDEMPOTENCY_HEADER) ?? idempotencyKey;

  return {
    data: envelope.data,
    idempotencyStatus: parseIdempotencyStatus(response),
    idempotencyKey: returnedKey
  };
};

const requestWithAuth = async <T>(path: string, sessionToken: string, init?: RequestInit): Promise<T> => {
  return request<T>(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      ...(init?.headers ?? {})
    }
  });
};

const requestWithAuthMaybe = async <T>(path: string, sessionToken: string, init?: RequestInit): Promise<T | null> => {
  let response: Response;

  try {
    response = await fetch(
      buildRequest(path, {
        ...init,
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          ...(init?.headers ?? {})
        }
      })
    );
  } catch (error) {
    throw toNetworkError(error);
  }

  if (response.status === 404) {
    return null;
  }

  const body = await parseEnvelope<T | null>(response);
  return body.data ?? null;
};

const downloadWithAuth = async (path: string, sessionToken: string): Promise<Blob> => {
  let response: Response;

  try {
    response = await fetch(
      buildRequest(path, {
        headers: {
          Authorization: `Bearer ${sessionToken}`
        }
      })
    );
  } catch (error) {
    throw toNetworkError(error);
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;

    try {
      const body = (await response.json()) as ApiEnvelope<null>;
      message = body.error?.message ?? message;
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  return response.blob();
};

export const edgeApi = {
  listMarkets: (): Promise<Market[]> => request<Market[]>("/api/markets"),

  getMarketContext: (marketId: string): Promise<MarketContext> =>
    request<MarketContext>(`/api/markets/${marketId}/context`),

  listStablecoins: (): Promise<StablecoinAsset[]> => request<StablecoinAsset[]>("/api/stablecoins"),

  getRuntimeConfig: (): Promise<RuntimeConfig> => request<RuntimeConfig>("/api/runtime/config"),

  generateMarketInsight: (payload: GenerateMarketInsightPayload): Promise<MarketInsight> =>
    request<MarketInsight>("/api/ai/market-insight", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  generateAutomationPlan: (payload: GenerateAutomationPlanPayload): Promise<AutomationPlan> =>
    request<AutomationPlan>("/api/ai/automation-plan", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  getAgentSession: (sessionToken: string): Promise<AgentSession | null> =>
    requestWithAuthMaybe<AgentSession>("/api/agent/session", sessionToken),

  upsertAgentSession: (sessionToken: string, payload: UpsertAgentSessionPayload): Promise<AgentSession> =>
    requestWithAuth<AgentSession>("/api/agent/session", sessionToken, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),

  listAgentReviews: (
    sessionToken: string,
    options: AgentReviewQueryOptions = {}
  ): Promise<AgentReviewRecord[]> =>
    requestWithAuth<AgentReviewRecord[]>(
      `/api/agent/reviews${toQueryString({
        limit: options.limit,
        decision: options.decision,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo
      })}`,
      sessionToken
    ),

  getAgentReviewSummary: (sessionToken: string, options: AgentReviewQueryOptions = {}): Promise<AgentReviewSummary> =>
    requestWithAuth<AgentReviewSummary>(
      `/api/agent/reviews/summary${toQueryString({
        decision: options.decision,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo
      })}`,
      sessionToken
    ),

  downloadAgentReviewsCsv: (sessionToken: string, options: AgentReviewQueryOptions = {}): Promise<Blob> =>
    downloadWithAuth(
      `/api/agent/reviews/export${toQueryString({
        limit: options.limit,
        decision: options.decision,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo
      })}`,
      sessionToken
    ),

  listPnlLedgerEntries: (sessionToken: string, options: PnlLedgerQueryOptions = {}): Promise<PnlLedgerEntry[]> =>
    requestWithAuth<PnlLedgerEntry[]>(
      `/api/pnl-ledger${toQueryString({
        limit: options.limit,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo
      })}`,
      sessionToken
    ),

  getPnlLedgerSummary: (sessionToken: string, options: PnlLedgerQueryOptions = {}): Promise<PnlLedgerSummary> =>
    requestWithAuth<PnlLedgerSummary>(
      `/api/pnl-ledger/summary${toQueryString({
        dateFrom: options.dateFrom,
        dateTo: options.dateTo
      })}`,
      sessionToken
    ),

  getPnlLedgerRollups: (sessionToken: string, options: PnlLedgerQueryOptions = {}): Promise<PnlLedgerRollups> =>
    requestWithAuth<PnlLedgerRollups>(
      `/api/pnl-ledger/rollups${toQueryString({
        limit: options.limit,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo
      })}`,
      sessionToken
    ),

  downloadPnlLedgerCsv: (sessionToken: string, options: PnlLedgerQueryOptions = {}): Promise<Blob> =>
    downloadWithAuth(
      `/api/pnl-ledger/export${toQueryString({
        limit: options.limit,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo
      })}`,
      sessionToken
    ),

  getPolymarketProfile: (walletAddress: string): Promise<PolymarketProfile> =>
    request<PolymarketProfile>(`/api/polymarket/profile/${walletAddress}`),

  listStrategies: (): Promise<Strategy[]> => request<Strategy[]>("/api/strategies"),

  getStrategy: (strategyId: string): Promise<Strategy> => request<Strategy>(`/api/strategies/${strategyId}`),

  getStrategyHistory: (strategyId: string, limit = 40): Promise<OrderRecord[]> =>
    request<OrderRecord[]>(`/api/strategies/${strategyId}/history${toQueryString({ limit })}`),

  getCreatorPerformance: (creatorHandle: string): Promise<CreatorPerformanceSummary> =>
    request<CreatorPerformanceSummary>(`/api/creators/${creatorHandle}/performance`),

  createStrategy: (
    payload: CreateStrategyPayload,
    idempotencyKey?: string
  ): Promise<MutationResult<Strategy>> => requestMutation<Strategy>("/api/strategies", payload, idempotencyKey),

  followStrategy: (
    strategyId: string,
    payload: FollowStrategyPayload,
    idempotencyKey?: string
  ): Promise<MutationResult<{ follow: Follow; strategy: Strategy }>> =>
    requestMutation<{ follow: Follow; strategy: Strategy }>(
      `/api/strategies/${strategyId}/follows`,
      payload,
      idempotencyKey
    ),

  createTriggerJob: (
    payload: CreateTriggerJobPayload,
    idempotencyKey?: string
  ): Promise<MutationResult<TriggerJob>> =>
    requestMutation<TriggerJob>("/api/trigger-jobs", payload, idempotencyKey),

  listUserFollows: (userId: string): Promise<Follow[]> => request<Follow[]>(`/api/users/${userId}/follows`),

  listAuditLogs: (query: AuditLogQuery = {}): Promise<AuditLog[]> =>
    request<AuditLog[]>(
      `/api/audit-logs${toQueryString({
        actorId: query.actorId,
        entityType: query.entityType,
        limit: query.limit ?? 40
      })}`
    ),

  createAuthChallenge: (walletAddress: string, client: "web" | "extension" = "web"): Promise<AuthChallenge> =>
    request<AuthChallenge>("/api/auth/challenge", {
      method: "POST",
      body: JSON.stringify({ walletAddress, client })
    }),

  verifyAuthChallenge: (
    challengeId: string,
    walletAddress: string,
    signature: string,
    client: "web" | "extension" = "web"
  ): Promise<AuthSession> =>
    request<AuthSession>("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ challengeId, walletAddress, signature, client })
    }),

  getCurrentSession: (sessionToken: string): Promise<AuthSession> =>
    requestWithAuth<AuthSession>("/api/auth/sessions/me", sessionToken),

  requestSessionHandoff: (
    sessionToken: string
  ): Promise<{ handoffCode: string; expiresAt: string }> =>
    requestWithAuth<{ handoffCode: string; expiresAt: string }>("/api/auth/handoff/request", sessionToken, {
      method: "POST"
    }),

  consumeSessionHandoff: (handoffCode: string): Promise<AuthSession> =>
    request<AuthSession>("/api/auth/handoff/consume", {
      method: "POST",
      body: JSON.stringify({ handoffCode })
    }),

  listOrders: (sessionToken: string, query: OrderQuery = {}): Promise<OrderRecord[]> =>
    requestWithAuth<OrderRecord[]>(
      `/api/orders${toQueryString({
        strategyId: query.strategyId,
        creatorHandle: query.creatorHandle,
        status: query.status,
        limit: query.limit ?? 40
      })}`,
      sessionToken
    ),

  upsertOrder: (sessionToken: string, payload: CreateOrderRecordPayload): Promise<OrderRecord> =>
    requestWithAuth<OrderRecord>("/api/orders", sessionToken, {
      method: "POST",
      body: JSON.stringify(payload)
    })
};
