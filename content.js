// content.js
// Runs on claude.ai and chatgpt.com. Two jobs:
//  1) Respond to the hotkey path: report the current selection when asked.
//  2) Show a small floating "Save" pill near any text selection, only when
//     the selection is long enough to be worth saving.
//
// The pill is centered on the selection's own bounding box, measured
// synchronously the instant mouseup fires (no delay, no debounce) — so it
// stays anchored to the text itself rather than to wherever the mouse
// happened to be released, and isn't racing the site's own re-renders.
// If that measurement ever fails, it falls back to the cursor position.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "GET_SELECTION") return;

  const selection = window.getSelection ? window.getSelection().toString() : "";

  sendResponse({
    text: selection,
    pageTitle: document.title || "",
    url: window.location.href,
    hostname: window.location.hostname
  });

  return true;
});

// --- floating Save pill --------------------------------------------------

let pillEl = null;
let pillCreatedAt = 0;
const SCROLL_GRACE_MS = 350;

function removePill() {
  if (pillEl) {
    pillEl.remove();
    pillEl = null;
  }
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function createPillAt(clientX, clientY) {
  removePill();

  pillEl = document.createElement("div");
  pillEl.textContent = "Save";
  pillEl.setAttribute("data-ai-vault-pill", "true");

  Object.assign(pillEl.style, {
    position: "fixed",
    zIndex: "2147483647",
    background: "#1e1e20",
    color: "#f2f2f2",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: "13px",
    fontWeight: "500",
    padding: "6px 14px",
    borderRadius: "999px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
    cursor: "pointer",
    userSelect: "none",
    lineHeight: "1.4",
    letterSpacing: "0.01em",
    transform: "translateX(-50%)",
    transition: "opacity 120ms ease"
  });

  document.body.appendChild(pillEl);

  // Measure the pill's real width so it can be centered on the cursor
  // and clamped inside the viewport without spilling off-screen.
  const pillRect = pillEl.getBoundingClientRect();
  const halfWidth = pillRect.width / 2;
  const x = clamp(clientX, halfWidth + 8, window.innerWidth - halfWidth - 8);
  const y = clamp(clientY + 14, 8, window.innerHeight - 40);

  pillEl.style.left = `${x}px`;
  pillEl.style.top = `${y}px`;

  pillCreatedAt = Date.now();

  pillEl.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : "";
    if (!text) return;

    chrome.runtime.sendMessage({
      type: "SAVE_SELECTION",
      text,
      meta: {
        hostname: window.location.hostname,
        url: window.location.href,
        pageTitle: document.title || ""
      }
    });

    pillEl.textContent = "Saved";
    pillEl.style.background = "#2e6b3e";
    setTimeout(removePill, 700);
  });
}

// Only worth offering a save for something roughly sentence-sized or
// bigger — a stray word or short phrase shouldn't trigger the pill.
const MIN_WORDS = 50;
const MIN_CHARS = 250;

function isWorthSaving(text) {
  if (text.length < MIN_CHARS) return false;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return wordCount >= MIN_WORDS;
}

function handleMouseUp(e) {
  if (e.target === pillEl) return; // the pill's own click handler deals with this

  const selection = window.getSelection();
  const text = selection ? selection.toString().trim() : "";

  if (!isWorthSaving(text)) {
    removePill();
    return;
  }

  // Center on the selection's actual bounding box, measured synchronously
  // right now (no setTimeout) — the selection is already finalized by the
  // time mouseup fires, so there's nothing to wait on. This keeps the
  // pill anchored to the text itself rather than wherever the mouse
  // happened to be released, which shifted around depending on drag
  // direction and felt like it was "chasing" the cursor.
  try {
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      createPillAt(rect.left + rect.width / 2, rect.bottom);
      return;
    }
  } catch (err) {
    // Fall through to cursor position below.
  }

  createPillAt(e.clientX, e.clientY);
}

// Fallback for keyboard-driven selection (Shift+Arrow / Shift+Home/End),
// since those don't fire a mouseup with useful coordinates.
function handleKeyUp(e) {
  const extendKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
  if (!e.shiftKey || !extendKeys.includes(e.key)) return;

  const selection = window.getSelection();
  const text = selection ? selection.toString().trim() : "";
  if (!isWorthSaving(text)) {
    removePill();
    return;
  }

  try {
    const rects = selection.getRangeAt(0).getClientRects();
    const last = rects[rects.length - 1];
    if (!last) return;
    createPillAt(last.left + last.width / 2, last.bottom);
  } catch (err) {
    // No valid range — ignore.
  }
}

document.addEventListener("mouseup", handleMouseUp);
document.addEventListener("keyup", handleKeyUp);

document.addEventListener(
  "scroll",
  () => {
    // Ignore scroll noise right after the pill appears — chat UIs often
    // fire small corrective/internal scroll events immediately after a
    // selection is made, which previously wiped the pill before it was
    // even seen.
    if (Date.now() - pillCreatedAt < SCROLL_GRACE_MS) return;
    removePill();
  },
  true
);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") removePill();
});

// Capture phase, not bubble — some site UI (their own selection popups)
// may call stopPropagation() on click events for their own purposes,
// which would otherwise stop this listener from ever running and leave
// the pill orphaned on screen after clicking elsewhere.
document.addEventListener(
  "mousedown",
  (e) => {
    if (pillEl && e.target !== pillEl) removePill();
  },
  true
);

// Belt-and-suspenders: selectionchange fires whenever the browser's
// selection state changes, regardless of what any click handler on the
// page does with event propagation — so this catches the pill-orphaned
// bug even in cases the capture-phase listener above might still miss.
document.addEventListener("selectionchange", () => {
  if (!pillEl) return;
  const selection = window.getSelection();
  const text = selection ? selection.toString().trim() : "";
  if (!text) removePill();
});
