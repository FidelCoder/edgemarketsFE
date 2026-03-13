"use client";

import { useEffect, useMemo, useState } from "react";
import { edgeApi } from "@/lib/api";
import { placeLiveMarketOrder, type LiveClobContext } from "@/lib/polymarket";
import {
  AgentEvaluationSnapshot,
  AgentSession,
  GenerateAutomationPlanPayload,
  Market,
  OrderRecord,
  RuntimeConfig,
  AuthSession,
  UpsertAgentSessionPayload
} from "@/lib/types";

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
  session: AgentSession | null,
  orders: OrderRecord[],
  markets: Market[]
): AgentEvaluationSnapshot | null => {
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
  const [session, setSession] = useState<AgentSession | null>(null);
  const [planPending, setPlanPending] = useState(false);
  const [executionPending, setExecutionPending] = useState(false);

  useEffect(() => {
    if (!authSession) {
      setSession(null);
      return;
    }

    edgeApi
      .getAgentSession(authSession.token)
      .then(setSession)
      .catch((error) => {
        onError(error instanceof Error ? error.message : "Could not load persisted agent session.");
      });
  }, [authSession, onError]);

  const evaluation = useMemo(() => evaluateSession(session, orders, markets), [session, orders, markets]);

  const persistSession = async (
    nextSession: AgentSession,
    nextEvaluation?: AgentEvaluationSnapshot | null
  ): Promise<AgentSession> => {
    if (!authSession) {
      throw new Error("Connect a wallet before persisting the agent session.");
    }

    const payload: UpsertAgentSessionPayload = {
      status: nextSession.status,
      plan: nextSession.plan,
      executedOrderIds: nextSession.executedOrderIds,
      executedMarketIds: nextSession.executedMarketIds,
      haltReason: nextSession.haltReason,
      lastEvaluation: nextEvaluation ?? undefined
    };
    const saved = await edgeApi.upsertAgentSession(authSession.token, payload);
    setSession(saved);
    return saved;
  };

  useEffect(() => {
    if (!session || session.status === "halted" || !evaluation?.haltTriggered) {
      return;
    }

    const halted: AgentSession = {
      ...session,
      status: "halted",
      haltReason: evaluation.haltReason,
      updatedAt: new Date().toISOString()
    };
    void persistSession(halted, evaluation)
      .then(() => onStatus(evaluation.haltReason ?? "Agent halted."))
      .catch((error) => onError(error instanceof Error ? error.message : "Could not persist halted agent session."));
  }, [evaluation, onError, onStatus, session]);

  const generatePlan = async (payload: GenerateAutomationPlanPayload) => {
    if (!runtime?.aiEnabled) {
      onError("Backend AI provider is not configured.");
      return;
    }

    if (!authSession) {
      onError("Connect a wallet before creating a persisted agent plan.");
      return;
    }

    setPlanPending(true);

    try {
      const plan = await edgeApi.generateAutomationPlan(payload);
      const nextSession: AgentSession = {
        id: "",
        userId: authSession.userId,
        walletAddress: authSession.walletAddress,
        plan,
        status: "draft",
        executedOrderIds: [],
        executedMarketIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await persistSession(nextSession);
      onStatus(`Agent plan generated with ${plan.legs.length} market legs.`);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not generate agent plan.");
    } finally {
      setPlanPending(false);
    }
  };

  const haltSession = async (reason = "Agent halted manually.", baseSession?: AgentSession) => {
    const targetSession = baseSession ?? session;

    if (!targetSession) {
      return;
    }

    const halted: AgentSession = {
      ...targetSession,
      status: "halted",
      haltReason: reason,
      updatedAt: new Date().toISOString()
    };

    try {
      const haltedEvaluation = evaluateSession(halted, orders, markets);
      await persistSession(halted, haltedEvaluation);
      onStatus(reason);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not halt the agent session.");
    }
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
    let workingSession: AgentSession = {
      ...session,
      status: "running",
      updatedAt: new Date().toISOString()
    };
    let latestOrders = orders;

    try {
      const context = await ensureLiveContext();
      workingSession = await persistSession(workingSession, evaluateSession(workingSession, latestOrders, markets));

      for (const leg of workingSession.plan.legs) {
        if (workingSession.executedMarketIds.includes(leg.marketId)) {
          continue;
        }

        const currentEvaluation = evaluateSession(workingSession, latestOrders, markets);
        if (currentEvaluation?.haltTriggered) {
          await haltSession(currentEvaluation.haltReason ?? "Agent halt rule triggered.", workingSession);
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
        latestOrders = await edgeApi.listOrders(authSession.token, { limit: 40 });
        onOrdersChange(latestOrders);
        workingSession = await persistSession(workingSession, evaluateSession(workingSession, latestOrders, markets));
      }

      onStatus(`Agent submitted ${workingSession.executedMarketIds.length} live legs.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not execute agent plan.";
      await haltSession(`Execution stopped: ${message}`, workingSession);
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
