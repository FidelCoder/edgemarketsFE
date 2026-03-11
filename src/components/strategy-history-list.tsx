import { OrderRecord } from "@/lib/types";

interface StrategyHistoryListProps {
  orders: OrderRecord[];
}

export const StrategyHistoryList = ({ orders }: StrategyHistoryListProps) => {
  if (orders.length === 0) {
    return <p className="emptyState">No live order history has been synced for this strategy yet.</p>;
  }

  return (
    <div className="historyList">
      {orders.map((order) => (
        <article key={order.id} className="historyRow">
          <div>
            <span className="eyebrow">{order.status}</span>
            <h3>
              {order.side} {order.outcome} at {order.price.toFixed(3)}
            </h3>
            <p>
              {order.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD notional · {order.tradeStatus}
            </p>
          </div>
          <div className="historyMeta">
            <span>{new Date(order.updatedAt).toLocaleString()}</span>
            <span>{order.transactionHashes[0] ?? "No hash yet"}</span>
          </div>
        </article>
      ))}
    </div>
  );
};
