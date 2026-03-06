"use client";

import { FormEvent, useMemo, useState } from "react";
import { AuthSession } from "@/lib/types";

interface SessionHandoffPanelProps {
  session: AuthSession | null;
  pendingStart: boolean;
  pendingConnect: boolean;
  connectedWallet: string | null;
  pendingHandoff: boolean;
  handoffCode: string | null;
  handoffExpiresAt: string | null;
  onStartSession: (walletAddress: string) => Promise<void>;
  onConnectWallet: () => Promise<void>;
  onGenerateHandoff: () => Promise<void>;
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
  session,
  pendingStart,
  pendingConnect,
  connectedWallet,
  pendingHandoff,
  handoffCode,
  handoffExpiresAt,
  onStartSession,
  onConnectWallet,
  onGenerateHandoff
}: SessionHandoffPanelProps) => {
  const [walletAddress, setWalletAddress] = useState("");
  const sessionTag = useMemo(() => {
    if (!session) {
      return "No active session";
    }

    return `${session.client} session`;
  }, [session]);

  const handleStartSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onStartSession(walletAddress);
  };

  return (
    <section className="panel sessionPanel">
      <div className="panelHeaderRow">
        <h2>Wallet</h2>
        <span className="tag">{sessionTag}</span>
      </div>

      <div className="sessionActionRow">
        <button disabled={pendingConnect || pendingStart} onClick={() => void onConnectWallet()}>
          {pendingConnect ? "Connecting..." : session ? "Reconnect Wallet" : "Connect Wallet"}
        </button>

        <button
          className="ghostAction"
          disabled={!session || pendingHandoff}
          onClick={() => void onGenerateHandoff()}
        >
          {pendingHandoff ? "Generating..." : "Generate Handoff"}
        </button>
      </div>

      <div className="sessionMeta">
        <span>Injected Wallet: {connectedWallet ? shorten(connectedWallet) : "Not connected"}</span>
        <span>Session Wallet: {session ? shorten(session.walletAddress) : "Not active"}</span>
        <span>User ID: {session ? session.userId : "--"}</span>
      </div>

      <details className="manualSession">
        <summary>Manual Session Start</summary>
        <form className="sessionForm" onSubmit={handleStartSession}>
          <label>
            Wallet Address
            <input
              value={walletAddress}
              onChange={(event) => setWalletAddress(event.target.value.trim())}
              placeholder="0x..."
            />
          </label>
          <button type="submit" disabled={pendingStart || walletAddress.length === 0}>
            {pendingStart ? "Starting..." : "Start Session"}
          </button>
        </form>
      </details>

      <div className="handoffMeta">
        <span>Handoff Code: {handoffCode ?? "--"}</span>
        <span>Expires At: {formatDate(handoffExpiresAt)}</span>
      </div>
    </section>
  );
};
