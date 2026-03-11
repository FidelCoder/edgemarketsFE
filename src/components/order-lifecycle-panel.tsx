import Link from "next/link";
import { OrderRecord } from "@/lib/types";

interface OrderLifecyclePanelProps {
  orders: OrderRecord[];
  syncing: boolean;
  onRefresh: () => void;
}

const formatUsd = (value: number): string => {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

const shortHash = (value: string): string => {
  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
};

export const OrderLifecyclePanel = ({ orders, syncing, onRefresh }: OrderLifecyclePanelProps) => {
  return (
    <section className="panel orderPanel">
      <div className="panelHeaderRow">
        <div>
          <h2>Order Lifecycle</h2>
          <p>Live Polymarket orders synced from your connected wallet session.</p>
        </div>
        <button className="ghostAction" onClick={onRefresh} disabled={syncing}>
          {syncing ? "Syncing..." : "Refresh Orders"}
        </button>
      </div>

      {orders.length === 0 ? (
        <p className="emptyState">No live orders yet. Execute a strategy to start tracking order lifecycle.</p>
      ) : (
        <div className="orderTableWrap">
          <table className="orderTable">
            <thead>
              <tr>
                <th>Strategy</th>
                <th>Status</th>
                <th>Trade</th>
                <th>Side</th>
                <th>Notional</th>
                <th>Updated</th>
                <th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/strategies/${order.strategyId}`}>{order.strategyId}</Link>
                  </td>
                  <td>
                    <span className={`statusPill status-${order.status}`}>{order.status}</span>
                  </td>
                  <td>{order.tradeStatus}</td>
                  <td>
                    {order.side} {order.outcome}
                  </td>
                  <td>{formatUsd(order.amountUsd)}</td>
                  <td>{new Date(order.updatedAt).toLocaleString()}</td>
                  <td>
                    {order.transactionHashes[0] ? (
                      <a
                        href={`https://polygonscan.com/tx/${order.transactionHashes[0]}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {shortHash(order.transactionHashes[0])}
                      </a>
                    ) : (
                      "--"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
