"use client";

import { useEffect, useMemo, useState } from "react";
import { edgeApi } from "@/lib/api";
import {
  AuditLog,
  AuthSession,
  CreateStrategyPayload,
  Follow,
  Market,
  RuntimeConfig,
  StablecoinAsset,
  StablecoinSymbol,
  Strategy
} from "@/lib/types";
import { AuditFeed, AuditFilterState } from "./audit-feed";
import { CreateStrategyForm } from "./create-strategy-form";
import { FollowedStrategies } from "./followed-strategies";
import { SessionHandoffPanel } from "./session-handoff-panel";
import { StrategyCard } from "./strategy-card";

const defaultUserId = "trader-demo";
const webSessionStorageKey = "edge.web.session.token";

const generateMutationKey = (scope: string): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `web:${scope}:${crypto.randomUUID()}`;
  }

  const randomSegment = Math.random().toString(36).slice(2, 14);
  return `web:${scope}:${Date.now().toString(36)}:${randomSegment}`;
};

const defaultAuditFilters: AuditFilterState = {
  actorId: "",
  entityType: "all",
  limit: 40
};

export const EdgeDashboard = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [stablecoins, setStablecoins] = useState<StablecoinAsset[]>([]);
  const [runtime, setRuntime] = useState<RuntimeConfig | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [handoffCode, setHandoffCode] = useState<string | null>(null);
  const [handoffExpiresAt, setHandoffExpiresAt] = useState<string | null>(null);
  const [userId, setUserId] = useState(defaultUserId);
  const [fundingStablecoin, setFundingStablecoin] = useState<StablecoinSymbol>("USDC");
  const [auditFilters, setAuditFilters] = useState<AuditFilterState>(defaultAuditFilters);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isAuditLoading, setIsAuditLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSessionPending, setIsSessionPending] = useState(false);
  const [isHandoffPending, setIsHandoffPending] = useState(false);
  const [followPendingId, setFollowPendingId] = useState<string | null>(null);
  const [triggerPendingId, setTriggerPendingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Loading EdgeMarkets...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalAllocation = useMemo(() => {
    return follows.reduce((sum, follow) => sum + follow.maxMarketExposureUsd, 0);
  }, [follows]);

  const toAuditQuery = (filters: AuditFilterState) => {
    return {
      actorId: filters.actorId.trim() || undefined,
      entityType: filters.entityType === "all" ? undefined : filters.entityType,
      limit: filters.limit
    };
  };

  const loadAuditLogs = async (filters: AuditFilterState) => {
    const logs = await edgeApi.listAuditLogs(toAuditQuery(filters));
    setAuditLogs(logs);
    setAuditFilters(filters);
  };

  const loadDashboard = async (targetUserId: string, filters: AuditFilterState = auditFilters) => {
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
          edgeApi.listAuditLogs(toAuditQuery(filters))
        ]);

      setStrategies(nextStrategies);
      setMarkets(nextMarkets);
      setStablecoins(nextStablecoins);
      setRuntime(nextRuntime);
      setFollows(nextFollows);
      setAuditLogs(nextAuditLogs);
      setAuditFilters(filters);
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedToken = window.localStorage.getItem(webSessionStorageKey);

    if (!storedToken) {
      return;
    }

    edgeApi
      .getCurrentSession(storedToken)
      .then((session) => {
        setAuthSession(session);
        setUserId(session.userId);
      })
      .catch(() => {
        window.localStorage.removeItem(webSessionStorageKey);
      });
  }, []);

  const handleCreateStrategy = async (payload: CreateStrategyPayload) => {
    setIsCreating(true);
    setErrorMessage(null);

    try {
      const mutation = await edgeApi.createStrategy(payload, generateMutationKey("strategy-create"));
      await loadDashboard(userId, auditFilters);
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
      await loadDashboard(userId, auditFilters);
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

  const handleQueueTriggerJob = async (strategy: Strategy) => {
    setTriggerPendingId(strategy.id);
    setErrorMessage(null);

    try {
      const mutation = await edgeApi.createTriggerJob(
        {
          strategyId: strategy.id,
          userId,
          fundingStablecoin,
          allocationUsd: strategy.allocationUsd,
          maxAttempts: 3
        },
        generateMutationKey(`trigger-${strategy.id}`)
      );

      await loadDashboard(userId, auditFilters);
      setStatusMessage(
        `Trigger queued for ${strategy.name} (${mutation.idempotencyStatus}${mutation.data.status ? `:${mutation.data.status}` : ""}).`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not queue trigger job.";
      setErrorMessage(message);
    } finally {
      setTriggerPendingId(null);
    }
  };

  const handleStartWebSession = async (walletAddress: string) => {
    setIsSessionPending(true);
    setErrorMessage(null);

    try {
      const session = await edgeApi.createAuthSession(walletAddress, "web");

      if (typeof window !== "undefined") {
        window.localStorage.setItem(webSessionStorageKey, session.token);
      }

      setAuthSession(session);
      setUserId(session.userId);
      await loadDashboard(session.userId, auditFilters);
      setStatusMessage(`Web session started for ${session.userId}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start web session.";
      setErrorMessage(message);
    } finally {
      setIsSessionPending(false);
    }
  };

  const handleGenerateHandoff = async () => {
    if (!authSession) {
      return;
    }

    setIsHandoffPending(true);
    setErrorMessage(null);

    try {
      const handoff = await edgeApi.requestSessionHandoff(authSession.token);
      setHandoffCode(handoff.handoffCode);
      setHandoffExpiresAt(handoff.expiresAt);
      await loadAuditLogs(auditFilters);
      setStatusMessage(`Handoff code generated (${handoff.handoffCode}).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not generate handoff code.";
      setErrorMessage(message);
    } finally {
      setIsHandoffPending(false);
    }
  };

  const handleApplyAuditFilters = async (filters: AuditFilterState) => {
    setIsAuditLoading(true);
    setErrorMessage(null);

    try {
      await loadAuditLogs(filters);
      setStatusMessage("Audit filters applied.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load audit logs.";
      setErrorMessage(message);
    } finally {
      setIsAuditLoading(false);
    }
  };

  const handleRefreshAudit = async () => {
    await handleApplyAuditFilters(auditFilters);
  };

  const handleRefreshPortfolio = async () => {
    setIsBootstrapping(true);
    await loadDashboard(userId, auditFilters);
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

      <SessionHandoffPanel
        session={authSession}
        pendingStart={isSessionPending}
        pendingHandoff={isHandoffPending}
        handoffCode={handoffCode}
        handoffExpiresAt={handoffExpiresAt}
        onStartSession={handleStartWebSession}
        onGenerateHandoff={handleGenerateHandoff}
      />

      <CreateStrategyForm markets={markets} pending={isCreating} onCreate={handleCreateStrategy} />

      <FollowedStrategies follows={follows} userId={userId} />

      <AuditFeed
        logs={auditLogs}
        loading={isAuditLoading}
        filters={auditFilters}
        onApplyFilters={handleApplyAuditFilters}
        onRefresh={handleRefreshAudit}
      />

      <section className="strategyGrid">
        {strategies.map((strategy) => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            followPending={followPendingId === strategy.id}
            triggerPending={triggerPendingId === strategy.id}
            onFollow={handleFollowStrategy}
            onQueueTrigger={handleQueueTriggerJob}
          />
        ))}
      </section>
    </div>
  );
};
