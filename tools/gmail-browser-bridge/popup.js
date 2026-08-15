const statusElement = document.querySelector("#status");
const detailElement = document.querySelector("#detail");
const importedElement = document.querySelector("#imported");
const updatedElement = document.querySelector("#updated");
const failedElement = document.querySelector("#failed");
const indicatorElement = document.querySelector("#indicator");
const syncButton = document.querySelector("#sync");
const rescanButton = document.querySelector("#rescan");

function render(status) {
  statusElement.textContent = status.configured ? (status.running ? "予約メールを確認中" : "自動連携中") : "初期設定が必要です";
  detailElement.textContent = status.message || "同期待機中";
  importedElement.textContent = `${status.imported || 0}件`;
  updatedElement.textContent = `${status.updated || 0}件`;
  failedElement.textContent = `${status.failed || 0}件`;
  indicatorElement.style.background = status.configured ? (status.failed ? "#c36b61" : "#8aa58a") : "#d09a3e";
  syncButton.disabled = !status.configured || status.running;
  rescanButton.disabled = !status.configured || status.running;
}

async function refresh() {
  render(await chrome.runtime.sendMessage({ type: "LIEN_GET_STATUS" }));
}

syncButton.addEventListener("click", async () => {
  syncButton.disabled = true;
  render(await chrome.runtime.sendMessage({ type: "LIEN_APP_START_SYNC" }));
});

rescanButton.addEventListener("click", async () => {
  if (!confirm("直近60日分をもう一度確認します。予約は重複登録されません。")) return;
  rescanButton.disabled = true;
  render(await chrome.runtime.sendMessage({ type: "LIEN_APP_RESET_AND_SYNC" }));
});

void refresh();
