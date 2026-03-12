"use client";

import { useEffect, useMemo, useState } from "react";
import { edgeApi } from "@/lib/api";
import { Market, MarketComment, MarketContext, MarketPricePoint } from "@/lib/types";

interface MarketContextPanelProps {
  market: Market | null;
}

const formatUsd = (value: number | null): string => {
  if (value === null) {
    return "--";
  }

  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}k`;
  }

  return `$${Math.round(value)}`;
};

const formatPercent = (value: number | null, digits = 1): string => {
  if (value === null) {
    return "--";
  }

  return `${(value * 100).toFixed(digits)}%`;
};

const formatSignedPercent = (value: number | null): string => {
  if (value === null) {
    return "--";
  }

  const signed = (value * 100).toFixed(1);
  return `${value >= 0 ? "+" : ""}${signed}%`;
};

const formatCommentDate = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Now";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
};

const shortAddress = (value: string | null): string => {
  if (!value) {
    return "anon trader";
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const buildPricePath = (points: MarketPricePoint[], width: number, height: number): string => {
  if (points.length === 0) {
    return "";
  }

  const prices = points.map((point) => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = Math.max(maxPrice - minPrice, 0.001);

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((point.price - minPrice) / range) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
};

const buildAreaPath = (points: MarketPricePoint[], width: number, height: number): string => {
  if (points.length === 0) {
    return "";
  }

  const line = buildPricePath(points, width, height);
  return `${line} L ${width},${height} L 0,${height} Z`;
};

const resolveDisplayName = (comment: MarketComment): string => {
  return comment.pseudonym ?? comment.displayName ?? shortAddress(comment.userAddress);
};

export const MarketContextPanel = ({ market }: MarketContextPanelProps) => {
  const [context, setContext] = useState<MarketContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!market) {
      setContext(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    edgeApi
      .getMarketContext(market.id)
      .then((nextContext) => {
        if (!cancelled) {
          setContext(nextContext);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setContext(null);
          setError(nextError instanceof Error ? nextError.message : "Could not load live market context.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [market?.id]);

  const history = useMemo(() => context?.priceHistory ?? [], [context]);
  const linePath = useMemo(() => buildPricePath(history, 100, 100), [history]);
  const areaPath = useMemo(() => buildAreaPath(history, 100, 100), [history]);

  if (!market) {
    return null;
  }

  return (
    <section className="panel marketContextPanel">
      <div className="panelHeaderRow">
        <div>
          <span className="eyebrow">Market Context</span>
          <h2>Live price action and trader discussion</h2>
        </div>
        <div className="featuredTags">
          <span className="tag">{context?.eventTitle ?? market.category}</span>
          <span className="tag">{context?.commentsEnabled ? `${context.comments.length} comments` : "Comments off"}</span>
        </div>
      </div>

      {loading ? <p className="emptyState">Loading live chart and discussion...</p> : null}
      {error ? <p className="emptyState">{error}</p> : null}

      {context ? (
        <>
          {context.featuredImage ? (
            <div className="marketContextHero" style={{ backgroundImage: `url(${context.featuredImage})` }}>
              <div className="marketContextHeroOverlay">
                <span className="tag">{context.eventTitle ?? market.category}</span>
                <strong>{context.eventSubtitle ?? context.question}</strong>
              </div>
            </div>
          ) : null}

          <div className="marketContextMetricGrid">
            <div className="marketContextMetric">
              <span>24h volume</span>
              <strong>{formatUsd(context.volume24hr)}</strong>
            </div>
            <div className="marketContextMetric">
              <span>1d change</span>
              <strong>{formatSignedPercent(context.oneDayPriceChange)}</strong>
            </div>
            <div className="marketContextMetric">
              <span>1w change</span>
              <strong>{formatSignedPercent(context.oneWeekPriceChange)}</strong>
            </div>
            <div className="marketContextMetric">
              <span>Best bid / ask</span>
              <strong>
                {formatPercent(context.bestBid, 0)} / {formatPercent(context.bestAsk, 0)}
              </strong>
            </div>
          </div>

          <div className="marketContextGrid">
            <article className="marketContextCard chartCard">
              <div className="marketContextCardHead">
                <div>
                  <span className="eyebrow">Chart</span>
                  <h3>YES price history</h3>
                </div>
                <span className="tag">{history.length > 0 ? `${history.length} points` : "No history"}</span>
              </div>

              {history.length === 0 ? (
                <p className="emptyState">Price history is not available for this market yet.</p>
              ) : (
                <>
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="marketContextChart">
                    <defs>
                      <linearGradient id="marketChartFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(22, 199, 132, 0.42)" />
                        <stop offset="100%" stopColor="rgba(22, 199, 132, 0.02)" />
                      </linearGradient>
                    </defs>
                    <path d={areaPath} fill="url(#marketChartFill)" />
                    <path d={linePath} className="marketContextChartLine" />
                  </svg>
                  <div className="marketContextAxisRow">
                    <span>{new Date(history[0]?.timestamp ?? Date.now()).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    <span>{new Date(history[history.length - 1]?.timestamp ?? Date.now()).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                  </div>
                </>
              )}
            </article>

            <article className="marketContextCard discussionCard">
              <div className="marketContextCardHead">
                <div>
                  <span className="eyebrow">Discussion</span>
                  <h3>Live market comments</h3>
                </div>
                <span className="tag">{context.commentCount ?? context.comments.length}</span>
              </div>

              {context.comments.length === 0 ? (
                <p className="emptyState">No comments surfaced from Polymarket for this market yet.</p>
              ) : (
                <div className="marketCommentList">
                  {context.comments.map((comment) => (
                    <article key={comment.id} className="marketCommentCard">
                      <div className="marketCommentTop">
                        <strong>{resolveDisplayName(comment)}</strong>
                        <span>{formatCommentDate(comment.createdAt)}</span>
                      </div>
                      <p>{comment.body}</p>
                      <div className="marketCommentMeta">
                        <span>{shortAddress(comment.userAddress)}</span>
                        <span>{comment.reactionCount} reactions</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </div>

          {context.description || context.resolutionSource ? (
            <div className="marketContextFooter">
              {context.description ? <p>{context.description}</p> : <span />}
              {context.resolutionSource ? (
                <a href={context.resolutionSource} target="_blank" rel="noreferrer">
                  Resolution source
                </a>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
};
