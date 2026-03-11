"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { edgeApi } from "@/lib/api";
import { CreatorPerformanceSummary, Strategy } from "@/lib/types";
import { CreatorPerformancePanel } from "./creator-performance-panel";

interface CreatorPageProps {
  creatorHandle: string;
}

export const CreatorPage = ({ creatorHandle }: CreatorPageProps) => {
  const [summary, setSummary] = useState<CreatorPerformanceSummary | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([edgeApi.getCreatorPerformance(creatorHandle), edgeApi.listStrategies()])
      .then(([nextSummary, nextStrategies]) => {
        setSummary(nextSummary);
        setStrategies(nextStrategies.filter((strategy) => strategy.creatorHandle === creatorHandle));
      })
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "Could not load creator page.");
      });
  }, [creatorHandle]);

  if (error) {
    return <p className="errorBanner">{error}</p>;
  }

  if (!summary) {
    return <p className="statusMessage">Loading creator performance...</p>;
  }

  return (
    <main className="pageShell">
      <Link href="/" className="backLink">
        Back to desk
      </Link>
      <CreatorPerformancePanel summary={summary} strategies={strategies} />
    </main>
  );
};
