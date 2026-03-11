import { AuthSession, PolymarketProfile } from "@/lib/types";

interface TradingSessionPanelProps {
  authSession: AuthSession | null;
  userId: string;
  profile: PolymarketProfile | null;
  allowanceSummary: { balance: string; allowance: string } | null;
  isWalletConnecting: boolean;
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
  onConnectWallet
}: TradingSessionPanelProps) => {
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
      ) : null}
    </section>
  );
};
