import { StrategyPage } from "@/components/strategy-page";

interface StrategyRouteProps {
  params: Promise<{
    strategyId: string;
  }>;
}

export default async function StrategyRoute({ params }: StrategyRouteProps) {
  const resolved = await params;
  return <StrategyPage strategyId={resolved.strategyId} />;
}
