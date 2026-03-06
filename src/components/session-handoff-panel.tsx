"use client";

import { FormEvent, useMemo, useState } from "react";
import { AuthSession } from "@/lib/types";

interface SessionHandoffPanelProps {
  session: AuthSession | null;
  pendingStart: boolean;
  pendingHandoff: boolean;
  handoffCode: string | null;
  handoffExpiresAt: string | null;
  onStartSession: (walletAddress: string) => Promise<void>;
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
  pendingHandoff,
  handoffCode,
  handoffExpiresAt,
  onStartSession,
  onGenerateHandoff
}: SessionHandoffPanelProps) => {
  const [walletAddress, setWalletAddress] = useState("");
  const sessionTag = useMemo(() => {
    if (!session) {
      return "No active wallet session";
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
        <h2>Wallet Session</h2>
        <span className="tag">{sessionTag}</span>
      </div>

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
          {pendingStart ? "Starting..." : "Start Web Session"}
        </button>
      </form>

      {session ? (
        <div className="sessionMeta">
          <span>Wallet: {shorten(session.walletAddress)}</span>
          <span>User ID: {session.userId}</span>
          <span>Token: {shorten(session.token)}</span>
          <span>Last active: {formatDate(session.lastActiveAt)}</span>
        </div>
      ) : (
        <p className="auditEmpty">Start a web session to generate a handoff code for your extension.</p>
      )}

      <button
        className="ghostAction"
        disabled={!session || pendingHandoff}
        onClick={() => void onGenerateHandoff()}
      >
        {pendingHandoff ? "Generating..." : "Generate Extension Handoff Code"}
      </button>

      <div className="handoffMeta">
        <span>Handoff Code: {handoffCode ?? "--"}</span>
        <span>Expires At: {formatDate(handoffExpiresAt)}</span>
      </div>
    </section>
  );
};
