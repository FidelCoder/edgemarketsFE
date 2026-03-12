import {
  ApiError,
  AssetType,
  Chain,
  ClobClient,
  OrderType,
  Side,
  type Trade,
  type OpenOrder
} from "@polymarket/clob-client";
import { createWalletClient, custom, type Address } from "viem";
import { polygon, polygonAmoy } from "viem/chains";
import {
  ActionType,
  CreateOrderRecordPayload,
  Market,
  OrderLifecycleStatus,
  OrderRecord,
  PolymarketProfile,
  PolymarketTradeStatus,
  RuntimeConfig,
  Strategy
} from "./types";

interface EthereumProvider {
  request: (args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) => Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export interface LiveClobContext {
  client: ClobClient;
  walletAddress: string;
  funderAddress: string;
  profile: PolymarketProfile;
}

interface MarketOrderIntent {
  market: Market;
  action: ActionType;
  allocationUsd: number;
  userId: string;
  strategyId?: string;
  creatorHandle?: string;
}

const toProvider = (): EthereumProvider => {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet found. Install MetaMask or another injected Ethereum wallet.");
  }

  return window.ethereum as EthereumProvider;
};

const getWalletChain = (chainId: number) => {
  return chainId === 80002 ? polygonAmoy : polygon;
};

const toPolymarketChain = (chainId: number): Chain => {
  return chainId === 80002 ? Chain.AMOY : Chain.POLYGON;
};

const ensurePolygonNetwork = async (provider: EthereumProvider, runtime: RuntimeConfig): Promise<void> => {
  const requestedChainId = `0x${runtime.polymarketChainId.toString(16)}`;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: requestedChainId }]
    });
  } catch (error) {
    const providerError = error as { code?: number; message?: string } | null;

    if (providerError?.code === 4001) {
      throw new Error("Wallet network switch was rejected.");
    }

    throw new Error(`Switch your wallet to Polygon ${runtime.polygonNetwork} and try again.`);
  }
};

export const connectWalletAccount = async (): Promise<string> => {
  const provider = toProvider();
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const account = accounts[0];

  if (!account) {
    throw new Error("Wallet connected but no account was returned.");
  }

  return account.toLowerCase();
};

export const signAuthChallengeMessage = async (
  walletAddress: string,
  message: string,
  runtime: RuntimeConfig
): Promise<string> => {
  const provider = toProvider();
  await ensurePolygonNetwork(provider, runtime);

  try {
    return (await provider.request({
      method: "personal_sign",
      params: [message, walletAddress]
    })) as string;
  } catch (error) {
    const providerError = error as { code?: number } | null;

    if (providerError?.code === 4001) {
      throw new Error("Wallet signature request was rejected.");
    }

    throw error instanceof Error ? error : new Error("Wallet could not sign the authentication challenge.");
  }
};

const toSignatureType = (profile: PolymarketProfile): number => {
  return profile.proxyWalletAddress ? 2 : 0;
};

const toFunderAddress = (profile: PolymarketProfile, walletAddress: string): string => {
  return (profile.proxyWalletAddress ?? walletAddress).toLowerCase();
};

export const createLiveClobContext = async (
  runtime: RuntimeConfig,
  walletAddress: string,
  profile: PolymarketProfile
): Promise<LiveClobContext> => {
  const provider = toProvider();
  await ensurePolygonNetwork(provider, runtime);

  const walletClient = createWalletClient({
    account: walletAddress as Address,
    chain: getWalletChain(runtime.polymarketChainId),
    transport: custom(provider as never)
  });
  const funderAddress = toFunderAddress(profile, walletAddress);
  const signatureType = toSignatureType(profile);
  const apiKeyClient = new ClobClient(
    runtime.polymarketHost,
    toPolymarketChain(runtime.polymarketChainId),
    walletClient as never,
    undefined,
    signatureType,
    funderAddress,
    undefined,
    true,
    undefined,
    undefined,
    false,
    undefined,
    true
  );
  const creds = await apiKeyClient.createOrDeriveApiKey();
  const client = new ClobClient(
    runtime.polymarketHost,
    toPolymarketChain(runtime.polymarketChainId),
    walletClient as never,
    creds,
    signatureType,
    funderAddress,
    undefined,
    true,
    undefined,
    undefined,
    false,
    undefined,
    true
  );

  return {
    client,
    walletAddress: walletAddress.toLowerCase(),
    funderAddress,
    profile
  };
};

const outcomeForAction = (action: Strategy["action"]): "YES" | "NO" => {
  return action.endsWith("yes") ? "YES" : "NO";
};

