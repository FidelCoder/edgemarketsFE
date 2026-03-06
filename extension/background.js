const SETTINGS_KEY = "edgeSettings";

const DEFAULT_SETTINGS = {
  apiBaseUrl: "http://localhost:4000",
  userId: "trader-demo",
  fundingStablecoin: "USDC",
  sessionToken: "",
  walletAddress: ""
};

const IDEMPOTENCY_HEADER = "idempotency-key";
const IDEMPOTENCY_STATUS_HEADER = "idempotency-status";

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
    ...settingsPatch,
    apiBaseUrl: (settingsPatch.apiBaseUrl ?? current.apiBaseUrl).trim(),
    userId: (settingsPatch.userId ?? current.userId).trim(),
    sessionToken: (settingsPatch.sessionToken ?? current.sessionToken).trim(),
    walletAddress: (settingsPatch.walletAddress ?? current.walletAddress).trim()
  };

  await chrome.storage.sync.set({
    [SETTINGS_KEY]: next
  });

  return next;
};

const withSessionHeaders = (headers, sessionToken) => {
  if (!sessionToken) {
    return headers;
  }

  return {
    ...headers,
    Authorization: `Bearer ${sessionToken}`
  };
};

const request = async ({ apiBaseUrl, path, method = "GET", body, headers = {}, sessionToken }) => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: withSessionHeaders(
      {
        "Content-Type": "application/json",
        ...headers
      },
      sessionToken
    ),
    body: body ? JSON.stringify(body) : undefined
  });

  const envelope = await response.json();

  if (!response.ok || envelope.error) {
    throw new Error(envelope.error?.message ?? `Request failed: ${response.status}`);
  }

  return envelope.data;
};

const generateIdempotencyKey = (scope) => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `ext:${scope}:${crypto.randomUUID()}`;
  }

  const randomSegment = Math.random().toString(36).slice(2, 14);
  return `ext:${scope}:${Date.now().toString(36)}:${randomSegment}`;
};

const requestMutation = async ({ apiBaseUrl, path, body, idempotencyKey, sessionToken }) => {
  const key = idempotencyKey ?? generateIdempotencyKey("mutation");
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: withSessionHeaders(
      {
        "Content-Type": "application/json",
        [IDEMPOTENCY_HEADER]: key
      },
      sessionToken
    ),
    body: JSON.stringify(body)
  });

  const envelope = await response.json();

  if (!response.ok || envelope.error) {
    throw new Error(envelope.error?.message ?? `Request failed: ${response.status}`);
  }

  return {
    data: envelope.data,
    idempotencyStatus: response.headers.get(IDEMPOTENCY_STATUS_HEADER) ?? "none",
    idempotencyKey: response.headers.get(IDEMPOTENCY_HEADER) ?? key
  };
};

const buildFollowPayload = (strategy, settings) => {
  return {
    userId: settings.userId,
    maxDailyLossUsd: Math.max(1, Math.round(strategy.allocationUsd * 0.35)),
    maxMarketExposureUsd: strategy.allocationUsd,
    fundingStablecoin: settings.fundingStablecoin
  };
};

const buildTriggerPayload = (strategy, settings) => {
  return {
    strategyId: strategy.id,
    userId: settings.userId,
    fundingStablecoin: settings.fundingStablecoin,
    allocationUsd: strategy.allocationUsd,
    maxAttempts: 3
  };
};

const handleFetchPanelData = async () => {
  const settings = await getSettings();
  const [runtime, strategies, stablecoins] = await Promise.all([
    request({ apiBaseUrl: settings.apiBaseUrl, path: "/api/runtime/config" }),
    request({ apiBaseUrl: settings.apiBaseUrl, path: "/api/strategies" }),
    request({ apiBaseUrl: settings.apiBaseUrl, path: "/api/stablecoins" })
  ]);

  let session = null;

  if (settings.sessionToken) {
    try {
      session = await request({
        apiBaseUrl: settings.apiBaseUrl,
        path: "/api/auth/sessions/me",
        sessionToken: settings.sessionToken
      });
    } catch {
      session = null;
    }
  }

  return {
    settings,
    runtime,
    strategies,
    stablecoins,
    session
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

const loadStrategyById = async (settings, strategyId) => {
  const strategies = await request({ apiBaseUrl: settings.apiBaseUrl, path: "/api/strategies" });
  const strategy = strategies.find((item) => item.id === strategyId);

  if (!strategy) {
    throw new Error("Strategy not found.");
  }

  return strategy;
};

const handleFollowStrategy = async (payload) => {
  const settings = await getSettings();
  const strategy = await loadStrategyById(settings, payload.strategyId);

  const followResult = await requestMutation({
    apiBaseUrl: settings.apiBaseUrl,
    path: `/api/strategies/${strategy.id}/follows`,
    body: buildFollowPayload(strategy, settings),
    idempotencyKey: generateIdempotencyKey(`follow-${strategy.id}`),
    sessionToken: settings.sessionToken
  });

  return {
    follow: followResult.data.follow,
    strategy: followResult.data.strategy,
    idempotencyStatus: followResult.idempotencyStatus,
    idempotencyKey: followResult.idempotencyKey,
    settings
  };
};

const handleCreateTriggerJob = async (payload) => {
  const settings = await getSettings();
  const strategy = await loadStrategyById(settings, payload.strategyId);

  const jobResult = await requestMutation({
    apiBaseUrl: settings.apiBaseUrl,
    path: "/api/trigger-jobs",
    body: buildTriggerPayload(strategy, settings),
    idempotencyKey: generateIdempotencyKey(`trigger-${strategy.id}`),
    sessionToken: settings.sessionToken
  });

  return {
    triggerJob: jobResult.data,
    strategy,
    idempotencyStatus: jobResult.idempotencyStatus,
    idempotencyKey: jobResult.idempotencyKey,
    settings
  };
};

const handleConsumeHandoff = async (payload) => {
  if (!payload?.handoffCode) {
    throw new Error("Handoff code is required.");
  }

  const settings = await getSettings();
  const session = await request({
    apiBaseUrl: settings.apiBaseUrl,
    path: "/api/auth/handoff/consume",
    method: "POST",
    body: {
      handoffCode: payload.handoffCode
    }
  });

  const updatedSettings = await saveSettings({
    sessionToken: session.token,
    walletAddress: session.walletAddress,
    userId: session.userId
  });

  return {
    session,
    settings: updatedSettings
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
      case "EDGE_CREATE_TRIGGER_JOB":
        return handleCreateTriggerJob(message.payload);
      case "EDGE_AUTH_CONSUME_HANDOFF":
        return handleConsumeHandoff(message.payload);
      default:
        throw new Error("Unsupported extension message type.");
    }
  };

  execute()
    .then((data) => responseOk(sendResponse, data))
    .catch((error) => responseError(sendResponse, error));

  return true;
});
