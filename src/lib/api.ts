import { apiBaseUrl } from "./config";
import {
  ApiEnvelope,
  AuditLog,
  CreateStrategyPayload,
  Follow,
  FollowStrategyPayload,
  Market,
  MutationResult,
  RuntimeConfig,
  StablecoinAsset,
  Strategy
} from "./types";

const IDEMPOTENCY_HEADER = "idempotency-key";
const IDEMPOTENCY_STATUS_HEADER = "idempotency-status";

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
  const body = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || body.error) {
    throw new Error(body.error?.message ?? "Unexpected API error.");
  }

  return body;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(buildRequest(path, init));
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
  const response = await fetch(
    buildRequest(path, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        [IDEMPOTENCY_HEADER]: idempotencyKey
      }
    })
  );

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

export const edgeApi = {
  listMarkets: (): Promise<Market[]> => request<Market[]>("/api/markets"),

  listStablecoins: (): Promise<StablecoinAsset[]> => request<StablecoinAsset[]>("/api/stablecoins"),

  getRuntimeConfig: (): Promise<RuntimeConfig> => request<RuntimeConfig>("/api/runtime/config"),

  listStrategies: (): Promise<Strategy[]> => request<Strategy[]>("/api/strategies"),

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

  listUserFollows: (userId: string): Promise<Follow[]> => request<Follow[]>(`/api/users/${userId}/follows`),

  listAuditLogs: (limit = 40): Promise<AuditLog[]> => request<AuditLog[]>(`/api/audit-logs?limit=${limit}`)
};
