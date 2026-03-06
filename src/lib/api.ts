import { apiBaseUrl } from "./config";
import {
  ApiEnvelope,
  CreateStrategyPayload,
  Follow,
  FollowStrategyPayload,
  Market,
  RuntimeConfig,
  StablecoinAsset,
  Strategy
} from "./types";

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  const body = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || body.error) {
    throw new Error(body.error?.message ?? "Unexpected API error.");
  }

  if (!body.data) {
    throw new Error("API response did not include data.");
  }

  return body.data;
};

export const edgeApi = {
  listMarkets: (): Promise<Market[]> => request<Market[]>("/api/markets"),

  listStablecoins: (): Promise<StablecoinAsset[]> => request<StablecoinAsset[]>("/api/stablecoins"),

  getRuntimeConfig: (): Promise<RuntimeConfig> => request<RuntimeConfig>("/api/runtime/config"),

  listStrategies: (): Promise<Strategy[]> => request<Strategy[]>("/api/strategies"),

  createStrategy: (payload: CreateStrategyPayload): Promise<Strategy> =>
    request<Strategy>("/api/strategies", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  followStrategy: (
    strategyId: string,
    payload: FollowStrategyPayload
  ): Promise<{ follow: Follow; strategy: Strategy }> =>
    request<{ follow: Follow; strategy: Strategy }>(`/api/strategies/${strategyId}/follows`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  listUserFollows: (userId: string): Promise<Follow[]> => request<Follow[]>(`/api/users/${userId}/follows`)
};
