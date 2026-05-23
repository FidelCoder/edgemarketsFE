# Farcaster Mini App and Telegram Rollout Plan

This is the working breakdown for moving EdgeMarkets toward a polished Farcaster Mini App first, then Telegram. It keeps the current repo flow small and reviewable, avoids fake trading states, and makes the broken leveraged probability trade flow a first-class fix instead of hiding it behind UI work.

## Current Repo Notes

- Repository: `FidelCoder/edgemarketsFE`
- Current working base: `dev`
- GitHub user for this planning commit: `FidelCoder`
- Current app stack: Next.js App Router
- Farcaster Mini App support found in repo: none yet
- Main trading path found in repo:
  - `src/components/edge-dashboard.tsx`
  - `src/components/dashboard-trading-grid.tsx`
  - `src/lib/api.ts`
  - `src/lib/polymarket.ts`
- Current UI issue: dashboard styling is heavy, cramped, and too visually close to a one-note dark blue/slate palette.
- Current functional issue: leveraged probability trade flow needs a traced bug fix before any public Mini App launch.

## Operating Rules

- Product code should go through PRs.
- Do not push feature work directly to `main`.
- Direct `main` pushes are only acceptable for low-risk docs or metadata after the repo owner explicitly confirms that override for that exact change.
- Keep each PR focused on one outcome.
- No fake markets, fake balances, fake executions, fake PnL, or fake order success states.
- If execution fails or is unavailable, show the real failure or a clear pending/unavailable state.
- Farcaster and Telegram must call the same backend contracts; no duplicated trading/business logic in either surface.

## Current Farcaster Requirements To Follow

Use the current Farcaster Mini App flow, not legacy Frame-only assumptions:

- Mini Apps are regular HTML/CSS/JavaScript web apps that run inside Farcaster clients and can use the Mini App SDK for auth, wallet, notifications, and client actions.
- Existing projects should install `@farcaster/miniapp-sdk`.
- The app must call `sdk.actions.ready()` after the UI is ready, otherwise Farcaster users can stay stuck on the loading screen.
- A production Mini App needs a domain-level `/.well-known/farcaster.json` manifest.
- Shareable pages should include an `fc:miniapp` meta tag. Keeping `fc:frame` as backward compatibility is acceptable.
- Manifest and embeds serve different jobs: the manifest identifies the app/domain, while page embeds make individual URLs shareable in feeds.
- For local Farcaster testing, expose the local Next.js server through a public tunnel so Farcaster can scrape the embed metadata.

Reference docs:

- https://miniapps.farcaster.xyz/docs/getting-started
- https://miniapps.farcaster.xyz/docs/guides/manifest-vs-embed
- https://miniapps.farcaster.xyz/docs/guides/sharing
- https://miniapps.farcaster.xyz/docs/guides/publishing

## Phase 0: Repo Discipline and Baseline

Goal: stop mixing design, Mini App support, and execution fixes in one change.

Deliverables:

- Keep `dev` as the integration base unless the repo owner says otherwise.
- Confirm exact API/backend used by the frontend.
- Confirm required env vars for the frontend, Farcaster, wallet, and order APIs.
- Add a short local-run checklist if missing or stale.
- Capture the current leveraged trade failure with:
  - browser route
  - selected market
  - intended leverage/probability action
  - frontend console error
  - network response
  - backend response if any

PR size:

- Docs/checklist only.
- No UI redesign.
- No execution changes.

Suggested branch:

```bash
git switch -c docs/farcaster-miniapp-telegram-phases
```

## Phase 1: Farcaster Mini App Foundation

Goal: make the app load correctly as a Farcaster Mini App before redesigning or adding new trading behavior.

Deliverables:

- Install `@farcaster/miniapp-sdk`.
- Add a small client component that calls `sdk.actions.ready()` once the shell is mounted and usable.
- Add Mini App detection/context handling in an isolated Farcaster utility.
- Add `NEXT_PUBLIC_APP_URL` or equivalent public URL env handling.
- Add a manifest path strategy:
  - static `public/.well-known/farcaster.json` for early testing, or
  - redirect to Farcaster hosted manifest once a hosted manifest ID exists.