const sideForAction = (action: Strategy["action"]): Side => {
  return action.startsWith("buy") ? Side.BUY : Side.SELL;
};

const priceForStrategy = (strategy: Strategy): number => {
  return outcomeForAction(strategy.action) === "YES" ? strategy.market.yesPrice : strategy.market.noPrice;
};

const tokenIdForStrategy = (strategy: Strategy): string => {
  return outcomeForAction(strategy.action) === "YES"
    ? strategy.market.yesTokenId
    : strategy.market.noTokenId;
};

const outcomeForActionType = (action: ActionType): "YES" | "NO" => {
  return action.endsWith("yes") ? "YES" : "NO";
};

const sideForActionType = (action: ActionType): Side => {
  return action.startsWith("buy") ? Side.BUY : Side.SELL;
};

const priceForMarketIntent = (market: Market, action: ActionType): number => {
  return outcomeForActionType(action) === "YES" ? market.yesPrice : market.noPrice;
};

const tokenIdForMarketIntent = (market: Market, action: ActionType): string => {
  return outcomeForActionType(action) === "YES" ? market.yesTokenId : market.noTokenId;
};

const sizeForAllocation = (allocationUsd: number, price: number): number => {
  return Number((allocationUsd / Math.max(price, 0.01)).toFixed(3));
};

const sizeForStrategy = (strategy: Strategy): number => {
  const price = Math.max(priceForStrategy(strategy), 0.01);
  return Number((strategy.allocationUsd / price).toFixed(3));
};

const mapTradeStatus = (value: string | undefined): PolymarketTradeStatus => {
  switch ((value ?? "").toUpperCase()) {
    case "MATCHED":
      return "MATCHED";
    case "MINED":
      return "MINED";
    case "CONFIRMED":
      return "CONFIRMED";
    case "RETRYING":
      return "RETRYING";
    case "FAILED":
      return "FAILED";
    default:
      return "UNKNOWN";
  }
};

const mapOrderStatus = (value: string | undefined, tradeStatus: PolymarketTradeStatus): OrderLifecycleStatus => {
  const normalized = (value ?? "").toUpperCase();

  if (tradeStatus === "CONFIRMED" || tradeStatus === "MINED") {
    return "filled";
  }

  if (tradeStatus === "FAILED") {
    return "failed";
  }

  if (tradeStatus === "RETRYING") {
    return "retried";
  }

  switch (normalized) {
    case "LIVE":
      return "open";
    case "FAILED":
      return "failed";
    case "RETRYING":
      return "retried";
    case "MATCHED":
    case "DELAYED":
    case "UNMATCHED":
    default:
      return "submitted";
  }
};

const findRelatedTrade = (trades: Trade[], orderId: string, tokenId: string): Trade | undefined => {
  return trades.find((trade) => {
    if (trade.asset_id !== tokenId) {
      return false;
    }

    if (trade.taker_order_id === orderId) {
      return true;
    }

    return trade.maker_orders.some((makerOrder) => makerOrder.order_id === orderId);
  });
};

const toTransactionHashes = (trade?: Trade, existing?: OrderRecord): string[] => {
  if (!trade?.transaction_hash) {
    return existing?.transactionHashes ?? [];
  }

  const hashes = new Set([...(existing?.transactionHashes ?? []), trade.transaction_hash]);
  return [...hashes];
};

const toFilledAt = (trade?: Trade, existing?: OrderRecord): string | undefined => {
  if (trade?.status?.toUpperCase() === "CONFIRMED" || trade?.status?.toUpperCase() === "MINED") {
    return trade.last_update || trade.match_time || existing?.filledAt;
  }

  return existing?.filledAt;
};

const isApiNotFound = (error: unknown): boolean => {
  return error instanceof ApiError && error.status === 404;
};

export const placeLiveStrategyOrder = async (
  context: LiveClobContext,
  strategy: Strategy,
  userId: string
): Promise<CreateOrderRecordPayload> => {
  if (!strategy.market.orderBookEnabled) {
    throw new Error("This market is not live-tradable from the current source.");
  }

  const tokenId = tokenIdForStrategy(strategy);
  const side = sideForAction(strategy.action);
  const price = Number(priceForStrategy(strategy).toFixed(3));
  const size = sizeForStrategy(strategy);
  const orderBook = await context.client.getOrderBook(tokenId);
  const response = await context.client.createAndPostOrder(
    {
      tokenID: tokenId,
      price,
      side,
      size
    },
    {
      tickSize: orderBook.tick_size as "0.1" | "0.01" | "0.001" | "0.0001",
      negRisk: orderBook.neg_risk
    },
    OrderType.GTC
  );
  const tradeStatus = mapTradeStatus(response.status);

  return {
    polymarketOrderId: response.orderID,
    source: "strategy",
    strategyId: strategy.id,
    creatorHandle: strategy.creatorHandle,
    marketId: strategy.marketId,
    userId,
    walletAddress: context.walletAddress,
    funderAddress: context.funderAddress,
    tokenId,
    outcome: outcomeForAction(strategy.action),
    action: strategy.action,
    side: side === Side.BUY ? "BUY" : "SELL",
    orderType: "GTC",
    price,
    size,
    amountUsd: strategy.allocationUsd,
    status: mapOrderStatus(response.status, tradeStatus),
    tradeStatus,
    transactionHashes: response.transactionsHashes ?? []
  };
};

