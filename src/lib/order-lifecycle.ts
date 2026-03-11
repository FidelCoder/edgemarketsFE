import { Side } from "@polymarket/clob-client";
import {
  OrderLifecycleStatus,
  PolymarketTradeStatus,
  Strategy
} from "./types";

export interface DerivedStrategyExecution {
  tokenId: string;
  outcome: "YES" | "NO";
  side: Side;
  price: number;
  size: number;
}

export const outcomeForAction = (action: Strategy["action"]): "YES" | "NO" => {
  return action.endsWith("yes") ? "YES" : "NO";
};

export const sideForAction = (action: Strategy["action"]): Side => {
  return action.startsWith("buy") ? Side.BUY : Side.SELL;
};

export const priceForStrategy = (strategy: Strategy): number => {
  return outcomeForAction(strategy.action) === "YES" ? strategy.market.yesPrice : strategy.market.noPrice;
};

export const tokenIdForStrategy = (strategy: Strategy): string => {
  return outcomeForAction(strategy.action) === "YES"
    ? strategy.market.yesTokenId
    : strategy.market.noTokenId;
};

export const sizeForStrategy = (strategy: Strategy): number => {
  const price = Math.max(priceForStrategy(strategy), 0.01);
  return Number((strategy.allocationUsd / price).toFixed(3));
};

export const deriveStrategyExecution = (strategy: Strategy): DerivedStrategyExecution => {
  return {
    tokenId: tokenIdForStrategy(strategy),
    outcome: outcomeForAction(strategy.action),
    side: sideForAction(strategy.action),
    price: Number(priceForStrategy(strategy).toFixed(3)),
    size: sizeForStrategy(strategy)
  };
};

export const mapTradeStatus = (value: string | undefined): PolymarketTradeStatus => {
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

export const mapOrderLifecycleStatus = (
  value: string | undefined,
  tradeStatus: PolymarketTradeStatus
): OrderLifecycleStatus => {
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
