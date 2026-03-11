"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CreateStrategyPayload, Market } from "@/lib/types";

interface CreateStrategyFormProps {
  markets: Market[];
  pending: boolean;
  defaultCreatorHandle?: string;
  selectedMarket: Market | null;
  selectedMarketId?: string;
  onCreate: (payload: CreateStrategyPayload) => Promise<void>;
}

interface CreateStrategyFormState {
  name: string;
  description: string;
  marketId: string;
  triggerType: CreateStrategyPayload["triggerType"];
  conditionValue: string;
  action: CreateStrategyPayload["action"];
  allocationUsd: string;
  creatorHandle: string;
}

const initialState: CreateStrategyFormState = {
  name: "",
  description: "",
  marketId: "",
  triggerType: "price_below",
  conditionValue: "0.5",
  action: "buy_yes",
  allocationUsd: "250",
  creatorHandle: ""
};

export const CreateStrategyForm = ({
  markets,
  pending,
  defaultCreatorHandle,
  selectedMarket,
  selectedMarketId,
  onCreate
}: CreateStrategyFormProps) => {
  const [values, setValues] = useState(initialState);
  const tradableMarkets = useMemo(() => markets.filter((market) => market.orderBookEnabled), [markets]);
  const defaultMarketId = useMemo(() => tradableMarkets[0]?.id ?? "", [tradableMarkets]);

  useEffect(() => {
    if (!defaultCreatorHandle) {
      return;
    }

    setValues((current) => {
      if (current.creatorHandle.trim().length > 0) {
        return current;
      }

      return {
        ...current,
        creatorHandle: defaultCreatorHandle.slice(0, 24)
      };
    });
  }, [defaultCreatorHandle]);

  useEffect(() => {
    const nextMarketId = selectedMarketId ?? defaultMarketId;

    if (!nextMarketId) {
      return;
    }

    setValues((current) => {
      if (current.marketId === nextMarketId) {
        return current;
      }

      return {
        ...current,
        marketId: nextMarketId
      };
    });
  }, [defaultMarketId, selectedMarketId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onCreate({
      name: values.name,
      description: values.description,
      marketId: values.marketId || selectedMarketId || defaultMarketId,
      triggerType: values.triggerType,
      conditionValue: Number(values.conditionValue),
      action: values.action,
      allocationUsd: Number(values.allocationUsd),
      creatorHandle: values.creatorHandle
    });

    setValues((current) => ({
      ...current,
      name: "",
      description: ""
    }));
  };

  return (
    <form className="panel formPanel" onSubmit={handleSubmit}>
      <div className="panelHeaderRow">
        <div>
          <span className="eyebrow">Create Strategy</span>
          <h2>Publish AI Entry Logic</h2>
          <p>
            {selectedMarket
              ? `Attach your strategy to ${selectedMarket.question}`
              : "Select a live market and publish execution logic instantly."}
          </p>
        </div>
        <span className="tag">{selectedMarket?.category ?? "Live"}</span>
      </div>

      {selectedMarket ? (
        <div className="selectedMarketBanner">
          <span>Selected market</span>
          <strong>{selectedMarket.question}</strong>
        </div>
      ) : null}

      <label>
        Strategy Name
        <input
          required
          maxLength={70}
          value={values.name}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          placeholder="Fed Momentum Reversal"
        />
      </label>

      <label>
        Description
        <textarea
          required
          maxLength={240}
          value={values.description}
          onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
          placeholder="Explain the edge, trigger, and why the execution belongs on this market."
        />
      </label>

      <div className="inputGrid">
        <label>
          Live Market
          <select
            value={values.marketId || selectedMarketId || defaultMarketId}
            onChange={(event) => setValues((current) => ({ ...current, marketId: event.target.value }))}
          >
            {tradableMarkets.map((market) => (
              <option key={market.id} value={market.id}>
                {market.question}
              </option>
            ))}
          </select>
        </label>

        <label>
          Trigger Type
          <select
            value={values.triggerType}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                triggerType: event.target.value as CreateStrategyPayload["triggerType"]
              }))
            }
          >
            <option value="price_below">Price Below</option>
            <option value="price_above">Price Above</option>
            <option value="time_window">Time Window</option>
          </select>
        </label>

        <label>
          Condition Value
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={values.conditionValue}
            onChange={(event) => setValues((current) => ({ ...current, conditionValue: event.target.value }))}
          />
        </label>

        <label>
          Action
          <select
            value={values.action}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                action: event.target.value as CreateStrategyPayload["action"]
              }))
            }
          >
            <option value="buy_yes">Buy YES</option>
            <option value="buy_no">Buy NO</option>
            <option value="sell_yes">Sell YES</option>
            <option value="sell_no">Sell NO</option>
          </select>
        </label>

        <label>
          Allocation USD
          <input
            required
            type="number"
            min="1"
            value={values.allocationUsd}
            onChange={(event) => setValues((current) => ({ ...current, allocationUsd: event.target.value }))}
          />
        </label>

        <label>
          Creator Handle
          <input
            required
            minLength={2}
            maxLength={24}
            pattern="[a-zA-Z0-9_]+"
            value={values.creatorHandle}
            onChange={(event) => setValues((current) => ({ ...current, creatorHandle: event.target.value }))}
            placeholder="edgetrader"
          />
        </label>
      </div>

      <button type="submit" disabled={pending || tradableMarkets.length === 0}>
        {pending ? "Publishing..." : "Publish Strategy"}
      </button>
    </form>
  );
};
