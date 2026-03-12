"use client";

import { useEffect, useMemo, useState } from "react";
import { edgeApi } from "@/lib/api";
import { placeLiveMarketOrder, type LiveClobContext } from "@/lib/polymarket";
import {
  AutomationPlan,
  GenerateAutomationPlanPayload,
  Market,
  OrderRecord,
  RuntimeConfig,
  AuthSession
} from "@/lib/types";

export type AgentSessionStatus = "draft" | "running" | "halted";

export interface AgentAutomationSession {
  plan: AutomationPlan;
  status: AgentSessionStatus;
  executedOrderIds: string[];
  executedMarketIds: string[];
  haltReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentAutomationEvaluation {
  deployedUsd: number;
  markToMarketPnlUsd: number;
  dayPnlUsd: number;
  drawdownPct: number;
  consecutiveLosses: number;
  haltTriggered: boolean;
  haltReason?: string;
  executedOrders: number;
  effectiveBankrollUsd: number;
}

interface UseAgentAutomationOptions {
  runtime: RuntimeConfig | null;
  authSession: AuthSession | null;
  markets: Market[];
  orders: OrderRecord[];
  ensureLiveContext: () => Promise<LiveClobContext>;
  onOrdersChange: (orders: OrderRecord[]) => void;
  onStatus: (message: string) => void;
  onError: (message: string) => void;
}

const storageKey = "edge-agent-session-v1";

const todayKey = (): string => new Date().toISOString().slice(0, 10);

const isBuyOrder = (order: OrderRecord): boolean => order.side === "BUY";

const getMarketPriceForOrder = (order: OrderRecord, market: Market): number => {
  return order.outcome === "YES" ? market.yesPrice : market.noPrice;
};

const countConsecutiveLosses = (orders: OrderRecord[], marketMap: Map<string, Market>): number => {
  let streak = 0;

  for (const order of [...orders].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))) {
    if (!isBuyOrder(order)) {
      continue;
    }

    const market = marketMap.get(order.marketId);
    if (!market) {
      continue;
    }

    const pnlUsd = order.size * getMarketPriceForOrder(order, market) - order.amountUsd;

    if (pnlUsd < 0) {
      streak += 1;
      continue;
    }

    break;
  }

  return streak;
};

const evaluateSession = (
  session: AgentAutomationSession | null,
  orders: OrderRecord[],
  markets: Market[]
): AgentAutomationEvaluation | null => {
  if (!session) {
    return null;
  }

  const marketMap = new Map(markets.map((market) => [market.id, market]));
  const relevantOrders = orders.filter((order) => {
    return order.source === "agent" && session.executedOrderIds.includes(order.id);
  });

  const markToMarketPnlUsd = relevantOrders.reduce((sum, order) => {
    if (!isBuyOrder(order)) {
      return sum;
    }

    const market = marketMap.get(order.marketId);
    if (!market) {
      return sum;
    }

    const currentValue = order.size * getMarketPriceForOrder(order, market);
    return sum + (currentValue - order.amountUsd);
  }, 0);

  const dayPnlUsd = relevantOrders.reduce((sum, order) => {
    if (!order.updatedAt.startsWith(todayKey()) || !isBuyOrder(order)) {
      return sum;
    }

    const market = marketMap.get(order.marketId);
    if (!market) {
      return sum;
    }

    const currentValue = order.size * getMarketPriceForOrder(order, market);
    return sum + (currentValue - order.amountUsd);
  }, 0);

  const deployedUsd = relevantOrders.reduce((sum, order) => sum + order.amountUsd, 0);
  const drawdownPct = Math.max(0, (-markToMarketPnlUsd / Math.max(session.plan.bankrollUsd, 1)) * 100);
  const consecutiveLosses = countConsecutiveLosses(relevantOrders, marketMap);
  const haltByDrawdown = drawdownPct >= session.plan.haltRules.maxDrawdownPct;
  const haltByDayLoss = -dayPnlUsd >= session.plan.haltRules.dailyLossLimitUsd;
  const haltByLossStreak = consecutiveLosses >= session.plan.haltRules.maxConsecutiveLosses;
  const haltReason = haltByDrawdown
    ? `Drawdown limit hit (${drawdownPct.toFixed(1)}% >= ${session.plan.haltRules.maxDrawdownPct}%).`
    : haltByDayLoss
      ? `Daily loss limit hit ($${(-dayPnlUsd).toFixed(2)} >= $${session.plan.haltRules.dailyLossLimitUsd.toFixed(2)}).`
      : haltByLossStreak
        ? `Loss streak halt hit (${consecutiveLosses} >= ${session.plan.haltRules.maxConsecutiveLosses}).`
      : undefined;

  return {
    deployedUsd: Number(deployedUsd.toFixed(2)),
    markToMarketPnlUsd: Number(markToMarketPnlUsd.toFixed(2)),
    dayPnlUsd: Number(dayPnlUsd.toFixed(2)),
    drawdownPct: Number(drawdownPct.toFixed(2)),
    consecutiveLosses,
    haltTriggered: Boolean(haltReason),
    haltReason,
    executedOrders: relevantOrders.length,
    effectiveBankrollUsd: Number((session.plan.bankrollUsd + markToMarketPnlUsd).toFixed(2))
  };
};

