# Portfolio images

Three 1000×750 captures per portfolio item, all re-shot from the running app — not redrawn, not mocked.

## How these three were made

| File | What it shows | Source |
|---|---|---|
| `wcp-01-cover.png` | Dashboard: hero, five operations, sample-data badge | `/` |
| `wcp-02-verdict.png` | Five steps, Rejected at 42%, reasoning, three citations, trace/cost | `/analyze`, after running the bundled WH-347 fixture |
| `wcp-03-review.png` | Audit drawer: violations, warnings, citations, override controls | `/review` → Inspect Audit |

**Run (2026-11-07):**

```bash
pnpm install --frozen-lockfile     # 2m 10s, lockfile unchanged
pnpm demo:ui                       # Vite on localhost:5173, mock mode
```

Captured headless with the repo's Playwright (`chromium`, deviceScaleFactor 2), cropped to the
regions above, laid out at 1000×750 and downscaled with Lanczos. The crops are recorded in the
build script rather than eyeballed, so a re-run reproduces them.

**Fixes made while capturing:** the UI was formatting dates in the machine locale (Portuguese) and
read "Inspect flagged flags". Both are fixed in `apps/web` — a demo shown to an English-speaking
reviewer should not carry either.

**What the images do not claim:** the offline demo runs a mock model and sample payroll. The verdict
shown comes from the deterministic rule checks, and every card says so in its own footer.

**Social preview:** `docs/media/social-preview.png` is the 1280×640 GitHub card (a composite of the cover card with the repository name and thesis). Upload it in Settings → Social preview; a repo edit cannot set it.
