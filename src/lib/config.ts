const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
const defaultApiBaseUrl = process.env.NODE_ENV === "development" ? "http://localhost:4000" : "";

export const apiBaseUrl = configuredApiBaseUrl || defaultApiBaseUrl;

export const getApiBaseUrl = (): string => {
  if (apiBaseUrl) {
    return apiBaseUrl;
  }

  throw new Error(
    "NEXT_PUBLIC_API_BASE_URL is not configured for this deployment. Set it to your deployed EdgeMarkets backend URL."
  );
};
