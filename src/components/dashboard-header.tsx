import { AuthSession, RuntimeConfig } from "@/lib/types";

interface DashboardHeaderProps {
  authSession: AuthSession | null;
  runtime: RuntimeConfig | null;
  isWalletConnecting: boolean;
  marketsCount: number;
  strategiesCount: number;
  followsCount: number;
  ordersCount: number;
  totalAllocationUsd: number;
  marketSearch: string;
  onSearchChange: (value: string) => void;
  onConnectWallet: () => void;
  onDisconnect: () => void;
}

const QUICK_TOPICS = ["Politics", "Sports", "Crypto", "Finance", "Geopolitics", "Tech", "Culture", "Economy"];

const shortWallet = (value: string | null): string => {
  if (!value) {
    return "";
  }

  return value.length < 12 ? value : `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const formatUsd = (value: number): string => `$${value.toLocaleString()}`;

export const DashboardHeader = ({
  authSession,
  runtime,
  isWalletConnecting,
  marketsCount,
  strategiesCount,
  followsCount,
  ordersCount,
  totalAllocationUsd,
  marketSearch,
  onSearchChange,
  onConnectWallet,
  onDisconnect
}: DashboardHeaderProps) => {
  return (
    <>
      <header className="panel shellHeader shellHeaderMarket">
        <div className="marketHeaderTop">
          <div className="brandCluster marketBrandCluster">
            <span className="brandMark">
              <img src="https://polymarket.com/favicon.ico" alt="Polymarket" />
            </span>
            <div className="brandLockup marketBrandLockup">
              <span className="eyebrow">EdgeMarkets</span>
              <h1>Polymarket-native AI trading workspace</h1>
              <p>Browse live prediction markets, track market pulse, build strategies, and trade from your own wallet.</p>
            </div>
          </div>

          <label className="marketHeaderSearch" aria-label="Search live markets">
            <span className="eyebrow">Search</span>
            <input
              value={marketSearch}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search polymarkets..."
            />
          </label>

          <div className="headerActions marketHeaderActions">
            <div className="walletBadge walletBadgeWide">
              <span>Wallet</span>
              <strong>{authSession ? shortWallet(authSession.walletAddress) : "Not connected"}</strong>
            </div>
            <div className="walletBadge">
              <span>Mode</span>
              <strong>{runtime ? `${runtime.executionMode}/${runtime.networkMode}` : "--"}</strong>
            </div>
            {authSession ? (
              <div className="connectedStateRow">
                <span className="connectionPill connectionLive">Connected</span>
                <button className="ghostAction" onClick={onDisconnect}>
                  Disconnect
                </button>
              </div>
            ) : (
              <button onClick={onConnectWallet} disabled={isWalletConnecting}>
                {isWalletConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>

        <div className="marketHeaderNavRow">
          <div className="marketHeaderNavLinks">
            <span className="marketHeaderNavLink marketHeaderNavLinkActive">Trending</span>
            <span className="marketHeaderNavLink">Breaking</span>
            <span className="marketHeaderNavLink">New</span>
          </div>

          <div className="marketHeaderTopics">
            {QUICK_TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                className={`marketHeaderTopic ${marketSearch.toLowerCase() === topic.toLowerCase() ? "marketHeaderTopicActive" : ""}`.trim()}
                onClick={() => onSearchChange(topic)}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="statsStrip statsStripCompact">
        <article className="panel statCard statCardCompact">
          <span>Markets</span>
          <strong>{marketsCount}</strong>
        </article>
        <article className="panel statCard statCardCompact">
          <span>Strategies</span>
          <strong>{strategiesCount}</strong>
        </article>
        <article className="panel statCard statCardCompact">
          <span>Following</span>
          <strong>{followsCount}</strong>
        </article>
        <article className="panel statCard statCardCompact">
          <span>Exposure</span>
          <strong>{formatUsd(totalAllocationUsd)}</strong>
        </article>
        <article className="panel statCard statCardCompact">
          <span>Live Orders</span>
          <strong>{ordersCount}</strong>
        </article>
      </section>
    </>
  );
};
