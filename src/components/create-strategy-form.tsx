"use client";

import { FormEvent, useMemo, useState } from "react";
import { CreateStrategyPayload, Market } from "@/lib/types";

interface CreateStrategyFormProps {
  markets: Market[];
  pending: boolean;
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

export const CreateStrategyForm = ({ markets, pending, onCreate }: CreateStrategyFormProps) => {
  const [values, setValues] = useState(initialState);
  const defaultMarketId = useMemo(() => markets[0]?.id ?? "", [markets]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onCreate({
      name: values.name,
      description: values.description,
      marketId: values.marketId || defaultMarketId,
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
        <h2>Create AI Strategy</h2>
        <span className="tag">Open Creator Market</span>
      </div>

      <label>
        Strategy Name
        <input
          required
          value={values.name}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          placeholder="Fed Momentum Reversal"
        />
      </label>

      <label>
        Description
        <textarea
          required
          value={values.description}
          onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
          placeholder="What triggers execution and why this has edge"
        />
      </label>

      <div className="inputGrid">
        <label>
          Market
          <select
            value={values.marketId || defaultMarketId}
            onChange={(event) => setValues((current) => ({ ...current, marketId: event.target.value }))}
          >
            {markets.map((market) => (
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
            onChange={(event) =>
              setValues((current) => ({ ...current, conditionValue: event.target.value }))
            }
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
            onChange={(event) =>
              setValues((current) => ({ ...current, allocationUsd: event.target.value }))
            }
          />
        </label>

        <label>
          Creator Handle
          <input
            required
            value={values.creatorHandle}
            onChange={(event) =>
              setValues((current) => ({ ...current, creatorHandle: event.target.value }))
            }
            placeholder="edgetrader"
          />
        </label>
      </div>

      <button type="submit" disabled={pending || markets.length === 0}>
        {pending ? "Publishing..." : "Publish Strategy"}
      </button>
    </form>
  );
};
