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
  MarketInsight,
  OrderRecord,
  PolymarketProfile,
  RuntimeConfig,
  StablecoinAsset,
  StablecoinSymbol,
  Strategy
} from "@/lib/types";
import { AuditFilterState } from "./audit-feed";
import { DashboardTradingGrid } from "./dashboard-trading-grid";
import { DashboardHeader } from "./dashboard-header";
import {
  defaultAuditFilters,
  defaultUserId,
  generateMutationKey,
  isSyncableOrder,
  toAuditQuery,
  toCreatorHandle,
  webSessionStorageKey
} from "./dashboard-utils";

export const EdgeDashboard = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [stablecoins, setStablecoins] = useState<StablecoinAsset[]>([]);
  const [runtime, setRuntime] = useState<RuntimeConfig | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [marketInsight, setMarketInsight] = useState<MarketInsight | null>(null);
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
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [marketSearch, setMarketSearch] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isAuditLoading, setIsAuditLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isInsightGenerating, setIsInsightGenerating] = useState(false);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [isHandoffPending, setIsHandoffPending] = useState(false);
  const [isOrderSyncing, setIsOrderSyncing] = useState(false);
  const [followPendingId, setFollowPendingId] = useState<string | null>(null);
  const [triggerPendingId, setTriggerPendingId] = useState<string | null>(null);
  const [livePendingId, setLivePendingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalAllocation = useMemo(() => follows.reduce((sum, follow) => sum + follow.maxMarketExposureUsd, 0), [follows]);
  const followedStrategyIds = useMemo(() => new Set(follows.map((follow) => follow.strategyId)), [follows]);
  const suggestedCreatorHandle = useMemo(
    () => toCreatorHandle(authSession?.walletAddress ?? connectedWallet, userId),
    [authSession?.walletAddress, connectedWallet, userId]
  );
  const sortedMarkets = useMemo(() => [...markets].sort((left, right) => right.liquidityUsd - left.liquidityUsd), [markets]);
  const filteredMarkets = useMemo(() => {
    const query = marketSearch.trim().toLowerCase();
    return sortedMarkets.filter((market) => {
      if (!query) {
        return true;
      }

      return (
        market.question.toLowerCase().includes(query) ||
        market.category.toLowerCase().includes(query) ||
        market.slug.toLowerCase().includes(query)
      );
    });
  }, [marketSearch, sortedMarkets]);
  const selectedMarket = useMemo(() => {
    return (
      filteredMarkets.find((market) => market.id === selectedMarketId) ??
      filteredMarkets[0] ??
      sortedMarkets.find((market) => market.id === selectedMarketId) ??
      sortedMarkets[0] ??
      null
    );
  }, [filteredMarkets, selectedMarketId, sortedMarkets]);
  const strategyCountByMarket = useMemo(() => {
    return strategies.reduce<Record<string, number>>((counts, strategy) => {
      counts[strategy.marketId] = (counts[strategy.marketId] ?? 0) + 1;
      return counts;
    }, {});
  }, [strategies]);
  const selectedMarketStrategies = useMemo(() => {
    if (!selectedMarket) {
      return strategies;
    }
    return strategies.filter((strategy) => strategy.marketId === selectedMarket.id);
  }, [selectedMarket, strategies]);
  const canExecuteLive = Boolean(authSession && runtime?.executionMode === "live");
  useEffect(() => {
    if (!selectedMarket && selectedMarketId !== null) {
      setSelectedMarketId(null);
      return;
    }

    if (selectedMarket && selectedMarket.id !== selectedMarketId) {
      setSelectedMarketId(selectedMarket.id);
    }
  }, [selectedMarket, selectedMarketId]);

  useEffect(() => {
    if (!selectedMarket) {
      setMarketInsight(null);
      return;
    }

    setMarketInsight((current) => (current?.marketId === selectedMarket.id ? current : null));
  }, [selectedMarket]);

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
      setSelectedMarketId(payload.marketId);
      await loadDashboard(userId, auditFilters, authSession?.token);
      setStatusMessage(`Strategy published (${mutation.idempotencyStatus}).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create strategy.";
      setErrorMessage(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleGenerateMarketInsight = async ({
    angle,
    provider,
    model
  }: {
    angle?: string;
    provider?: "openai" | "anthropic";
    model?: string;
  }) => {
    if (!selectedMarket) {
      setErrorMessage("Select a market before generating AI insight.");
      return;
    }
    if (!runtime?.aiEnabled) {
      setErrorMessage("Backend AI provider is not configured.");
      return;
    }
    setIsInsightGenerating(true);
    setErrorMessage(null);

    try {
      const nextInsight = await edgeApi.generateMarketInsight({
        marketId: selectedMarket.id,
        angle,
        provider,
        model
      });
      setMarketInsight(nextInsight);
      await loadAuditLogs(auditFilters);
      setStatusMessage(`AI insight refreshed for ${selectedMarket.question} with ${nextInsight.provider}/${nextInsight.model}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not generate AI insight.";
      setErrorMessage(message);
    } finally {
      setIsInsightGenerating(false);
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
      setStatusMessage(`Strategy follow saved (${mutation.idempotencyStatus}).`);
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
      setStatusMessage(`Trigger job queued (${mutation.idempotencyStatus}).`);
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
      setStatusMessage(`Live order submitted for ${strategy.name}.`);
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
      setStatusMessage(`Synced ${nextOrders.length} live orders.`);
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
      setStatusMessage("Extension handoff code generated.");
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
    setStatusMessage("Wallet disconnected.");
  };

  return (
    <main className="edgeRoot">
      <DashboardHeader
        authSession={authSession}
        runtime={runtime}
        isWalletConnecting={isWalletConnecting}
        marketsCount={markets.length}
        strategiesCount={strategies.length}
        followsCount={follows.length}
        ordersCount={orders.length}
        totalAllocationUsd={totalAllocation}
        onConnectWallet={handleConnectWallet}
        onDisconnect={handleDisconnect}
      />

      {errorMessage ? <p className="errorBanner">{errorMessage}</p> : null}
      {statusMessage ? <p className="statusMessage">{statusMessage}</p> : null}

      <DashboardTradingGrid
        markets={filteredMarkets}
        selectedMarket={selectedMarket}
        selectedMarketId={selectedMarketId}
        marketSearch={marketSearch}
        loading={isBootstrapping || isAuditLoading}
        strategyCountByMarket={strategyCountByMarket}
        stablecoins={stablecoins}
        fundingStablecoin={fundingStablecoin}
        selectedMarketStrategies={selectedMarketStrategies}
        follows={follows}
        followedStrategyIds={followedStrategyIds}
        orders={orders}
        auditLogs={auditLogs}
        auditFilters={auditFilters}
        runtime={runtime}
        marketInsight={marketInsight}
        insightPending={isInsightGenerating}
        createPending={isCreating}
        walletConnecting={isWalletConnecting}
        orderSyncing={isOrderSyncing}
        handoffPending={isHandoffPending}
        followPendingId={followPendingId}
        triggerPendingId={triggerPendingId}
        livePendingId={livePendingId}
        canExecuteLive={canExecuteLive}
        suggestedCreatorHandle={suggestedCreatorHandle}
        authSession={authSession}
        userId={userId}
        profile={profile}
        allowanceSummary={allowanceSummary}
        connectedWallet={connectedWallet}
        handoffCode={handoffCode}
        handoffExpiresAt={handoffExpiresAt}
        onSearchChange={setMarketSearch}
        onSelectMarket={setSelectedMarketId}
        onFundingStablecoinChange={setFundingStablecoin}
        onCreateStrategy={handleCreateStrategy}
        onGenerateInsight={handleGenerateMarketInsight}
        onFollow={handleFollowStrategy}
        onQueueTrigger={handleQueueTrigger}
        onExecuteLive={handleExecuteLive}
        onApplyAuditFilters={loadAuditLogs}
        onRefreshAudit={async () => loadAuditLogs(auditFilters)}
        onConnectWallet={() => void handleConnectWallet()}
        onRefreshOrders={() => void handleRefreshOrders()}
        onCreateHandoff={() => void handleCreateHandoff()}
      />
    </main>
  );
};
