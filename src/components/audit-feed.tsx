"use client";

import { FormEvent, useEffect, useState } from "react";
import { AuditEntityType, AuditLog } from "@/lib/types";

export interface AuditFilterState {
  actorId: string;
  entityType: "all" | AuditEntityType;
  limit: number;
}

interface AuditFeedProps {
  logs: AuditLog[];
  loading: boolean;
  filters: AuditFilterState;
  onApplyFilters: (filters: AuditFilterState) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
};

const defaultFilters: AuditFilterState = {
  actorId: "",
  entityType: "all",
  limit: 40
};

export const AuditFeed = ({
  logs,
  loading,
  filters,
  onApplyFilters,
  onRefresh
}: AuditFeedProps) => {
  const [draftFilters, setDraftFilters] = useState<AuditFilterState>(filters);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  const handleApply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onApplyFilters(draftFilters);
  };

  const handleReset = async () => {
    setDraftFilters(defaultFilters);
    await onApplyFilters(defaultFilters);
  };

  return (
    <section className="panel auditPanel">
      <div className="panelHeaderRow">
        <h2>Execution Audit Feed</h2>
        <span className="tag">{loading ? "Syncing..." : `${logs.length} events`}</span>
      </div>

      <form className="auditFilterBar" onSubmit={handleApply}>
        <label>
          Actor ID
          <input
            value={draftFilters.actorId}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, actorId: event.target.value }))
            }
            placeholder="wallet:0x..."
          />
        </label>

        <label>
          Entity
          <select
            value={draftFilters.entityType}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                entityType: event.target.value as AuditFilterState["entityType"]
              }))
            }
          >
            <option value="all">All</option>
            <option value="strategy">strategy</option>
            <option value="follow">follow</option>
            <option value="trigger_job">trigger_job</option>
            <option value="execution_log">execution_log</option>
            <option value="idempotency">idempotency</option>
            <option value="worker">worker</option>
            <option value="session">session</option>
            <option value="handoff">handoff</option>
            <option value="order">order</option>
            <option value="market_insight">market_insight</option>
          </select>
        </label>

        <label>
          Limit
          <select
            value={String(draftFilters.limit)}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, limit: Number(event.target.value) }))
            }
          >
            <option value="20">20</option>
            <option value="40">40</option>
            <option value="80">80</option>
            <option value="120">120</option>
          </select>
        </label>

        <div className="auditFilterActions">
          <button type="submit" disabled={loading}>
            Apply
          </button>
          <button type="button" className="ghostAction" disabled={loading} onClick={handleReset}>
            Reset
          </button>
          <button type="button" className="ghostAction" disabled={loading} onClick={() => void onRefresh()}>
            Refresh
          </button>
        </div>
      </form>

      {logs.length === 0 ? (
        <p className="auditEmpty">No events yet. Create, follow, or queue trigger jobs to populate the feed.</p>
      ) : (
        <div className="auditList">
          {logs.map((log) => (
            <article key={log.id} className="auditItem">
              <div className="auditItemTop">
                <strong>{log.action}</strong>
                <span>{formatTime(log.createdAt)}</span>
              </div>
              <div className="auditItemMeta">
                <span>Actor: {log.actorType}/{log.actorId}</span>
                <span>Entity: {log.entityType}{log.entityId ? `/${log.entityId}` : ""}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
