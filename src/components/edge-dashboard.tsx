"use client";

import { useEffect, useMemo, useState } from "react";
import { edgeApi } from "@/lib/api";
import {
  AuditLog,
  CreateStrategyPayload,
  Follow,
  Market,
  RuntimeConfig,
  StablecoinAsset,
  StablecoinSymbol,
  Strategy
} from "@/lib/types";
import { AuditFeed } from "./audit-feed";
import { CreateStrategyForm } from "./create-strategy-form";
import { FollowedStrategies } from "./followed-strategies";
import { StrategyCard } from "./strategy-card";

const defaultUserId = "trader-demo";

const generateMutationKey = (scope: string): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `web:${scope}:${crypto.randomUUID()}`;
  }

  const randomSegment = Math.random().toString(36).slice(2, 14);
  return `web:${scope}:${Date.now().toString(36)}:${randomSegment}`;
};

export const EdgeDashboard = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [stablecoins, setStablecoins] = useState<StablecoinAsset[]>([]);
  const [runtime, setRuntime] = useState<RuntimeConfig | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [userId, setUserId] = useState(defaultUserId);
  const [fundingStablecoin, setFundingStablecoin] = useState<StablecoinSymbol>("USDC");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isAuditLoading, setIsAuditLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [followPendingId, setFollowPendingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Loading EdgeMarkets...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalAllocation = useMemo(() => {
    return follows.reduce((sum, follow) => sum + follow.maxMarketExposureUsd, 0);
  }, [follows]);

  const loadDashboard = async (targetUserId: string) => {
    setErrorMessage(null);
    setIsAuditLoading(true);

    try {
      const [nextStrategies, nextMarkets, nextStablecoins, nextRuntime, nextFollows, nextAuditLogs] =
        await Promise.all([
          edgeApi.listStrategies(),
          edgeApi.listMarkets(),
          edgeApi.listStablecoins(),
          edgeApi.getRuntimeConfig(),
          edgeApi.listUserFollows(targetUserId),
          edgeApi.listAuditLogs(40)
        ]);

      setStrategies(nextStrategies);
      setMarkets(nextMarkets);
      setStablecoins(nextStablecoins);
      setRuntime(nextRuntime);
      setFollows(nextFollows);
      setAuditLogs(nextAuditLogs);
      setStatusMessage(
        `Runtime ${nextRuntime.networkMode}/${nextRuntime.executionMode} on ${nextRuntime.polygonNetwork} using ${nextRuntime.storeProvider}. Worker ${nextRuntime.triggerWorkerEnabled ? "on" : "off"} (${nextRuntime.triggerWorkerIntervalMs}ms).`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load marketplace data.";
      setErrorMessage(message);
    } finally {
      setIsBootstrapping(false);
      setIsAuditLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard(defaultUserId);
  }, []);

  const handleCreateStrategy = async (payload: CreateStrategyPayload) => {
    setIsCreating(true);
    setErrorMessage(null);

    try {
      const mutation = await edgeApi.createStrategy(payload, generateMutationKey("strategy-create"));
      await loadDashboard(userId);
      setStatusMessage(
        `Strategy published successfully (${mutation.idempotencyStatus}${mutation.idempotencyKey ? `:${mutation.idempotencyKey.slice(0, 16)}...` : ""}).`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create strategy.";
      setErrorMessage(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleFollowStrategy = async (strategy: Strategy) => {
    setFollowPendingId(strategy.id);
    setErrorMessage(null);

    try {
      const mutation = await edgeApi.followStrategy(
        strategy.id,
        {
          userId,
          maxDailyLossUsd: Math.round(strategy.allocationUsd * 0.35),
          maxMarketExposureUsd: strategy.allocationUsd,
          fundingStablecoin
        },
        generateMutationKey(`follow-${strategy.id}`)
      );
      await loadDashboard(userId);
      setStatusMessage(
        `You are now following ${strategy.name} (${mutation.idempotencyStatus}${mutation.idempotencyKey ? `:${mutation.idempotencyKey.slice(0, 16)}...` : ""}).`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not follow strategy.";
      setErrorMessage(message);
    } finally {
      setFollowPendingId(null);
    }
  };

  const handleRefreshPortfolio = async () => {
    setIsBootstrapping(true);
    await loadDashboard(userId);
  };

  return (
    <div className="dashboard">
      <section className="hero panel">
        <div>
          <p className="eyebrow">EdgeMarkets</p>
          <h1>AI Conditional Strategy Market for Polymarket Traders</h1>
          <p>
            Discover live strategies, create your own AI triggers, and follow active traders with
            transparent risk limits.
          </p>
          <p className="runtimeText">
            Runtime:{" "}
            {runtime
              ? `${runtime.networkMode}/${runtime.executionMode} (${runtime.polygonNetwork}) ${runtime.storeProvider}`
              : "--"}
          </p>
        </div>

        <div className="heroActions">
          <label>
            Active User ID
            <input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="trader-demo"
            />
          </label>
          <label>
            Funding Stablecoin
            <select
              value={fundingStablecoin}
              onChange={(event) => setFundingStablecoin(event.target.value as StablecoinSymbol)}
            >
              {stablecoins.map((coin) => (
                <option key={coin.symbol} value={coin.symbol}>
                  {coin.symbol}
                  {coin.conversionRequired ? " (auto-convert to USDC)" : ""}
                </option>
              ))}
            </select>
          </label>
          <button onClick={handleRefreshPortfolio} disabled={isBootstrapping}>
            {isBootstrapping ? "Refreshing..." : "Load Portfolio"}
          </button>
        </div>
      </section>

      <section className="statsRow">
        <article className="panel statItem">
          <span>Strategies</span>
          <strong>{strategies.length}</strong>
        </article>
        <article className="panel statItem">
          <span>Markets</span>
          <strong>{markets.length}</strong>
        </article>
        <article className="panel statItem">
          <span>Active Follows</span>
          <strong>{follows.length}</strong>
        </article>
        <article className="panel statItem">
          <span>Supported Stables</span>
          <strong>{stablecoins.length}</strong>
        </article>
        <article className="panel statItem">
          <span>Allocated USD</span>
          <strong>${totalAllocation.toLocaleString()}</strong>
        </article>
      </section>

      {errorMessage ? <p className="errorText">{errorMessage}</p> : <p className="statusText">{statusMessage}</p>}

      <CreateStrategyForm markets={markets} pending={isCreating} onCreate={handleCreateStrategy} />

      <FollowedStrategies follows={follows} userId={userId} />

      <AuditFeed logs={auditLogs} loading={isAuditLoading} />

      <section className="strategyGrid">
        {strategies.map((strategy) => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            followPending={followPendingId === strategy.id}
            onFollow={handleFollowStrategy}
          />
        ))}
      </section>
    </div>
  );
};