const readStoredSession = (): AgentAutomationSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AgentAutomationSession;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
};

export const useAgentAutomation = ({
  runtime,
  authSession,
  markets,
  orders,
  ensureLiveContext,
  onOrdersChange,
  onStatus,
  onError
}: UseAgentAutomationOptions) => {
  const [session, setSession] = useState<AgentAutomationSession | null>(null);
  const [planPending, setPlanPending] = useState(false);
  const [executionPending, setExecutionPending] = useState(false);

  useEffect(() => {
    setSession(readStoredSession());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!session) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(session));
  }, [session]);

  const evaluation = useMemo(() => evaluateSession(session, orders, markets), [session, orders, markets]);

  useEffect(() => {
    if (!session || session.status === "halted" || !evaluation?.haltTriggered) {
      return;
    }

    const halted: AgentAutomationSession = {
      ...session,
      status: "halted",
      haltReason: evaluation.haltReason,
      updatedAt: new Date().toISOString()
    };

    setSession(halted);
    onStatus(evaluation.haltReason ?? "Agent halted.");
  }, [evaluation?.haltReason, evaluation?.haltTriggered, onStatus, session]);

  const generatePlan = async (payload: GenerateAutomationPlanPayload) => {
    if (!runtime?.aiEnabled) {
      onError("Backend AI provider is not configured.");
      return;
    }

    setPlanPending(true);

    try {
      const plan = await edgeApi.generateAutomationPlan(payload);
      const nextSession: AgentAutomationSession = {
        plan,
        status: "draft",
        executedOrderIds: [],
        executedMarketIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setSession(nextSession);
      onStatus(`Agent plan generated with ${plan.legs.length} market legs.`);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not generate agent plan.");
    } finally {
      setPlanPending(false);
    }
  };

  const haltSession = (reason = "Agent halted manually.", baseSession?: AgentAutomationSession) => {
    const targetSession = baseSession ?? session;

    if (!targetSession) {
      return;
    }

    setSession({
      ...targetSession,
      status: "halted",
      haltReason: reason,
      updatedAt: new Date().toISOString()
    });
    onStatus(reason);
  };

  const executePlan = async () => {
    if (!session) {
      onError("Generate an agent plan before executing it.");
      return;
    }

    if (!authSession) {
      onError("Connect a wallet before running the agent.");
      return;
    }

    if (runtime?.executionMode !== "live") {
      onError("Backend runtime must be in live mode for agent execution.");
      return;
    }

    if (session.status === "halted") {
      onError(session.haltReason ?? "Agent is halted.");
      return;
    }

    setExecutionPending(true);
    let workingSession: AgentAutomationSession = {
      ...session,
      status: "running",
      updatedAt: new Date().toISOString()
    };
    let latestOrders = orders;

    try {
      const context = await ensureLiveContext();
      setSession(workingSession);

      for (const leg of workingSession.plan.legs) {
        if (workingSession.executedMarketIds.includes(leg.marketId)) {
          continue;
        }

        const currentEvaluation = evaluateSession(workingSession, latestOrders, markets);
        if (currentEvaluation?.haltTriggered) {
          haltSession(currentEvaluation.haltReason ?? "Agent halt rule triggered.", workingSession);
          return;
        }

        const market = markets.find((entry) => entry.id === leg.marketId);
        if (!market) {
          continue;
        }

        const payload = await placeLiveMarketOrder(context, {
          market,
          action: leg.action,
          allocationUsd: leg.allocationUsd,
          userId: authSession.userId
        });
        const record = await edgeApi.upsertOrder(authSession.token, payload);

        workingSession = {
          ...workingSession,
          executedOrderIds: [...workingSession.executedOrderIds, record.id],
          executedMarketIds: [...workingSession.executedMarketIds, leg.marketId],
          updatedAt: new Date().toISOString()
        };
        setSession(workingSession);

        latestOrders = await edgeApi.listOrders(authSession.token, { limit: 40 });
        onOrdersChange(latestOrders);
      }

      onStatus(`Agent submitted ${workingSession.executedMarketIds.length} live legs.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not execute agent plan.";
      haltSession(`Execution stopped: ${message}`, workingSession);
      onError(message);
    } finally {
      setExecutionPending(false);
    }
  };

  return {
    session,
    plan: session?.plan ?? null,
    evaluation,
    planPending,
    executionPending,
    generatePlan,
    executePlan,
    haltSession
  };
};
