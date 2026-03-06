const inputApiBaseUrl = document.querySelector("#apiBaseUrl");
const inputUserId = document.querySelector("#userId");
const selectFundingStablecoin = document.querySelector("#fundingStablecoin");
const handoffCodeInput = document.querySelector("#handoffCode");
const consumeHandoffButton = document.querySelector("#consumeHandoff");
const sessionMetaElement = document.querySelector("#sessionMeta");
const saveButton = document.querySelector("#saveSettings");
const checkRuntimeButton = document.querySelector("#checkRuntime");
const statusElement = document.querySelector("#status");

const setStatus = (message) => {
  statusElement.textContent = message;
};

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

const fillForm = (settings) => {
  inputApiBaseUrl.value = settings.apiBaseUrl;
  inputUserId.value = settings.userId;
  selectFundingStablecoin.value = settings.fundingStablecoin;
  sessionMetaElement.textContent = settings.sessionToken
    ? `Bound wallet: ${settings.walletAddress || "--"} | User: ${settings.userId}`
    : "No bound session.";
};

const loadSettings = async () => {
  setStatus("Loading settings...");

  try {
    const settings = await sendMessage({ type: "EDGE_GET_SETTINGS" });
    fillForm(settings);
    setStatus("Ready.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Failed to load settings.");
  }
};

const saveSettings = async () => {
  setStatus("Saving settings...");

  try {
    const settings = await sendMessage({
      type: "EDGE_SAVE_SETTINGS",
      payload: {
        apiBaseUrl: inputApiBaseUrl.value.trim(),
        userId: inputUserId.value.trim(),
        fundingStablecoin: selectFundingStablecoin.value
      }
    });

    fillForm(settings);
    setStatus("Settings saved.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Failed to save settings.");
  }
};

const checkRuntime = async () => {
  setStatus("Checking backend runtime...");

  try {
    const data = await sendMessage({ type: "EDGE_FETCH_PANEL_DATA" });
    setStatus(
      `Runtime: ${data.runtime.networkMode}/${data.runtime.executionMode} on ${data.runtime.polygonNetwork}`
    );
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Could not connect to backend.");
  }
};

const consumeHandoff = async () => {
  setStatus("Binding extension session...");

  try {
    const response = await sendMessage({
      type: "EDGE_AUTH_CONSUME_HANDOFF",
      payload: {
        handoffCode: handoffCodeInput.value.trim().toUpperCase()
      }
    });

    fillForm(response.settings);
    handoffCodeInput.value = "";
    setStatus(`Extension bound to ${response.session.userId}.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Could not bind handoff code.");
  }
};

saveButton.addEventListener("click", saveSettings);
checkRuntimeButton.addEventListener("click", checkRuntime);
consumeHandoffButton.addEventListener("click", consumeHandoff);

void loadSettings();
