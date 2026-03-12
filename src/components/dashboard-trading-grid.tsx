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
import { AuditFeed, AuditFilterState } from "./audit-feed";
import { CreateStrategyForm } from "./create-strategy-form";
import { FeaturedMarketPanel } from "./featured-market-panel";
import { FollowedStrategies } from "./followed-strategies";
import { MarketInsightPanel } from "./market-insight-panel";
import { MarketListPanel } from "./market-list-panel";
import { OrderLifecyclePanel } from "./order-lifecycle-panel";
import { SessionHandoffPanel } from "./session-handoff-panel";
import { StrategyMarketplacePanel } from "./strategy-marketplace-panel";
import { TradingSessionPanel } from "./trading-session-panel";

interface DashboardTradingGridProps {
  markets: Market[];
  selectedMarket: Market | null;
  selectedMarketId: string | null;
  marketSearch: string;
  loading: boolean;
  strategyCountByMarket: Record<string, number>;
  stablecoins: StablecoinAsset[];
  fundingStablecoin: StablecoinSymbol;
  selectedMarketStrategies: Strategy[];
  follows: Follow[];
  followedStrategyIds: Set<string>;
  orders: OrderRecord[];
  auditLogs: AuditLog[];
  auditFilters: AuditFilterState;
  runtime: RuntimeConfig | null;
  marketInsight: MarketInsight | null;
  insightPending: boolean;
  createPending: boolean;
  walletConnecting: boolean;
  orderSyncing: boolean;
  handoffPending: boolean;
  followPendingId: string | null;
  triggerPendingId: string | null;
  livePendingId: string | null;
  canExecuteLive: boolean;
  suggestedCreatorHandle: string;
  authSession: AuthSession | null;
  userId: string;
  profile: PolymarketProfile | null;
  allowanceSummary: { balance: string; allowance: string } | null;
  connectedWallet: string | null;
  handoffCode: string | null;
  handoffExpiresAt: string | null;
  onSearchChange: (value: string) => void;
  onSelectMarket: (marketId: string | null) => void;
  onFundingStablecoinChange: (value: StablecoinSymbol) => void;
  onCreateStrategy: (payload: CreateStrategyPayload) => Promise<void>;
  onGenerateInsight: (options: {
    angle?: string;
    provider?: "openai" | "anthropic";
    model?: string;
  }) => Promise<void>;
  onFollow: (strategy: Strategy) => void;
  onQueueTrigger: (strategy: Strategy) => void;
  onExecuteLive: (strategy: Strategy) => void;
  onApplyAuditFilters: (filters: AuditFilterState) => Promise<void>;
  onRefreshAudit: () => Promise<void>;
  onConnectWallet: () => void;
  onRefreshOrders: () => void;
  onCreateHandoff: () => void;
}

export const DashboardTradingGrid = ({
  markets,
  selectedMarket,
  selectedMarketId,
  marketSearch,
  loading,
  strategyCountByMarket,
  stablecoins,
  fundingStablecoin,
  selectedMarketStrategies,
  follows,
  followedStrategyIds,
  orders,
  auditLogs,
  auditFilters,
  runtime,
  marketInsight,
  insightPending,
  createPending,
  walletConnecting,
  orderSyncing,
  handoffPending,
  followPendingId,
  triggerPendingId,
  livePendingId,
  canExecuteLive,
  suggestedCreatorHandle,
  authSession,
  userId,
  profile,
  allowanceSummary,
  connectedWallet,
  handoffCode,
  handoffExpiresAt,
  onSearchChange,
  onSelectMarket,
  onFundingStablecoinChange,
  onCreateStrategy,
  onGenerateInsight,
  onFollow,
  onQueueTrigger,
  onExecuteLive,
  onApplyAuditFilters,
  onRefreshAudit,
  onConnectWallet,
  onRefreshOrders,
  onCreateHandoff
}: DashboardTradingGridProps) => {
  return (
    <div className="tradingGrid">
      <MarketListPanel
        markets={markets}
        selectedMarketId={selectedMarket?.id ?? selectedMarketId}
        searchValue={marketSearch}
        loading={loading}
        strategyCountByMarket={strategyCountByMarket}
        onSearchChange={onSearchChange}
        onSelectMarket={onSelectMarket}
      />

      <section className="marketStage">
        <FeaturedMarketPanel
          market={selectedMarket}
          strategyCount={selectedMarket ? strategyCountByMarket[selectedMarket.id] ?? 0 : 0}
        />
        <MarketInsightPanel
          market={selectedMarket}
          runtime={runtime}
          insight={marketInsight}
          pending={insightPending}
          onGenerate={onGenerateInsight}
        />
        <StrategyMarketplacePanel
          selectedMarketQuestion={selectedMarket?.question ?? null}
          strategies={selectedMarketStrategies}
          stablecoins={stablecoins}
          fundingStablecoin={fundingStablecoin}
          followPendingId={followPendingId}
          triggerPendingId={triggerPendingId}
          livePendingId={livePendingId}
          followedStrategyIds={followedStrategyIds}
          canExecuteLive={canExecuteLive}
          onFundingStablecoinChange={onFundingStablecoinChange}
          onFollow={onFollow}
          onQueueTrigger={onQueueTrigger}
          onExecuteLive={onExecuteLive}
        />

        <AuditFeed
          logs={auditLogs}
          loading={loading}
          filters={auditFilters}
          onApplyFilters={onApplyAuditFilters}
          onRefresh={onRefreshAudit}
        />
      </section>

      <aside className="railColumn">
        <CreateStrategyForm
          markets={markets}
          pending={createPending}
          defaultCreatorHandle={suggestedCreatorHandle}
          selectedMarket={selectedMarket}
          selectedMarketId={selectedMarket?.id ?? undefined}
          onCreate={onCreateStrategy}
        />
        <TradingSessionPanel
          authSession={authSession}
          userId={userId}
          profile={profile}
          allowanceSummary={allowanceSummary}
          isWalletConnecting={walletConnecting}
          onConnectWallet={onConnectWallet}
        />
        <OrderLifecyclePanel orders={orders} syncing={orderSyncing} onRefresh={onRefreshOrders} />
        <FollowedStrategies follows={follows} userId={userId} />
        <SessionHandoffPanel
          connectedWallet={authSession?.walletAddress ?? connectedWallet}
          onCreateHandoff={onCreateHandoff}
          handoffCode={handoffCode}
          handoffExpiresAt={handoffExpiresAt}
          pending={handoffPending}
        />
      </aside>
    </div>
  );
};
