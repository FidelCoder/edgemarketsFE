"use client";

interface SessionHandoffPanelProps {
  connectedWallet: string | null;
  handoffCode: string | null;
  handoffExpiresAt: string | null;
  pending: boolean;
  onCreateHandoff: () => void;
}

const shorten = (value: string): string => {
  if (value.length < 14) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
};

const formatDate = (value: string | null): string => {
  if (!value) {
    return "--";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

export const SessionHandoffPanel = ({
  connectedWallet,
  handoffCode,
  handoffExpiresAt,
  pending,
  onCreateHandoff
}: SessionHandoffPanelProps) => {
  return (
    <section className="panel sessionPanel compactPanel">
      <div className="panelHeaderRow">
        <h2>Extension Handoff</h2>
        <span className="tag">{connectedWallet ? "Ready" : "Wallet Required"}</span>
      </div>

      <div className="sessionMeta">
        <span>Web Wallet</span>
        <strong>{connectedWallet ? shorten(connectedWallet) : "Not connected"}</strong>
      </div>

      <button className="ghostAction" disabled={!connectedWallet || pending} onClick={onCreateHandoff}>
        {pending ? "Generating..." : "Generate Handoff Code"}
      </button>

      <div className="handoffMeta">
        <span>Handoff Code: {handoffCode ?? "--"}</span>
        <span>Expires At: {formatDate(handoffExpiresAt)}</span>
      </div>
    </section>
  );
};
