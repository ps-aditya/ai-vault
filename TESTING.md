# AI Vault — v0.5.0 (test build: claude.ai + chatgpt.com)

## Two fixes this round

1. **Saving was completely broken** — last round I switched the download
   mechanism to `Blob` + `URL.createObjectURL()`, thinking it was more
   robust. It isn't, inside an MV3 service worker specifically — that API
   is known to be unreliable there across Chrome versions, and it broke
   saving entirely on both sites. Reverted back to the `data:` URL method
   from two rounds ago, which was actually working fine — the dialog issue
   you hit back then was a separate Chrome settings problem, not caused by
   the `data:` URL itself. Sorry for the regression.

2. **Pill was showing on every tiny selection** — added a minimum
   threshold: at least ~6 words and 25 characters before the pill appears.
   A stray word or short phrase no longer triggers it; it should now only
   show up for something roughly sentence-sized or longer.

## 1. Reload in Chrome

```bash
unzip ai-vault.zip -d ai-vault
```

`chrome://extensions` → AI Vault → click the **reload icon**.

## 2. Confirm saving actually works again — do this first

1. Select a full sentence or two on claude.ai
2. Click the Save pill
3. You should get a "Saved to AI Vault" notification with **no dialog**
4. Confirm:

```bash
ls -t ~/Downloads/AI\ Vault/ | head -3
cat "$(ls -t ~/Downloads/AI\ Vault/*.md | head -1)"
```

5. Repeat on chatgpt.com

If it still doesn't save, open the service worker console
(`chrome://extensions` → AI Vault → "service worker" / "Inspect views")
and paste me whatever red error text shows up — that's the fastest path
to a real fix if there's still something else going on.

## 3. Confirm the pill threshold feels right

- Select a single word → **no pill**
- Select a short phrase like "thanks that helps" → **no pill** (under 6
  words)
- Select a full sentence or a short paragraph → **pill appears**
- Select a long paragraph → pill appears, same as before

## What I want feedback on

1. Does saving work reliably now on both sites, repeatedly, not just once?
2. Does the pill threshold feel right, or should the bar be higher/lower?
   (Currently: 6+ words AND 25+ characters, both required.)
3. Anything else feel off after this round?
