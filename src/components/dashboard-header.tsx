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
  onConnectWallet: () => void;
  onDisconnect: () => void;
}

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
  onConnectWallet,
  onDisconnect
}: DashboardHeaderProps) => {
  return (
    <>
      <header className="panel shellHeader">
        <div className="brandCluster">
          <span className="brandMark">
            <img src="https://polymarket.com/favicon.ico" alt="Polymarket" />
          </span>
          <div className="brandLockup">
            <span className="eyebrow">EdgeMarkets</span>
            <h1>AI Trading Desk for Polymarket</h1>
            <p>Browse live prediction markets, generate model-backed theses, publish strategies, and execute from your wallet.</p>
            <div className="brandSubmeta">
              <span className="tag">Powered by Polymarket rails</span>
              <span className="tag">Prediction market workspace</span>
            </div>
          </div>
        </div>

        <div className="headerActions">
          <div className="walletBadge walletBadgeWide">
            <span>Wallet</span>
            <strong>{authSession ? shortWallet(authSession.walletAddress) : "Not connected"}</strong>
          </div>
          <div className="walletBadge">
            <span>Mode</span>
            <strong>{runtime ? `${runtime.executionMode}/${runtime.networkMode}` : "--"}</strong>
          </div>
          <div className="walletBadge">
            <span>Listings</span>
            <strong>{runtime?.polymarketMarketSource ?? "live"}</strong>
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
      </header>

      <section className="statsStrip">
        <article className="panel statCard">
          <span>Markets</span>
          <strong>{marketsCount}</strong>
        </article>
        <article className="panel statCard">
          <span>Strategies</span>
          <strong>{strategiesCount}</strong>
        </article>
        <article className="panel statCard">
          <span>Following</span>
          <strong>{followsCount}</strong>
        </article>
        <article className="panel statCard">
          <span>Exposure Cap</span>
          <strong>{formatUsd(totalAllocationUsd)}</strong>
        </article>
        <article className="panel statCard">
          <span>Live Orders</span>
          <strong>{ordersCount}</strong>
        </article>
      </section>
    </>
  );
};
