const SETTINGS_KEY = "edgeSettings";

const DEFAULT_SETTINGS = {
  apiBaseUrl: "http://localhost:4000",
  userId: "trader-demo",
  fundingStablecoin: "USDC"
};

const getSettings = async () => {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  return {
    ...DEFAULT_SETTINGS,
    ...(stored[SETTINGS_KEY] ?? {})
  };
};

const saveSettings = async (settingsPatch) => {
  const current = await getSettings();
  const next = {
    ...current,
    ...settingsPatch
  };

  await chrome.storage.sync.set({
    [SETTINGS_KEY]: next
  });

  return next;
};

const request = async ({ apiBaseUrl, path, method = "GET", body }) => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const envelope = await response.json();

  if (!response.ok || envelope.error) {
    throw new Error(envelope.error?.message ?? `Request failed: ${response.status}`);
  }

  return envelope.data;
};

const buildFollowPayload = (strategy, settings) => {
  return {
    userId: settings.userId,
    maxDailyLossUsd: Math.max(1, Math.round(strategy.allocationUsd * 0.35)),
    maxMarketExposureUsd: strategy.allocationUsd,
    fundingStablecoin: settings.fundingStablecoin
  };
};

const handleFetchPanelData = async () => {
  const settings = await getSettings();
  const [runtime, strategies, stablecoins] = await Promise.all([
    request({ apiBaseUrl: settings.apiBaseUrl, path: "/api/runtime/config" }),
    request({ apiBaseUrl: settings.apiBaseUrl, path: "/api/strategies" }),
    request({ apiBaseUrl: settings.apiBaseUrl, path: "/api/stablecoins" })
  ]);

  return {
    settings,
    runtime,
    strategies,
    stablecoins
  };
};

const handleSimulateFollow = async (payload) => {
  const settings = await getSettings();

  return request({
    apiBaseUrl: settings.apiBaseUrl,
    path: "/api/runtime/simulate-follow",
    method: "POST",
    body: {
      strategyId: payload.strategyId,
      allocationUsd: payload.allocationUsd,
      fundingStablecoin: settings.fundingStablecoin
    }
  });
};

const handleFollowStrategy = async (payload) => {
  const settings = await getSettings();
  const strategies = await request({ apiBaseUrl: settings.apiBaseUrl, path: "/api/strategies" });
  const strategy = strategies.find((item) => item.id === payload.strategyId);

  if (!strategy) {
    throw new Error("Strategy not found.");
  }

  const followResult = await request({
    apiBaseUrl: settings.apiBaseUrl,
    path: `/api/strategies/${strategy.id}/follows`,
    method: "POST",
    body: buildFollowPayload(strategy, settings)
  });

  return {
    follow: followResult.follow,
    strategy: followResult.strategy,
    settings
  };
};

const responseOk = (sendResponse, data) => {
  sendResponse({ ok: true, data });
};

const responseError = (sendResponse, error) => {
  sendResponse({
    ok: false,
    error: error instanceof Error ? error.message : "Unknown extension error"
  });
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const execute = async () => {
    switch (message?.type) {
      case "EDGE_GET_SETTINGS":
        return getSettings();
      case "EDGE_SAVE_SETTINGS":
        return saveSettings(message.payload ?? {});
      case "EDGE_FETCH_PANEL_DATA":
        return handleFetchPanelData();
      case "EDGE_SIMULATE_FOLLOW":
        return handleSimulateFollow(message.payload);
      case "EDGE_FOLLOW_STRATEGY":
        return handleFollowStrategy(message.payload);
      default:
        throw new Error("Unsupported extension message type.");
    }
  };

  execute()
    .then((data) => responseOk(sendResponse, data))
    .catch((error) => responseError(sendResponse, error));

  return true;
});
