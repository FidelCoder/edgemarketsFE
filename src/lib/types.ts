export type TriggerType = "price_above" | "price_below" | "time_window";

export type ActionType = "buy_yes" | "buy_no" | "sell_yes" | "sell_no";

export type StablecoinSymbol = "USDC" | "USDT" | "DAI";

export type NetworkMode = "testnet" | "mainnet";

export type ExecutionMode = "simulated" | "live";

export type StoreProvider = "mongodb" | "memory";

export interface ApiEnvelope<T> {
  data: T | null;
  error: {
    message: string;
  } | null;
}

export interface Market {
  id: string;
  question: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  liquidityUsd: number;
  updatedAt: string;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  marketId: string;
  triggerType: TriggerType;
  conditionValue: number;
  action: ActionType;
  allocationUsd: number;
  creatorHandle: string;
  followerCount: number;
  createdAt: string;
  market: Market;
}

export interface Follow {
  id: string;
  userId: string;
  strategyId: string;
  maxDailyLossUsd: number;
  maxMarketExposureUsd: number;
  fundingStablecoin: StablecoinSymbol;
  status: "active" | "paused";
  createdAt: string;
  strategy: Strategy;
}

export interface StablecoinAsset {
  symbol: StablecoinSymbol;
  chain: "Polygon";
  settlementAsset: "USDC";
  conversionRequired: boolean;
}

export interface RuntimeConfig {
  networkMode: NetworkMode;
  polygonNetwork: string;
  polymarketEnvironment: string;
  executionMode: ExecutionMode;
  storeProvider: StoreProvider;
  triggerWorkerEnabled: boolean;
  triggerWorkerIntervalMs: number;
  triggerWorkerBatchSize: number;
  supportedStablecoins: StablecoinSymbol[];
}

export interface CreateStrategyPayload {
  name: string;
  description: string;
  marketId: string;
  triggerType: TriggerType;
  conditionValue: number;
  action: ActionType;
  allocationUsd: number;
  creatorHandle: string;
}

export interface FollowStrategyPayload {
  userId: string;
  maxDailyLossUsd: number;
  maxMarketExposureUsd: number;
  fundingStablecoin: StablecoinSymbol;
}
