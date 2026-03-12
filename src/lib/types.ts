export type TriggerType = "price_above" | "price_below" | "time_window";

export type ActionType = "buy_yes" | "buy_no" | "sell_yes" | "sell_no";

export type StablecoinSymbol = "USDC" | "USDT" | "DAI";

export type NetworkMode = "testnet" | "mainnet";

export type ExecutionMode = "simulated" | "live";

export type StoreProvider = "mongodb" | "memory";

export type AiProvider = "openai" | "anthropic";

export type IdempotencyStatus = "none" | "created" | "replayed";

export type AuditActorType = "user" | "system" | "worker";

export type AuditEntityType =
  | "strategy"
  | "follow"
  | "trigger_job"
  | "execution_log"
  | "idempotency"
  | "worker"
  | "session"
  | "handoff"
  | "order"
  | "market_insight";

export type AuthClient = "web" | "extension";

export type OrderLifecycleStatus = "submitted" | "open" | "filled" | "failed" | "retried";

export type PolymarketTradeStatus = "MATCHED" | "MINED" | "CONFIRMED" | "RETRYING" | "FAILED" | "UNKNOWN";

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
  slug: string;
  icon: string | null;
  endDate: string | null;
  yesTokenId: string;
  noTokenId: string;
  orderBookEnabled: boolean;
  negRisk: boolean;
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
  polymarketHost: string;
  polymarketGammaHost: string;
  polymarketChainId: number;
  polymarketMarketSource: "live" | "seed";
  executionMode: ExecutionMode;
  storeProvider: StoreProvider;
  triggerWorkerEnabled: boolean;
  triggerWorkerIntervalMs: number;
  triggerWorkerBatchSize: number;
  supportedStablecoins: StablecoinSymbol[];
  aiEnabled: boolean;
  aiDefaultProvider: AiProvider | null;
  aiModel: string | null;
  aiWebSearchEnabled: boolean;
  aiProviders: AiProviderSummary[];
}

export type MarketInsightTradeBias = "buy_yes" | "buy_no" | "wait";

export interface GenerateMarketInsightPayload {
  marketId: string;
  angle?: string;
  provider?: AiProvider;
  model?: string;
}

export interface MarketInsight {
  marketId: string;
  marketQuestion: string;
  marketProbabilityYes: number;
  fairProbabilityYes: number;
  edgePercentagePoints: number;
  confidence: number;
  provider: AiProvider;
  tradeBias: MarketInsightTradeBias;
  timeHorizon: string;
  summary: string;
  thesis: string;
  counterThesis: string;
  keyCatalysts: string[];
  riskFlags: string[];
  executionPlan: string[];
  sources: MarketInsightSource[];
  disclaimer: string;
  angle?: string;
  model: string;
  generatedAt: string;
}

export interface MarketInsightSource {
  title: string;
  url: string;
}

export interface AiProviderSummary {
  id: AiProvider;
  label: string;
  enabled: boolean;
  defaultModel: string | null;
  webSearchEnabled: boolean;
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

export interface CreateTriggerJobPayload {
  strategyId: string;
  userId: string;
  fundingStablecoin: StablecoinSymbol;
  allocationUsd: number;
  maxAttempts?: number;
}

export interface TriggerJob {
  id: string;
  strategyId: string;
  userId: string;
  fundingStablecoin: StablecoinSymbol;
  allocationUsd: number;
  status: "pending" | "processing" | "completed" | "failed";
  stateVersion: number;
  attemptCount: number;
  maxAttempts: number;
  nextRunAt: string;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actorType: AuditActorType;
  actorId: string;
  entityType: AuditEntityType;
  entityId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface MutationResult<T> {
  data: T;
  idempotencyStatus: IdempotencyStatus;
  idempotencyKey?: string;
}

export interface AuditLogQuery {
  actorId?: string;
  entityType?: AuditEntityType;
  limit?: number;
}

export interface AuthSession {
  id: string;
  token: string;
  walletAddress: string;
  userId: string;
  client: AuthClient;
  linkedSessionId?: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface AuthChallenge {
  id: string;
  walletAddress: string;
  client: AuthClient;
  nonce: string;
  message: string;
  issuedAt: string;
  expiresAt: string;
}

export interface PolymarketProfile {
  walletAddress: string;
  proxyWalletAddress: string | null;
  username: string | null;
  pseudonym: string | null;
  profileImage: string | null;
}

export interface OrderRecord {
  id: string;
  polymarketOrderId: string;
  strategyId: string;
  creatorHandle: string;
  marketId: string;
  userId: string;
  walletAddress: string;
  funderAddress: string;
  tokenId: string;
  outcome: "YES" | "NO";
  action: ActionType;
  side: "BUY" | "SELL";
  orderType: "GTC" | "FOK" | "GTD" | "FAK";
  price: number;
  size: number;
  amountUsd: number;
  status: OrderLifecycleStatus;
  tradeStatus: PolymarketTradeStatus;
  transactionHashes: string[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  filledAt?: string;
}

export interface CreateOrderRecordPayload {
  polymarketOrderId: string;
  strategyId: string;
  creatorHandle: string;
  marketId: string;
  userId: string;
  walletAddress: string;
  funderAddress: string;
  tokenId: string;
  outcome: "YES" | "NO";
  action: ActionType;
  side: "BUY" | "SELL";
  orderType: "GTC" | "FOK" | "GTD" | "FAK";
  price: number;
  size: number;
  amountUsd: number;
  status: OrderLifecycleStatus;
  tradeStatus: PolymarketTradeStatus;
  transactionHashes?: string[];
  errorMessage?: string;
  filledAt?: string;
}

export interface CreatorPerformanceSummary {
  creatorHandle: string;
  strategyCount: number;
  totalFollowers: number;
  totalOrders: number;
  openOrders: number;
  filledOrders: number;
  failedOrders: number;
  retriedOrders: number;
  totalVolumeUsd: number;
  fillRate: number;
  latestOrderAt?: string;
}

export interface OrderQuery {
  strategyId?: string;
  creatorHandle?: string;
  status?: OrderLifecycleStatus;
  limit?: number;
}
