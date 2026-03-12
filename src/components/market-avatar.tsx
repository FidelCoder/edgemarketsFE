import { Market } from "@/lib/types";

interface MarketAvatarProps {
  market: Pick<Market, "icon" | "question">;
  size?: "sm" | "md" | "lg";
}

const fallbackIcon = "https://polymarket.com/favicon.ico";

export const MarketAvatar = ({ market, size = "md" }: MarketAvatarProps) => {
  const sizeClass =
    size === "lg" ? "marketAvatar marketAvatarLg" : size === "sm" ? "marketAvatar marketAvatarSm" : "marketAvatar";

  return (
    <span className={sizeClass}>
      <img src={market.icon || fallbackIcon} alt={market.question} loading="lazy" />
    </span>
  );
};
