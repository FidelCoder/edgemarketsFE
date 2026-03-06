(() => {
  const ROOT_ID = "edge-markets-extension-root";

  if (document.getElementById(ROOT_ID)) {
    return;
  }

  const state = {
    open: false,
    loading: false,
    error: "",
    notice: "",
    panelData: null,
    pendingStrategyId: null
  };

  const root = document.createElement("div");
  root.id = ROOT_ID;

  const launcher = document.createElement("button");
  launcher.className = "edge-launcher";
  launcher.type = "button";
  launcher.textContent = "EdgeMarkets";

  const panel = document.createElement("aside");
  panel.className = "edge-panel edge-hidden";
  panel.innerHTML = `
    <header class="edge-panel-header">
      <div>
        <p class="edge-eyebrow">EdgeMarkets</p>
        <h2>AI Strategy Overlay</h2>
      </div>
      <button type="button" class="edge-close-btn">Close</button>
    </header>
    <div class="edge-panel-toolbar">
      <button type="button" class="edge-refresh-btn">Refresh</button>
      <span class="edge-runtime-tag">Runtime: --</span>
    </div>
    <p class="edge-account-line">User: -- | Stablecoin: --</p>
    <p class="edge-status-line"></p>
    <section class="edge-strategy-list"></section>
  `;

  root.appendChild(launcher);
  root.appendChild(panel);
  document.body.appendChild(root);

  const closeButton = panel.querySelector(".edge-close-btn");
  const refreshButton = panel.querySelector(".edge-refresh-btn");
  const runtimeTag = panel.querySelector(".edge-runtime-tag");
  const accountLine = panel.querySelector(".edge-account-line");
  const statusLine = panel.querySelector(".edge-status-line");
  const strategyList = panel.querySelector(".edge-strategy-list");

  const sendMessage = (message) => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (!response) {
          reject(new Error("No response from extension worker."));
          return;
        }

        if (!response.ok) {
          reject(new Error(response.error ?? "Extension request failed."));
          return;
        }

        resolve(response.data);
      });
    });
  };

  const setState = (patch) => {
    Object.assign(state, patch);
    render();
  };

  const openPanel = async () => {
    setState({ open: true });

    if (!state.panelData) {
      await loadPanelData();
    }
  };

  const closePanel = () => {
    setState({ open: false });
  };

  const loadPanelData = async () => {
    setState({ loading: true, error: "", notice: "Loading strategies..." });

    try {
      const panelData = await sendMessage({ type: "EDGE_FETCH_PANEL_DATA" });
      setState({
        panelData,
        loading: false,
        notice: `Loaded ${panelData.strategies.length} strategies.`
      });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load data.",
        notice: ""
      });
    }
  };

  const simulateStrategy = async (strategy) => {
    setState({ pendingStrategyId: strategy.id, error: "", notice: "Simulating follow trade..." });

    try {
      const simulation = await sendMessage({
        type: "EDGE_SIMULATE_FOLLOW",
        payload: {
          strategyId: strategy.id,
          allocationUsd: strategy.allocationUsd
        }
      });

      setState({
        pendingStrategyId: null,
        notice: `Estimated settlement: $${simulation.estimatedSettlementUsd} ${simulation.settlementAsset}`
      });
    } catch (error) {
      setState({
        pendingStrategyId: null,
        error: error instanceof Error ? error.message : "Simulation failed.",
        notice: ""
      });
    }
  };

  const followStrategy = async (strategy) => {
    setState({ pendingStrategyId: strategy.id, error: "", notice: `Following ${strategy.name}...` });

    try {
      const response = await sendMessage({
        type: "EDGE_FOLLOW_STRATEGY",
        payload: {
          strategyId: strategy.id
        }
      });

      setState({
        pendingStrategyId: null,
        notice: `Now following ${response.strategy.name} as ${response.settings.userId}.`
      });

      await loadPanelData();
    } catch (error) {
      setState({
        pendingStrategyId: null,
        error: error instanceof Error ? error.message : "Could not follow strategy.",
        notice: ""
      });
    }
  };

  const renderStrategies = () => {
    strategyList.innerHTML = "";

    if (!state.panelData?.strategies?.length) {
      const empty = document.createElement("p");
      empty.className = "edge-empty";
      empty.textContent = "No strategies available from backend.";
      strategyList.appendChild(empty);
      return;
    }

    state.panelData.strategies.forEach((strategy) => {
      const card = document.createElement("article");
      card.className = "edge-card";

      const isPending = state.pendingStrategyId === strategy.id;

      card.innerHTML = `
        <h3>${strategy.name}</h3>
        <p>${strategy.description}</p>
        <p class="edge-market">${strategy.market.question}</p>
        <div class="edge-meta">
          <span>@${strategy.creatorHandle}</span>
          <span>${strategy.followerCount} followers</span>
          <span>$${strategy.allocationUsd} max exposure</span>
        </div>
        <div class="edge-actions">
          <button type="button" class="edge-simulate-btn" ${isPending ? "disabled" : ""}>Simulate</button>
          <button type="button" class="edge-follow-btn" ${isPending ? "disabled" : ""}>${
            isPending ? "Working..." : "Follow"
          }</button>
        </div>
      `;

      const simulateButton = card.querySelector(".edge-simulate-btn");
      const followButton = card.querySelector(".edge-follow-btn");

      simulateButton.addEventListener("click", () => {
        void simulateStrategy(strategy);
      });

      followButton.addEventListener("click", () => {
        void followStrategy(strategy);
      });

      strategyList.appendChild(card);
    });
  };

  const render = () => {
    panel.classList.toggle("edge-hidden", !state.open);

    if (state.panelData) {
      runtimeTag.textContent = `Runtime: ${state.panelData.runtime.networkMode}/${state.panelData.runtime.executionMode}`;
      accountLine.textContent = `User: ${state.panelData.settings.userId} | Stablecoin: ${state.panelData.settings.fundingStablecoin}`;
    } else {
      runtimeTag.textContent = "Runtime: --";
      accountLine.textContent = "User: -- | Stablecoin: --";
    }

    if (state.error) {
      statusLine.className = "edge-status-line edge-error";
      statusLine.textContent = state.error;
    } else {
      statusLine.className = "edge-status-line edge-ok";
      statusLine.textContent = state.notice || "Ready.";
    }

    renderStrategies();
  };

  launcher.addEventListener("click", () => {
    if (state.open) {
      closePanel();
      return;
    }

    void openPanel();
  });

  closeButton.addEventListener("click", closePanel);
  refreshButton.addEventListener("click", () => {
    void loadPanelData();
  });

  render();
})();
