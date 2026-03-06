"use client";

import { AuditLog } from "@/lib/types";

interface AuditFeedProps {
  logs: AuditLog[];
  loading: boolean;
}

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
};

export const AuditFeed = ({ logs, loading }: AuditFeedProps) => {
  return (
    <section className="panel auditPanel">
      <div className="panelHeaderRow">
        <h2>Execution Audit Feed</h2>
        <span className="tag">{loading ? "Syncing..." : `${logs.length} events`}</span>
      </div>

      {logs.length === 0 ? (
        <p className="auditEmpty">No events yet. Create or follow a strategy to populate the feed.</p>
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