export const placeLiveMarketOrder = async (
  context: LiveClobContext,
  intent: MarketOrderIntent
): Promise<CreateOrderRecordPayload> => {
  if (!intent.market.orderBookEnabled) {
    throw new Error("This market is not live-tradable from the current source.");
  }

  const tokenId = tokenIdForMarketIntent(intent.market, intent.action);
  const side = sideForActionType(intent.action);
  const price = Number(priceForMarketIntent(intent.market, intent.action).toFixed(3));
  const size = sizeForAllocation(intent.allocationUsd, price);
  const orderBook = await context.client.getOrderBook(tokenId);
  const response = await context.client.createAndPostOrder(
    {
      tokenID: tokenId,
      price,
      side,
      size
    },
    {
      tickSize: orderBook.tick_size as "0.1" | "0.01" | "0.001" | "0.0001",
      negRisk: orderBook.neg_risk
    },
    OrderType.GTC
  );
  const tradeStatus = mapTradeStatus(response.status);

  return {
    polymarketOrderId: response.orderID,
    source: "agent",
    strategyId: intent.strategyId ?? `agent:${intent.market.id}`,
    creatorHandle: intent.creatorHandle ?? "edgeagent",
    marketId: intent.market.id,
    userId: intent.userId,
    walletAddress: context.walletAddress,
    funderAddress: context.funderAddress,
    tokenId,
    outcome: outcomeForActionType(intent.action),
    action: intent.action,
    side: side === Side.BUY ? "BUY" : "SELL",
    orderType: "GTC",
    price,
    size,
    amountUsd: intent.allocationUsd,
    status: mapOrderStatus(response.status, tradeStatus),
    tradeStatus,
    transactionHashes: response.transactionsHashes ?? []
  };
};

const getOrderIfExists = async (context: LiveClobContext, orderId: string): Promise<OpenOrder | null> => {
  try {
    return await context.client.getOrder(orderId);
  } catch (error) {
    if (isApiNotFound(error)) {
      return null;
    }

    throw error;
  }
};

export const syncLiveOrderState = async (
  context: LiveClobContext,
  order: OrderRecord
): Promise<CreateOrderRecordPayload> => {
  const [openOrder, trades] = await Promise.all([
    getOrderIfExists(context, order.polymarketOrderId),
    context.client.getTrades({
      maker_address: context.funderAddress,
      market: order.marketId,
      asset_id: order.tokenId
    })
  ]);
  const relatedTrade = findRelatedTrade(trades, order.polymarketOrderId, order.tokenId);
  const tradeStatus = mapTradeStatus(relatedTrade?.status ?? order.tradeStatus);
  const status = mapOrderStatus(openOrder?.status ?? order.status, tradeStatus);

  return {
    polymarketOrderId: order.polymarketOrderId,
    source: order.source,
    strategyId: order.strategyId,
    creatorHandle: order.creatorHandle,
    marketId: order.marketId,
    userId: order.userId,
    walletAddress: order.walletAddress,
    funderAddress: order.funderAddress,
    tokenId: order.tokenId,
    outcome: order.outcome,
    action: order.action,
    side: order.side,
    orderType: order.orderType,
    price: openOrder ? Number(openOrder.price) : order.price,
    size: openOrder ? Number(openOrder.original_size) : order.size,
    amountUsd: order.amountUsd,
    status,
    tradeStatus,
    transactionHashes: toTransactionHashes(relatedTrade, order),
    errorMessage: tradeStatus === "FAILED" ? "Polymarket marked the trade as failed." : order.errorMessage,
    filledAt: toFilledAt(relatedTrade, order)
  };
};

export const checkCollateralAllowance = async (context: LiveClobContext): Promise<{ balance: string; allowance: string }> => {
  const allowance = await context.client.getBalanceAllowance({
    asset_type: AssetType.COLLATERAL
  });

  return {
    balance: allowance.balance,
    allowance: allowance.allowance
  };
};
