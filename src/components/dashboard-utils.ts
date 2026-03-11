import { OrderRecord } from "@/lib/types";
import { AuditFilterState } from "./audit-feed";

export const defaultUserId = "trader-demo";
export const webSessionStorageKey = "edge.web.session.token";

export const defaultAuditFilters: AuditFilterState = {
  actorId: "",
  entityType: "all",
  limit: 40
};

export const generateMutationKey = (scope: string): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `web:${scope}:${crypto.randomUUID()}`;
  }

  const randomSegment = Math.random().toString(36).slice(2, 14);
  return `web:${scope}:${Date.now().toString(36)}:${randomSegment}`;
};

export const toCreatorHandle = (wallet: string | null, fallbackUserId: string): string => {
  if (wallet) {
    return `wallet_${wallet.slice(2, 10)}`.toLowerCase();
  }

  const fallback = fallbackUserId
    .replace("wallet:", "wallet_")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .slice(0, 24);

  return fallback.length >= 2 ? fallback : "edgetrader";
};

export const toAuditQuery = (filters: AuditFilterState) => ({
  actorId: filters.actorId.trim() || undefined,
  entityType: filters.entityType === "all" ? undefined : filters.entityType,
  limit: filters.limit
});

export const isSyncableOrder = (order: OrderRecord): boolean => {
  return order.status === "submitted" || order.status === "open" || order.status === "retried";
};
