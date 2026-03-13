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
import type { LiveClobContext } from "@/lib/polymarket";
import { AgentAutomationPanel } from "./agent-automation-panel";
import { AuditFeed, AuditFilterState } from "./audit-feed";
import { CreateStrategyForm } from "./create-strategy-form";
import { FeaturedMarketPanel } from "./featured-market-panel";
import { FollowedStrategies } from "./followed-strategies";
import { MarketContextPanel } from "./market-context-panel";
import { MarketHighlightsPanel } from "./market-highlights-panel";
import { MarketInsightPanel } from "./market-insight-panel";
import { MarketListPanel } from "./market-list-panel";
import { MarketPulsePanel } from "./market-pulse-panel";
import { OrderLifecyclePanel } from "./order-lifecycle-panel";
import { SessionHandoffPanel } from "./session-handoff-panel";
import { StrategyMarketplacePanel } from "./strategy-marketplace-panel";
import { TradingSessionPanel } from "./trading-session-panel";
import { useAgentAutomation } from "./use-agent-automation";

interface DashboardTradingGridProps {
  markets: Market[];
  selectedMarket: Market | null;
  selectedMarketId: string | null;
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
  ensureLiveContext: () => Promise<LiveClobContext>;
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
  onOrdersChange: (orders: OrderRecord[]) => void;
  onStatusChange: (message: string) => void;
  onError: (message: string) => void;
}

export const DashboardTradingGrid = ({
  markets,
  selectedMarket,
  selectedMarketId,
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
  ensureLiveContext,
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
  onCreateHandoff,
  onOrdersChange,
  onStatusChange,
  onError
}: DashboardTradingGridProps) => {
  const agentAutomation = useAgentAutomation({
    runtime,
    authSession,
    markets,
    orders,
    ensureLiveContext,
    onOrdersChange,
    onStatus: onStatusChange,
    onError
  });

  return (
    <div className="tradingGrid tradingHomeGrid">
      <section className="marketStage marketStageHome">
        <div className="marketSpotlightGrid">
          <div className="marketSpotlightMain">
            <MarketHighlightsPanel
              markets={markets}
              selectedMarketId={selectedMarket?.id ?? selectedMarketId}
              strategyCountByMarket={strategyCountByMarket}
              onSelectMarket={(marketId) => onSelectMarket(marketId)}
            />
            <FeaturedMarketPanel
              market={selectedMarket}
              markets={markets}
              strategyCount={selectedMarket ? strategyCountByMarket[selectedMarket.id] ?? 0 : 0}
            />
            <MarketContextPanel market={selectedMarket} />
          </div>

          <div className="marketSignalRail">
            <MarketPulsePanel
              markets={markets}
              selectedMarketId={selectedMarket?.id ?? selectedMarketId}
              onSelectMarket={(marketId) => onSelectMarket(marketId)}
            />
            <MarketInsightPanel
              market={selectedMarket}
              runtime={runtime}
              insight={marketInsight}
              pending={insightPending}
              onGenerate={onGenerateInsight}
            />
          </div>
        </div>

        <MarketListPanel
          markets={markets}
          selectedMarketId={selectedMarket?.id ?? selectedMarketId}
          loading={loading}
          strategyCountByMarket={strategyCountByMarket}
          onSelectMarket={onSelectMarket}
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

      <aside className="railColumn railColumnHome">
        <AgentAutomationPanel
          runtime={runtime}
          authSession={authSession}
          markets={markets}
          plan={agentAutomation.plan}
          session={agentAutomation.session}
          evaluation={agentAutomation.evaluation}
          pnlSummary={agentAutomation.pnlSummary}
          pnlEntries={agentAutomation.pnlEntries}
          planPending={agentAutomation.planPending}
          executionPending={agentAutomation.executionPending}
          onGeneratePlan={agentAutomation.generatePlan}
          onExecutePlan={agentAutomation.executePlan}
          onHaltPlan={() => agentAutomation.haltSession()}
        />
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
