# AI Vault

Highlight text on Claude or ChatGPT, hit **Save**. It becomes a Markdown
file on your computer. That's the whole thing.

No dialogs, no naming it yourself, no digging through your Downloads
folder later wondering where it went.

## Why

If you use AI chat a lot, you've probably had a genuinely good answer —
career advice, a workout plan, a piece of code, something that actually
mattered — and either lost it when the chat scrolled away, or manually
copy-pasted it into a text file in your Downloads folder and never looked
at it again.

This is just that last step, minus the friction.

## Install

1. Download this repo (or clone it)
2. Open `chrome://extensions`
3. Turn on **Developer mode** (top right)
4. Click **Load unpacked**, select this folder
5. Done - you'll see "AI Vault" in your extensions list

## Use

- Select any decent-sized chunk of text on **claude.ai** or **chatgpt.com**
- A small **Save** button appears near it — click it
- Or just press **Ctrl+Shift+S** (**Cmd+Shift+S** on Mac) instead, no click
  needed
- The file lands in `Downloads/AI Vault/`, named after the text you
  selected, with a bit of frontmatter (source, date, time) at the top

The Save button only shows up for selections of a decent length — a
stray word or two won't trigger it.

## Settings

Right-click the extension icon → **Options** to rename the subfolder it
saves into (still inside Downloads — Chrome extensions can't write
directly to arbitrary folders like Documents or Desktop).

## A note on the save dialog

If clicking Save opens a "Save As" file picker instead of saving silently,
check `chrome://settings/downloads` → **"Ask where to save each file
before downloading."** If that's on, Chrome intentionally overrides
extensions' silent-save requests — turn it off and it'll go back to
one-click saving.

## What this deliberately doesn't do

- No AI-generated titles or summaries — filenames and previews are your
  own literal selected text, not something a model wrote for you
- No cloud sync, no accounts, no analytics — it writes a file and that's it
- No folder sorting by source site — everything lands in one place on
  purpose, since a good chat is a good chat regardless of which app it
  came from

## Supported sites

- claude.ai
- chatgpt.com

## License

MIT — see [LICENSE](LICENSE).
