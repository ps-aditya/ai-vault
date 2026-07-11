// background.js
// MV3 service worker. Two entry points feed the same save logic:
//  1) the hotkey (chrome.commands) — asks the content script for the
//     current selection
//  2) the floating "Save" pill in content.js — sends the selection
//     directly via a runtime message
// Either way: no dialog, no popup, no typing required.

const DEFAULT_FOLDER = "AI Vault";

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "save-selection") return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  let response;
  try {
    response = await chrome.tabs.sendMessage(tab.id, { type: "GET_SELECTION" });
  } catch (err) {
    // Most common cause: the content script isn't loaded on this tab
    // (wrong domain, or the page hasn't finished loading yet).
    notify("AI Vault", "This only works on claude.ai and chatgpt.com right now.");
    return;
  }

  const text = (response && response.text || "").trim();

  if (!text) {
    notify("AI Vault", "Nothing selected — highlight some text first.");
    return;
  }

  const meta = {
    hostname: response.hostname || "unknown",
    url: response.url || "",
    pageTitle: response.pageTitle || ""
  };

  saveSelection(text, meta);
});

// The floating "Save" pill (content.js) sends this directly, since it
// already has the selection text in hand at click time.
chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "SAVE_SELECTION") return;
  const text = (message.text || "").trim();
  if (!text) return;
  saveSelection(text, message.meta || {});
});

async function saveSelection(text, meta) {
  try {
    const now = new Date();
    const title = guessTitle(text);
    const folder = await getFolderName();
    const filename = buildFilename(now, title);
    const markdown = buildMarkdown(text, meta, now, title);

    // Using a data: URL here, not Blob + URL.createObjectURL — that API is
    // unreliable inside MV3 service workers across Chrome versions and was
    // the cause of saves silently failing in the previous build. data:
    // URLs have no such context dependency and are the safe choice here.
    const dataUrl = "data:text/markdown;charset=utf-8," + encodeURIComponent(markdown);

    chrome.downloads.download(
      {
        url: dataUrl,
        filename: `${folder}/${filename}`,
        saveAs: false,
        conflictAction: "uniquify"
      },
      (downloadId) => {
        if (chrome.runtime.lastError || !downloadId) {
          console.error("AI Vault save failed:", chrome.runtime.lastError);
          notify("AI Vault — save failed", chrome.runtime.lastError?.message || "Unknown error");
          return;
        }
        notify("Saved to AI Vault", title);
      }
    );
  } catch (err) {
    console.error("AI Vault save threw:", err);
    notify("AI Vault — save failed", err?.message || "Unknown error");
  }
}

// --- helpers -----------------------------------------------------------

function getFolderName() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["folderName"], (result) => {
      const name = (result.folderName || "").trim();
      resolve(sanitizeFolderName(name) || DEFAULT_FOLDER);
    });
  });
}

function sanitizeFolderName(name) {
  // Downloads API paths are relative to the Downloads folder and can't
  // contain path separators or traverse upward — strip anything unsafe.
  return name.replace(/[\\/:*?"<>|]/g, "").replace(/\.\./g, "").trim();
}

// Common AI-response openers that carry no meaning as a title. We strip
// at most one of these so the title captures the actual substance instead
// of boilerplate throat-clearing — still literal text from the selection,
// never generated or summarized.
const FILLER_PATTERN =
  /^(sure|okay|ok|certainly|absolutely|of course|alright|well|got it|no problem|great question|here'?s|here is|i'?d|i would|let'?s|let me)\b[,!.:\s-]+/i;

function guessTitle(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const stripped = normalized.replace(FILLER_PATTERN, "").trim();
  const source = stripped.length > 0 ? stripped : normalized;

  const words = source.split(" ").slice(0, 9).join(" ");
  return words.length > 0 ? words : "Untitled";
}

// A slightly longer literal excerpt for the frontmatter — extra recall
// context beyond the filename, still just copied text, nothing generated.
function guessPreview(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const words = normalized.split(" ").slice(0, 20).join(" ");
  return words;
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "untitled";
}

function pad(n) {
  return String(n).padStart(2, "0");
}

// Title leads, date trails — so the filename itself carries the meaning
// of the chat, not just when it happened. Chronological sort still works
// fine because it's driven by the file's actual creation timestamp on
// disk (date modified/created), not by the filename.
function buildFilename(date, title) {
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${slugify(title)}_${datePart}.md`;
}

function formatTime(date) {
  let hours = date.getHours();
  const minutes = pad(date.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${ampm}`;
}

function buildMarkdown(text, meta, date, title) {
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timePart = formatTime(date);
  const preview = guessPreview(text);

  const frontmatter = [
    "---",
    `source: ${meta.hostname || "unknown"}`,
    `date: ${datePart}, ${timePart}`,
    `title: "${title.replace(/"/g, '\\"')}"`,
    preview ? `preview: "${preview.replace(/"/g, '\\"')}"` : null,
    meta.pageTitle ? `conversation: "${meta.pageTitle.replace(/"/g, '\\"')}"` : null,
    meta.url ? `url: ${meta.url}` : null,
    "---",
    ""
  ]
    .filter(Boolean)
    .join("\n");

  return frontmatter + "\n" + text + "\n";
}

function notify(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title,
    message
  });
}
