import { useState } from "react";
import { runWalletPreflight, type LiveClobContext, type WalletPreflightStatus } from "@/lib/polymarket";
import { AuthSession, PolymarketProfile } from "@/lib/types";

interface TradingSessionPanelProps {
  authSession: AuthSession | null;
  userId: string;
  profile: PolymarketProfile | null;
  allowanceSummary: { balance: string; allowance: string } | null;
  isWalletConnecting: boolean;
  ensureLiveContext: () => Promise<LiveClobContext>;
  onConnectWallet: () => void;
}

const shortWallet = (value: string | null): string => {
  if (!value) {
    return "Not connected";
  }

  return value.length < 12 ? value : `${value.slice(0, 6)}...${value.slice(-4)}`;
};

export const TradingSessionPanel = ({
  authSession,
  userId,
  profile,
  allowanceSummary,
  isWalletConnecting,
  ensureLiveContext,
  onConnectWallet
}: TradingSessionPanelProps) => {
  const [preflight, setPreflight] = useState<WalletPreflightStatus | null>(null);
  const [preflightPending, setPreflightPending] = useState(false);
  const [preflightError, setPreflightError] = useState<string | null>(null);

  const handleRunPreflight = async () => {
    setPreflightPending(true);
    setPreflightError(null);

    try {
      const context = await ensureLiveContext();
      setPreflight(await runWalletPreflight(context));
    } catch (error) {
      setPreflightError(error instanceof Error ? error.message : "Wallet preflight failed.");
    } finally {
      setPreflightPending(false);
    }
  };

  return (
    <section className="panel railPanel">
      <div className="panelHeaderRow">
        <div>
          <span className="eyebrow">Wallet Session</span>
          <h2>Live Trading</h2>
        </div>
        <span className={`connectionPill ${authSession ? "connectionLive" : "connectionIdle"}`}>
          {authSession ? "Connected" : "Browse only"}
        </span>
      </div>

      <div className="sessionGrid">
        <div className="sessionMeta">
          <span>Wallet</span>
          <strong>{shortWallet(authSession?.walletAddress ?? null)}</strong>
        </div>
        <div className="sessionMeta">
          <span>User ID</span>
          <strong>{authSession?.userId ?? userId}</strong>
        </div>
        <div className="sessionMeta">
          <span>Polymarket Profile</span>
          <strong>{profile?.pseudonym ?? profile?.username ?? "Resolve after live connect"}</strong>
        </div>
        <div className="sessionMeta">
          <span>Funding</span>
          <strong>
            {allowanceSummary
              ? `${allowanceSummary.balance} balance / ${allowanceSummary.allowance} allowance`
              : authSession
                ? "Resolve on first live action"
                : "Connect wallet to resolve"}
          </strong>
        </div>
      </div>

      {!authSession ? (
        <button onClick={onConnectWallet} disabled={isWalletConnecting}>
          {isWalletConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <>
          <button className="ghostAction" onClick={() => void handleRunPreflight()} disabled={preflightPending}>
            {preflightPending ? "Checking..." : "Run Wallet Preflight"}
          </button>

          {preflightError ? <p className="emptyState">{preflightError}</p> : null}

          {preflight ? (
            <div className="walletPreflightPanel">
              <div className="walletPreflightHeader">
                <strong>{preflight.readyForLiveTrading ? "Wallet ready" : "Wallet needs funding"}</strong>
                <span>{new Date(preflight.checkedAt).toLocaleString()}</span>
              </div>

              <div className="sessionGrid">
                <div className="sessionMeta">
                  <span>Funder</span>
                  <strong>{shortWallet(preflight.funderAddress)}</strong>
                </div>
                <div className="sessionMeta">
                  <span>Proxy</span>
                  <strong>{shortWallet(preflight.proxyWalletAddress)}</strong>
                </div>
                <div className="sessionMeta">
                  <span>Balance</span>
                  <strong>{preflight.balance}</strong>
                </div>
                <div className="sessionMeta">
                  <span>Allowance</span>
                  <strong>{preflight.allowance}</strong>
                </div>
              </div>

              {preflight.warnings.length > 0 ? (
                <div className="walletPreflightWarnings">
                  {preflight.warnings.map((warning) => (
                    <span key={warning}>{warning}</span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
};
