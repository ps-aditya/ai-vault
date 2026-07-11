// options.js
const DEFAULT_FOLDER = "AI Vault";

const input = document.getElementById("folderName");
const saveBtn = document.getElementById("save");
const status = document.getElementById("status");

chrome.storage.local.get(["folderName"], (result) => {
  input.value = result.folderName || DEFAULT_FOLDER;
});

saveBtn.addEventListener("click", () => {
  const raw = input.value.trim();
  const clean = sanitize(raw) || DEFAULT_FOLDER;
  input.value = clean;

  chrome.storage.local.set({ folderName: clean }, () => {
    status.textContent = "Saved.";
    setTimeout(() => (status.textContent = ""), 1800);
  });
});

function sanitize(name) {
  return name.replace(/[\\/:*?"<>|]/g, "").replace(/\.\./g, "").trim();
}
