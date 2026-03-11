"use client";

import { useEffect, useMemo, useState } from "react";
import { edgeApi } from "@/lib/api";
import {
  checkCollateralAllowance,
  connectWalletAccount,
  createLiveClobContext,
  placeLiveStrategyOrder,
  signAuthChallengeMessage,
  syncLiveOrderState,
  type LiveClobContext
} from "@/lib/polymarket";
import {
  AuditLog,
  AuthSession,
  CreateStrategyPayload,
  Follow,
  Market,
  OrderRecord,
  PolymarketProfile,
  RuntimeConfig,
  StablecoinAsset,
  StablecoinSymbol,
  Strategy
} from "@/lib/types";
import { AuditFeed, AuditFilterState } from "./audit-feed";
import { CreateStrategyForm } from "./create-strategy-form";
import { FollowedStrategies } from "./followed-strategies";
import { OrderLifecyclePanel } from "./order-lifecycle-panel";
import { SessionHandoffPanel } from "./session-handoff-panel";
import { StrategyCard } from "./strategy-card";

const defaultUserId = "trader-demo";
const webSessionStorageKey = "edge.web.session.token";

const defaultAuditFilters: AuditFilterState = {
  actorId: "",
  entityType: "all",
  limit: 40
};

const generateMutationKey = (scope: string): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `web:${scope}:${crypto.randomUUID()}`;
  }

  const randomSegment = Math.random().toString(36).slice(2, 14);
  return `web:${scope}:${Date.now().toString(36)}:${randomSegment}`;
};

