# EdgeMarkets Frontend

Next.js frontend for EdgeMarkets, an open AI strategy marketplace on top of Polymarket execution rails.

## Stack
- Next.js App Router
- TypeScript (`strict`)
- Client-side API integration to EdgeMarkets backend

## Structure
```txt
src/
  app/
  components/
  lib/
extension/
  manifest.json
  popup.html
  popup.js
  background.js
  content.js
  overlay.css
```

## Core Flow
- Load live strategies and markets
- Create a strategy
- Follow a strategy with risk caps and funding stablecoin selection
- View user follows and total allocation
- Inspect live audit events from backend execution lifecycle
- Use idempotent mutation keys for write safety (web + extension)

## Execution Phases (Frontend + Extension)
### Phase 1: Core Web App (done)
- `Chunk 1.1`: Next.js dashboard and component system
- `Chunk 1.2`: Marketplace create/follow/user allocation flow
- `Chunk 1.3`: Stablecoin selector + live status UX

### Phase 2: Browser Extension (in progress)
- `Chunk 2.1`: Manifest V3 extension scaffold
- `Chunk 2.2`: In-page Polymarket overlay to discover/follow strategies
- `Chunk 2.3`: Background worker bridge to backend APIs
- `Chunk 2.4`: Idempotent follow mutations with mutation-status feedback

### Phase 3: Production UX
- `Chunk 3.1`: Wallet/auth handoff between web app and extension
- `Chunk 3.2`: Strategy performance and creator profile pages
- `Chunk 3.3`: Real execution telemetry + retry state

## Run
```bash
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

## Environment
Copy `.env.example` to `.env` and set:
- `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:4000`)

## Extension (Testnet Start)
1. Run backend on `http://localhost:4000` in testnet/simulated mode.
2. Open `chrome://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked` and select the `extension/` folder.
5. Open `https://polymarket.com` and click the `EdgeMarkets` floating launcher.
6. In the extension popup, confirm:
- Backend URL: `http://localhost:4000`
- Funding stablecoin: `USDC` or `USDT` or `DAI`
