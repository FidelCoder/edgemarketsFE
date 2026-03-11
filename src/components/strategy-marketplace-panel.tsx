import { StablecoinAsset, StablecoinSymbol, Strategy } from "@/lib/types";
import { StrategyCard } from "./strategy-card";

interface StrategyMarketplacePanelProps {
  selectedMarketQuestion: string | null;
  strategies: Strategy[];
  stablecoins: StablecoinAsset[];
  fundingStablecoin: StablecoinSymbol;
  followPendingId: string | null;
  triggerPendingId: string | null;
  livePendingId: string | null;
  followedStrategyIds: Set<string>;
  canExecuteLive: boolean;
  onFundingStablecoinChange: (value: StablecoinSymbol) => void;
  onFollow: (strategy: Strategy) => void;
  onQueueTrigger: (strategy: Strategy) => void;
  onExecuteLive: (strategy: Strategy) => void;
}

export const StrategyMarketplacePanel = ({
  selectedMarketQuestion,
  strategies,
  stablecoins,
  fundingStablecoin,
  followPendingId,
  triggerPendingId,
  livePendingId,
  followedStrategyIds,
  canExecuteLive,
  onFundingStablecoinChange,
  onFollow,
  onQueueTrigger,
  onExecuteLive
}: StrategyMarketplacePanelProps) => {
  return (
    <section className="panel strategyBookPanel">
      <div className="panelHeaderRow panelHeaderStart">
        <div>
          <span className="eyebrow">Strategy Marketplace</span>
          <h2>{selectedMarketQuestion ? "Strategies on this market" : "Published Strategies"}</h2>
          <p>
            {selectedMarketQuestion
              ? `Published execution logic for ${selectedMarketQuestion}`
              : "Attach creator strategies to any live market in the board."}
          </p>
        </div>
        <div className="bookControls">
          <label className="compactField">
            <span>Funding</span>
            <select
              value={fundingStablecoin}
              onChange={(event) => onFundingStablecoinChange(event.target.value as StablecoinSymbol)}
            >
              {stablecoins.map((asset) => (
                <option key={asset.symbol} value={asset.symbol}>
                  {asset.symbol}
                </option>
              ))}
            </select>
          </label>
          <span className="tag">{strategies.length} listed</span>
        </div>
      </div>

      {strategies.length === 0 ? (
        <p className="emptyState">
          No strategy has been published for this market yet. Use the right rail to launch the first one.
        </p>
      ) : (
        <div className="strategyStack">
          {strategies.map((strategy) => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              followPending={followPendingId === strategy.id}
              triggerPending={triggerPendingId === strategy.id}
              livePending={livePendingId === strategy.id}
              alreadyFollowing={followedStrategyIds.has(strategy.id)}
              canExecuteLive={canExecuteLive}
              onFollow={onFollow}
              onQueueTrigger={onQueueTrigger}
              onExecuteLive={onExecuteLive}
            />
          ))}
        </div>
      )}
    </section>
  );
};
