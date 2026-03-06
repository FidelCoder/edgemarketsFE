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

const defaultUserId = "trader-demo";
const webSessionStorageKey = "edge.web.session.token";

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
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [handoffCode, setHandoffCode] = useState<string | null>(null);
  const [handoffExpiresAt, setHandoffExpiresAt] = useState<string | null>(null);
  const [userId, setUserId] = useState(defaultUserId);
  const [fundingStablecoin, setFundingStablecoin] = useState<StablecoinSymbol>("USDC");
  const [auditFilters, setAuditFilters] = useState<AuditFilterState>(defaultAuditFilters);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isAuditLoading, setIsAuditLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSessionPending, setIsSessionPending] = useState(false);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [isHandoffPending, setIsHandoffPending] = useState(false);
  const [followPendingId, setFollowPendingId] = useState<string | null>(null);
  const [triggerPendingId, setTriggerPendingId] = useState<string | null>(null);
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

  const requestWalletConnection = async (): Promise<string> => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("No wallet found. Install MetaMask or another injected Ethereum wallet.");
    }

    const accounts = (await window.ethereum.request({
      method: "eth_requestAccounts"
    })) as string[];

    const first = accounts[0];

    if (!first) {
      throw new Error("Wallet connected but no account was returned.");
    }

    return first;
  };

  const createWebSession = async (walletAddress: string): Promise<AuthSession> => {
    const session = await edgeApi.createAuthSession(walletAddress, "web");

    if (typeof window !== "undefined") {
      window.localStorage.setItem(webSessionStorageKey, session.token);
    }

    setAuthSession(session);
    setConnectedWallet(session.walletAddress);
    setUserId(session.userId);

    return session;
  };

  useEffect(() => {
    void loadDashboard(defaultUserId);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const provider = window.ethereum;

    if (provider) {
      provider
        .request({ method: "eth_accounts" })
        .then((accountsRaw) => {
          const accounts = accountsRaw as string[];

          if (accounts[0]) {
            setConnectedWallet(accounts[0]);
          }
        })
        .catch(() => {
          // Ignore passive wallet account lookup failures.
        });
    }

    const storedToken = window.localStorage.getItem(webSessionStorageKey);

    if (!storedToken) {
      return;
    }

    edgeApi
      .getCurrentSession(storedToken)
      .then((session) => {
        setAuthSession(session);
        setConnectedWallet(session.walletAddress);
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
          maxDailyLossUsd: Math.round(strategy.allocationUsd * 0.35),
          maxMarketExposureUsd: strategy.allocationUsd,
          fundingStablecoin
        },
        generateMutationKey(`follow-${strategy.id}`)
      );
      await loadDashboard(userId, auditFilters);
      setStatusMessage(
        `Followed ${strategy.name} (${mutation.idempotencyStatus}${mutation.idempotencyKey ? `:${mutation.idempotencyKey.slice(0, 14)}...` : ""}).`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not follow strategy.";

      if (message.toLowerCase().includes("already follow")) {
        setStatusMessage(`Already following ${strategy.name}.`);
        await loadDashboard(userId, auditFilters);
      } else {
        setErrorMessage(message);
      }
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
      setStatusMessage(`Trigger queued for ${strategy.name} (${mutation.data.status}).`);
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
      const session = await createWebSession(walletAddress);
      await loadDashboard(session.userId, auditFilters);
      setStatusMessage(`Wallet session active for ${shortWallet(session.walletAddress)}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start web session.";
      setErrorMessage(message);
    } finally {
      setIsSessionPending(false);
    }
  };

  const handleConnectWallet = async () => {
    setIsWalletConnecting(true);
    setErrorMessage(null);

    try {
      const walletAddress = await requestWalletConnection();
      const session = await createWebSession(walletAddress);
      await loadDashboard(session.userId, auditFilters);
      setStatusMessage(`Wallet connected: ${shortWallet(session.walletAddress)}.`);
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Wallet connection failed.";
      const message = rawMessage.includes("MetaMask extension not found")
        ? "Wallet extension is missing in this browser profile. Install/enable MetaMask and reload."
        : rawMessage;
      setErrorMessage(message);
    } finally {
      setIsWalletConnecting(false);
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
      setStatusMessage(`Extension handoff code ready: ${handoff.handoffCode}`);
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
      setStatusMessage("Audit filters updated.");
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

  const walletButtonLabel = isWalletConnecting
    ? "Connecting..."
    : authSession
      ? `Connected ${shortWallet(authSession.walletAddress)}`
      : "Connect Wallet";

  return (
    <div className="dashboard">
      <header className="panel topBar">
        <div className="brandBlock">
          <p className="eyebrow">EdgeMarkets</p>
          <h1>Prediction Order Desk</h1>
          <p className="runtimeText">
            {runtime
              ? `${runtime.networkMode}/${runtime.executionMode} • ${runtime.polygonNetwork} • ${runtime.storeProvider}`
              : "Bootstrapping runtime..."}
          </p>
        </div>

        <div className="topBarControls">
          <label className="controlField">
            Trader ID
            <input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="trader-demo"
            />
          </label>

          <label className="controlField">
            Stablecoin
            <select
              value={fundingStablecoin}
              onChange={(event) => setFundingStablecoin(event.target.value as StablecoinSymbol)}
            >
              {stablecoins.map((coin) => (
                <option key={coin.symbol} value={coin.symbol}>
                  {coin.symbol}
                </option>
              ))}
            </select>
          </label>

          <button className="ghostAction" onClick={handleRefreshPortfolio} disabled={isBootstrapping}>
            {isBootstrapping ? "Refreshing..." : "Refresh"}
          </button>

          <button onClick={() => void handleConnectWallet()} disabled={isWalletConnecting || isSessionPending}>
            {walletButtonLabel}
          </button>
        </div>
      </header>

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
          <span>Follows</span>
          <strong>{follows.length}</strong>
        </article>
        <article className="panel statItem">
          <span>Stablecoins</span>
          <strong>{stablecoins.length}</strong>
        </article>
        <article className="panel statItem">
          <span>Exposure</span>
          <strong>${totalAllocation.toLocaleString()}</strong>
        </article>
      </section>

      {errorMessage ? <p className="errorText">{errorMessage}</p> : <p className="statusText">{statusMessage}</p>}

      <section className="workspaceGrid">
        <div className="mainColumn">
          <CreateStrategyForm
            markets={markets}
            pending={isCreating}
            defaultCreatorHandle={suggestedCreatorHandle}
            onCreate={handleCreateStrategy}
          />

          <section className="strategyGrid">
            {strategies.map((strategy) => (
              <StrategyCard
                key={strategy.id}
                strategy={strategy}
                followPending={followPendingId === strategy.id}
                triggerPending={triggerPendingId === strategy.id}
                alreadyFollowing={followedStrategyIds.has(strategy.id)}
                onFollow={handleFollowStrategy}
                onQueueTrigger={handleQueueTriggerJob}
              />
            ))}
          </section>
        </div>

        <aside className="sideColumn">
          <SessionHandoffPanel
            session={authSession}
            pendingStart={isSessionPending}
            pendingConnect={isWalletConnecting}
            connectedWallet={connectedWallet}
            pendingHandoff={isHandoffPending}
            handoffCode={handoffCode}
            handoffExpiresAt={handoffExpiresAt}
            onStartSession={handleStartWebSession}
            onConnectWallet={handleConnectWallet}
            onGenerateHandoff={handleGenerateHandoff}
          />

          <FollowedStrategies follows={follows} userId={userId} />

          <AuditFeed
            logs={auditLogs}
            loading={isAuditLoading}
            filters={auditFilters}
            onApplyFilters={handleApplyAuditFilters}
            onRefresh={handleRefreshAudit}
          />
        </aside>
      </section>
    </div>
  );
};
