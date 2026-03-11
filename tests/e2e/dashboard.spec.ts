import { expect, test } from "@playwright/test";

const envelope = <T>(data: T) => ({ data, error: null });

test("renders the live order desk with mocked backend data", async ({ page }) => {
  await page.route("http://localhost:4000/api/strategies", async (route) => {
    await route.fulfill({
      json: envelope([
        {
          id: "strategy-btc-breakout",
          name: "BTC Breakout Momentum",
          description: "Buys YES on BTC 100k if odds break above 45% with sustained momentum.",
          marketId: "market-btc-100k-2026",
          triggerType: "price_above",
          conditionValue: 0.45,
          action: "buy_yes",
          allocationUsd: 750,
          creatorHandle: "quantnairobi",
          followerCount: 9,
          createdAt: new Date().toISOString(),
          market: {
            id: "market-btc-100k-2026",
            question: "Will BTC touch $100k before Dec 31, 2026?",
            category: "Crypto",
            yesPrice: 0.41,
            noPrice: 0.59,
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
        }
      ])
    });
  });

  await page.route("http://localhost:4000/api/markets", async (route) => {
    await route.fulfill({
      json: envelope([
        {
          id: "market-btc-100k-2026",
          question: "Will BTC touch $100k before Dec 31, 2026?",
          category: "Crypto",
          yesPrice: 0.41,
          noPrice: 0.59,
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
      ])
    });
  });

  await page.route("http://localhost:4000/api/stablecoins", async (route) => {
    await route.fulfill({
      json: envelope([
        { symbol: "USDC", chain: "Polygon", settlementAsset: "USDC", conversionRequired: false }
      ])
    });
  });

  await page.route("http://localhost:4000/api/runtime/config", async (route) => {
    await route.fulfill({
      json: envelope({
        networkMode: "mainnet",
        polygonNetwork: "polygon",
        polymarketEnvironment: "production",
        polymarketHost: "https://clob.polymarket.com",
        polymarketGammaHost: "https://gamma-api.polymarket.com",
        polymarketChainId: 137,
        polymarketMarketSource: "live",
        executionMode: "live",
        storeProvider: "memory",
        triggerWorkerEnabled: false,
        triggerWorkerIntervalMs: 6000,
        triggerWorkerBatchSize: 10,
        supportedStablecoins: ["USDC"]
      })
    });
  });

  await page.route(/http:\/\/localhost:4000\/api\/users\/.*\/follows/, async (route) => {
    await route.fulfill({ json: envelope([]) });
  });

  await page.route(/http:\/\/localhost:4000\/api\/audit-logs.*/, async (route) => {
    await route.fulfill({ json: envelope([]) });
  });

  await page.goto("/");

  await expect(page.getByText("Live AI Conditional Orders for Polymarket")).toBeVisible();
  await expect(page.getByText("BTC Breakout Momentum")).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect Wallet" }).first()).toBeVisible();
});
