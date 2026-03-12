import { describe, expect, it } from "vitest";
import {
  deriveStrategyExecution,
  mapOrderLifecycleStatus,
  mapTradeStatus
} from "../order-lifecycle";
import { Strategy } from "../types";

const strategy: Strategy = {
  id: "strategy-btc-breakout",
  name: "BTC Breakout",
  description: "Buys YES when odds break out.",
  marketId: "market-btc-100k-2026",
  triggerType: "price_above",
  conditionValue: 0.45,
  action: "buy_yes",
  allocationUsd: 500,
  creatorHandle: "quantnairobi",
  followerCount: 9,
  createdAt: new Date().toISOString(),
  market: {
    id: "market-btc-100k-2026",
    question: "Will BTC touch $100k before Dec 31, 2026?",
    category: "Crypto",
    subcategory: "Bitcoin",
    yesPrice: 0.4,
    noPrice: 0.6,
    liquidityUsd: 1200000,
    updatedAt: new Date().toISOString(),
    slug: "btc-touch-100k-before-dec-31-2026",
    icon: null,
    endDate: null,
    yesTokenId: "yes-token",
    noTokenId: "no-token",
    orderBookEnabled: true,
    negRisk: false
  }
};

describe("order lifecycle utils", () => {
  it("derives a buy-yes execution from a strategy", () => {
    const derived = deriveStrategyExecution(strategy);

    expect(derived.outcome).toBe("YES");
    expect(derived.tokenId).toBe("yes-token");
    expect(derived.price).toBe(0.4);
    expect(derived.size).toBe(1250);
  });

  it("maps trade status and order status to lifecycle", () => {
    expect(mapTradeStatus("confirmed")).toBe("CONFIRMED");
    expect(mapOrderLifecycleStatus("LIVE", "UNKNOWN")).toBe("open");
    expect(mapOrderLifecycleStatus("MATCHED", "CONFIRMED")).toBe("filled");
    expect(mapOrderLifecycleStatus("MATCHED", "FAILED")).toBe("failed");
  });
});