- Add root `fc:miniapp` metadata for the home page.
- Add backward-compatible `fc:frame` metadata where practical.
- Keep the first Mini App shell minimal: real app load, no fake content.

Acceptance criteria:

- App runs with `npm run dev`.
- Root page calls `sdk.actions.ready()` only on the client.
- No fake markets or fake trade records are introduced.
- Farcaster docs are linked in README.

Suggested PR:

- Title: `Add Farcaster Mini App foundation`
- Branch: `feature/farcaster-miniapp-foundation`

## Phase 2: Mobile-First UI Redesign For Farcaster

Goal: replace the current weak dashboard impression with a focused Mini App trading surface.

Design direction:

- Start from the Farcaster mobile viewport, then expand to desktop.
- Use a compact market-first layout instead of a dense dashboard wall.
- Reduce over-rounded panels and stacked card noise.
- Move away from the dominant dark blue/slate look.
- Use a restrained finance palette with clear YES/NO side colors, neutral surfaces, and visible risk states.
- Make actions obvious:
  - select market
  - choose YES/NO
  - review probability/price
  - submit intent/order
  - view status

Deliverables:

- Redesign the home route around:
  - market list
  - selected market details
  - probability/trade panel
  - order or intent status panel
- Add clean loading, empty, and error states.
- Keep real data only; if data is unavailable, show an empty or unavailable state.
- Make important buttons icon-assisted and readable on small screens.
- Do not hide failed order state behind success copy.

Acceptance criteria:

- No overlapping content at mobile widths.
- No huge marketing hero before the actual app.
- No fake fallback records.
- `npm run typecheck` passes.
- A Playwright screenshot is taken after the redesign if browser tooling is available.

Suggested PR:

- Title: `Redesign Farcaster trading surface`
- Branch: `feature/farcaster-mobile-ui-refresh`

## Phase 3: Leveraged Probability Trade Fix

Goal: repair the broken leveraged probability trade flow with real validation and truthful status.

Investigation checklist:

- Reproduce the failure locally.
- Identify whether failure is in:
  - form state
  - market selection
  - amount/probability/leverage math
  - order payload creation
  - auth/session token
  - backend `/api/orders`
  - Polymarket CLOB order creation
  - order lifecycle sync
- Check `edgeApi.upsertOrder` payload against the backend contract.
- Check `executeLiveStrategyOrder` and `executeTradeIntent` behavior in `src/lib/polymarket.ts`.
- Confirm token IDs, tick size, price bounds, size, and amount are valid before submission.

Implementation rules:

- Do not mark the trade executed unless a real execution response confirms it.
- If the app only submits an intent, label it as an intent.
- If an order is submitted but not filled, label it as submitted/open/pending according to real order data.
- If CLOB or backend calls fail, surface the error in the UI.
- Add validation for invalid amount, invalid probability, unsupported market, missing wallet/session, and unavailable order book.

Acceptance criteria:

- A valid trade path reaches the real backend/CLOB flow.
- Invalid inputs are blocked before network submission.
- Failed provider/API calls show a clear error.
- No fake order records are created.
- Unit tests cover the order payload builder or validation logic if the logic can be isolated.

Suggested PR:

- Title: `Fix leveraged probability trade submission`
- Branch: `fix/leveraged-probability-trade`

## Phase 4: Shareable Farcaster Market And Signal Cards

Goal: make real market and signal pages shareable inside Farcaster.

Deliverables:

- Add page-level `fc:miniapp` metadata for:
  - market detail pages
  - signal pages when available
  - position/order detail pages when available