const shortWallet = (value: string | null): string => {
  if (!value) {
    return "";
  }

  if (value.length < 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const toCreatorHandle = (wallet: string | null, fallbackUserId: string): string => {
  if (wallet) {
    return `wallet_${wallet.slice(2, 10)}`.toLowerCase();
  }

  const fallback = fallbackUserId
    .replace("wallet:", "wallet_")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .slice(0, 24);

  return fallback.length >= 2 ? fallback : "edgetrader";
};

const toAuditQuery = (filters: AuditFilterState) => {
  return {
    actorId: filters.actorId.trim() || undefined,
    entityType: filters.entityType === "all" ? undefined : filters.entityType,
    limit: filters.limit
  };
};

const isSyncableOrder = (order: OrderRecord): boolean => {
  return order.status === "submitted" || order.status === "open" || order.status === "retried";
};

export const EdgeDashboard = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [stablecoins, setStablecoins] = useState<StablecoinAsset[]>([]);
  const [runtime, setRuntime] = useState<RuntimeConfig | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<PolymarketProfile | null>(null);
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [liveContext, setLiveContext] = useState<LiveClobContext | null>(null);
  const [allowanceSummary, setAllowanceSummary] = useState<{ balance: string; allowance: string } | null>(null);
  const [handoffCode, setHandoffCode] = useState<string | null>(null);
  const [handoffExpiresAt, setHandoffExpiresAt] = useState<string | null>(null);
  const [userId, setUserId] = useState(defaultUserId);
  const [fundingStablecoin, setFundingStablecoin] = useState<StablecoinSymbol>("USDC");
  const [auditFilters, setAuditFilters] = useState<AuditFilterState>(defaultAuditFilters);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isAuditLoading, setIsAuditLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [isHandoffPending, setIsHandoffPending] = useState(false);
  const [isOrderSyncing, setIsOrderSyncing] = useState(false);
  const [followPendingId, setFollowPendingId] = useState<string | null>(null);
  const [triggerPendingId, setTriggerPendingId] = useState<string | null>(null);
  const [livePendingId, setLivePendingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Loading EdgeMarkets order desk...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalAllocation = useMemo(() => {
    return follows.reduce((sum, follow) => sum + follow.maxMarketExposureUsd, 0);
  }, [follows]);

  const followedStrategyIds = useMemo(() => {
    return new Set(follows.map((follow) => follow.strategyId));
  }, [follows]);

  const suggestedCreatorHandle = useMemo(() => {
    return toCreatorHandle(authSession?.walletAddress ?? connectedWallet, userId);
  }, [authSession?.walletAddress, connectedWallet, userId]);

  const canExecuteLive = Boolean(authSession && runtime?.executionMode === "live");

  const loadAuditLogs = async (filters: AuditFilterState) => {
    const logs = await edgeApi.listAuditLogs(toAuditQuery(filters));
    setAuditLogs(logs);
    setAuditFilters(filters);
  };

  const loadOrders = async (sessionToken?: string) => {
    if (!sessionToken) {
      setOrders([]);
      return;
    }

    const nextOrders = await edgeApi.listOrders(sessionToken, { limit: 40 });
    setOrders(nextOrders);
  };

  const loadDashboard = async (
    targetUserId: string,
    filters: AuditFilterState = auditFilters,
    sessionToken?: string
  ) => {
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
      await loadOrders(sessionToken);
      setStatusMessage(
        `Runtime ${nextRuntime.networkMode}/${nextRuntime.executionMode} on ${nextRuntime.polygonNetwork} (${nextRuntime.storeProvider})`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load marketplace data.";
      setErrorMessage(message);
    } finally {
      setIsBootstrapping(false);
      setIsAuditLoading(false);
    }
  };

  const ensureRuntime = async (): Promise<RuntimeConfig> => {
    if (runtime) {
      return runtime;
    }

    const nextRuntime = await edgeApi.getRuntimeConfig();
    setRuntime(nextRuntime);
    return nextRuntime;
  };

  const ensureLiveSessionContext = async (): Promise<LiveClobContext> => {
    if (!authSession) {
      throw new Error("Connect a wallet before executing live orders.");
    }

    if (liveContext) {
      return liveContext;
    }

    const nextRuntime = await ensureRuntime();
    const nextProfile = await edgeApi.getPolymarketProfile(authSession.walletAddress);
    const context = await createLiveClobContext(nextRuntime, authSession.walletAddress, nextProfile);
    const allowance = await checkCollateralAllowance(context).catch(() => null);

    setProfile(nextProfile);
    setLiveContext(context);
    setAllowanceSummary(allowance);

    return context;
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
      .then(async (session) => {
        setAuthSession(session);
        setConnectedWallet(session.walletAddress);
        setUserId(session.userId);
        await loadDashboard(session.userId, defaultAuditFilters, session.token);
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
      await loadDashboard(userId, auditFilters, authSession?.token);
      setStatusMessage(
        `Strategy published (${mutation.idempotencyStatus}${mutation.idempotencyKey ? `:${mutation.idempotencyKey.slice(0, 14)}...` : ""}).`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create strategy.";
      setErrorMessage(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleFollowStrategy = async (strategy: Strategy) => {
    if (followedStrategyIds.has(strategy.id)) {
      setStatusMessage(`Already following ${strategy.name}.`);
      return;
    }

    setFollowPendingId(strategy.id);
    setErrorMessage(null);

    try {
      const mutation = await edgeApi.followStrategy(
        strategy.id,
        {
          userId,
          maxDailyLossUsd: strategy.allocationUsd,
          maxMarketExposureUsd: strategy.allocationUsd,
          fundingStablecoin
        },
        generateMutationKey(`follow-${strategy.id}`)
      );
      await loadDashboard(userId, auditFilters, authSession?.token);
      setStatusMessage(
        `Strategy follow saved (${mutation.idempotencyStatus}${mutation.idempotencyKey ? `:${mutation.idempotencyKey.slice(0, 12)}...` : ""}).`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not follow strategy.";
      setErrorMessage(message);
    } finally {
      setFollowPendingId(null);
    }
  };

  const handleQueueTrigger = async (strategy: Strategy) => {
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
      await loadDashboard(userId, auditFilters, authSession?.token);
      setStatusMessage(
        `Trigger job queued (${mutation.idempotencyStatus}${mutation.idempotencyKey ? `:${mutation.idempotencyKey.slice(0, 12)}...` : ""}).`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not queue trigger job.";
      setErrorMessage(message);
    } finally {
      setTriggerPendingId(null);
    }
  };

  const handleConnectWallet = async () => {
    setIsWalletConnecting(true);
    setErrorMessage(null);

    try {
      const nextRuntime = await ensureRuntime();
      const walletAddress = await connectWalletAccount();
      const challenge = await edgeApi.createAuthChallenge(walletAddress, "web");
      const signature = await signAuthChallengeMessage(walletAddress, challenge.message, nextRuntime);
      const session = await edgeApi.verifyAuthChallenge(challenge.id, walletAddress, signature, "web");

      if (typeof window !== "undefined") {
        window.localStorage.setItem(webSessionStorageKey, session.token);
      }

      setAuthSession(session);
      setConnectedWallet(session.walletAddress);
      setUserId(session.userId);
      setLiveContext(null);
      setProfile(null);
      setAllowanceSummary(null);
      await loadDashboard(session.userId, auditFilters, session.token);
      setStatusMessage(`Wallet session verified for ${shortWallet(session.walletAddress)}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not connect wallet.";
      setErrorMessage(message);
    } finally {
      setIsWalletConnecting(false);
    }
  };

  const handleExecuteLive = async (strategy: Strategy) => {
    if (!authSession) {
      setErrorMessage("Connect a wallet before executing live orders.");
      return;
    }

    if (runtime?.executionMode !== "live") {
      setErrorMessage("Backend runtime is not configured for live Polymarket execution.");
      return;
    }

    setLivePendingId(strategy.id);
    setErrorMessage(null);

    try {
      const context = await ensureLiveSessionContext();
      const payload = await placeLiveStrategyOrder(context, strategy, authSession.userId);
      await edgeApi.upsertOrder(authSession.token, payload);
      await loadOrders(authSession.token);
      setStatusMessage(`Live order submitted for ${strategy.name}: ${payload.polymarketOrderId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not execute live order.";
      setErrorMessage(message);
    } finally {
      setLivePendingId(null);
    }
  };

  const handleRefreshOrders = async () => {
    if (!authSession) {
      setErrorMessage("Connect a wallet to load order lifecycle.");
      return;
    }

    setIsOrderSyncing(true);
    setErrorMessage(null);

    try {
      let nextOrders = await edgeApi.listOrders(authSession.token, { limit: 40 });
      const syncTargets = nextOrders.filter(isSyncableOrder);

      if (syncTargets.length > 0) {
        const context = await ensureLiveSessionContext();

        await Promise.all(
          syncTargets.map(async (order) => {
            const syncedPayload = await syncLiveOrderState(context, order);
            await edgeApi.upsertOrder(authSession.token, syncedPayload);
          })
        );

        nextOrders = await edgeApi.listOrders(authSession.token, { limit: 40 });
      }

      setOrders(nextOrders);
      setStatusMessage(`Synced ${nextOrders.length} order records.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not sync order lifecycle.";
      setErrorMessage(message);
    } finally {
      setIsOrderSyncing(false);
    }
  };

  const handleCreateHandoff = async () => {
    if (!authSession) {
      setErrorMessage("Connect a wallet session before creating extension handoff.");
      return;
    }

    setIsHandoffPending(true);
    setErrorMessage(null);

    try {
      const handoff = await edgeApi.requestSessionHandoff(authSession.token);
      setHandoffCode(handoff.handoffCode);
      setHandoffExpiresAt(handoff.expiresAt);
      setStatusMessage(`Extension handoff code ready: ${handoff.handoffCode}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not generate handoff code.";
      setErrorMessage(message);
    } finally {
      setIsHandoffPending(false);
    }
  };

  const handleDisconnect = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(webSessionStorageKey);
    }

    setAuthSession(null);
    setConnectedWallet(null);
    setProfile(null);
    setLiveContext(null);
    setAllowanceSummary(null);
    setOrders([]);
    setUserId(defaultUserId);
    void loadDashboard(defaultUserId, auditFilters);
    setStatusMessage("Wallet session cleared.");
  };

  return (
    <main className="edgeShell">
      <section className="topBar panel">
        <div>
          <span className="eyebrow">EdgeMarkets</span>
          <h1>Live AI Conditional Orders for Polymarket</h1>
          <p>
            Publish strategies, follow creators, and execute live orders through your own connected wallet.
          </p>
        </div>

        <div className="topBarActions">
          <div className="walletBadge">
            <span>Wallet</span>
            <strong>{authSession ? shortWallet(authSession.walletAddress) : connectedWallet ? shortWallet(connectedWallet) : "Not connected"}</strong>
          </div>
          <div className="walletBadge">
            <span>Mode</span>
            <strong>{runtime ? `${runtime.executionMode}/${runtime.networkMode}` : "--"}</strong>
          </div>
          <button onClick={handleConnectWallet} disabled={isWalletConnecting}>
            {authSession ? "Reconnect Wallet" : isWalletConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
          {authSession ? (
            <button className="ghostAction" onClick={handleDisconnect}>
              Disconnect
            </button>
          ) : null}
        </div>
      </section>

      <section className="summaryGrid">
        <article className="panel statCard">
          <span>Strategies</span>
          <strong>{strategies.length}</strong>
        </article>
        <article className="panel statCard">
          <span>Following</span>
          <strong>{follows.length}</strong>
        </article>
        <article className="panel statCard">
          <span>Exposure Cap</span>
          <strong>${totalAllocation.toLocaleString()}</strong>
        </article>
        <article className="panel statCard">
          <span>Live Orders</span>
          <strong>{orders.length}</strong>
        </article>
      </section>

      {statusMessage ? <p className="statusMessage">{statusMessage}</p> : null}
      {errorMessage ? <p className="errorBanner">{errorMessage}</p> : null}

      <div className="workspaceGrid">
        <section className="workspaceMain">
          <CreateStrategyForm
            markets={markets}
            pending={isCreating}
            defaultCreatorHandle={suggestedCreatorHandle}
            onCreate={handleCreateStrategy}
          />

          <section className="panel marketPanel">
            <div className="panelHeaderRow">
              <div>
                <h2>Strategy Marketplace</h2>
                <p>{isBootstrapping ? "Loading live market strategies..." : "Trade creators and strategies against live Polymarket markets."}</p>
              </div>
              <select value={fundingStablecoin} onChange={(event) => setFundingStablecoin(event.target.value as StablecoinSymbol)}>
                {stablecoins.map((asset) => (
                  <option key={asset.symbol} value={asset.symbol}>
                    {asset.symbol}
                  </option>
                ))}
              </select>
            </div>

            <div className="strategyGrid">
              {strategies.map((strategy) => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  followPending={followPendingId === strategy.id}
                  triggerPending={triggerPendingId === strategy.id}
                  livePending={livePendingId === strategy.id}
                  alreadyFollowing={followedStrategyIds.has(strategy.id)}
                  canExecuteLive={canExecuteLive}
                  onFollow={handleFollowStrategy}
                  onQueueTrigger={handleQueueTrigger}
                  onExecuteLive={handleExecuteLive}
                />
              ))}
            </div>
          </section>
        </section>

        <aside className="workspaceSide">
          <section className="panel sessionPanel compactPanel">
            <div className="panelHeaderRow">
              <h2>Trading Session</h2>
              <span className="tag">{profile?.proxyWalletAddress ? "Proxy" : authSession ? "EOA" : "Idle"}</span>
            </div>
            <div className="sessionMeta">
              <span>User ID</span>
              <strong>{authSession?.userId ?? userId}</strong>
            </div>
            <div className="sessionMeta">
              <span>Polymarket Profile</span>
              <strong>{profile?.pseudonym ?? profile?.username ?? "Connect to resolve"}</strong>
            </div>
            <div className="sessionMeta">
              <span>Funding</span>
              <strong>{allowanceSummary ? `${allowanceSummary.balance} / ${allowanceSummary.allowance}` : "Resolve after live connect"}</strong>
            </div>
          </section>

          <OrderLifecyclePanel orders={orders} syncing={isOrderSyncing} onRefresh={handleRefreshOrders} />

          <SessionHandoffPanel
            connectedWallet={authSession?.walletAddress ?? connectedWallet}
            onCreateHandoff={() => void handleCreateHandoff()}
            handoffCode={handoffCode}
            handoffExpiresAt={handoffExpiresAt}
            pending={isHandoffPending}
          />

          <FollowedStrategies follows={follows} userId={userId} />

          <AuditFeed
            logs={auditLogs}
            loading={isAuditLoading}
            filters={auditFilters}
            onApplyFilters={loadAuditLogs}
            onRefresh={() => loadAuditLogs(auditFilters)}
          />
        </aside>
      </div>
    </main>
  );
};