- Add dynamic Open Graph or Mini App images only from real records.
- If a market/signal cannot be fetched, return a clean unavailable card, not fake data.
- Add copy/share action for supported pages.
- Keep card copy truthful:
  - "Signal"
  - "Intent submitted"
  - "Pending execution"
  - "Executed" only when backend confirms it

Acceptance criteria:

- Farcaster preview tool can scrape at least the root page and one real detail page.
- Embed metadata uses production-safe PNG/JPG/WebP image output.
- No fake PnL or fake trader stats.

Suggested PR:

- Title: `Add shareable Farcaster cards`
- Branch: `feature/farcaster-share-cards`

## Phase 5: API Contract Alignment

Goal: make frontend trading and display states match backend truth.

Deliverables:

- Document the frontend API contracts used by:
  - markets
  - trade intents
  - orders
  - order lifecycle
  - signals if present
  - user/session profile
- Normalize frontend status labels to backend states.
- Add typed response guards where the current API shape is uncertain.
- Remove any demo-specific user or creator fallback from production flows.

Acceptance criteria:

- Frontend does not invent states missing from the backend.
- Empty states are explicit.
- All network failures have user-visible outcomes.

Suggested PR:

- Title: `Align frontend API contracts with real trading states`
- Branch: `chore/frontend-api-contracts`

## Phase 6: Telegram After Farcaster

Goal: bring Telegram onto the same real backend flow after the Farcaster surface is stable.

Deliverables:

- Telegram commands should call the backend API only.
- No Telegram database.
- No duplicate trading logic.
- Commands to prioritize:
  - `/start`
  - `/profile`
  - `/markets`
  - `/market <id>`
  - `/signal <marketId> <YES|NO> <thesis>`
  - `/signals <marketId>`
  - `/copy <positionId> <amount>`
  - `/positions`
- Empty market state should say markets have not been synced yet.
- Copy/trade language should say "intent" unless execution is confirmed.

Acceptance criteria:

- Telegram and Farcaster point to the same backend.
- A signal created from Telegram appears in the web/Farcaster app.
- A copy intent created from Telegram appears as pending unless execution exists.

Suggested PR:

- Title: `Add Telegram real API command flow`
- Branch: `feature/telegram-real-api-flow`

## Phase 7: Demo Readiness

Goal: make the MVP presentable using real created records only.

Demo script:

1. Run the backend API.
2. Sync real markets from the provider.
3. Start the frontend.
4. Open the Farcaster Mini App surface.
5. View real synced markets.
6. Create or view a real signal/intent if the backend supports it.
7. Show truthful execution status.
8. Start Telegram.
9. Use Telegram to view the same market data.
10. Submit a signal or copy intent from Telegram.
11. Confirm the web surface reflects the same backend record.

Acceptance criteria:

- Screenshots are generated only from actual local app state.
- No seeded fake trading activity is used.
- README has exact local commands.
- Known limitations are written plainly.

Suggested PRs:

- `chore/farcaster-demo-readiness`
- `chore/telegram-demo-readiness`

## Minimal Push Plan For FidelCoder

Immediate minimal PR:

- This document only.
- Purpose: align the team before touching UI/trading code.
- Base: `dev`
- No direct `main` push.

Next FidelCoder code PR:

- Farcaster Mini App foundation only.
- Install SDK, add ready call, add manifest/embed structure, update README.
- No UI redesign and no trade fix in the same PR.

Next code PR after that:

- UI redesign pass for the Farcaster trading surface.

Next code PR after that:

- Leveraged probability trade fix with real validation and truthful order state.

## Main Branch Policy

Default policy:

- `main` remains protected by review workflow.
- Product code never goes straight to `main`.
- Feature branches merge through PR.

Allowed only with explicit owner confirmation:

- Tiny docs typo fix.
- Non-runtime metadata update.
- README wording that does not change install, build, or runtime behavior.

Not allowed as direct `main` pushes:

- Mini App SDK integration.
- UI redesign.
- Trading fixes.
- API contract changes.
- Dependency upgrades.
- Environment changes.
