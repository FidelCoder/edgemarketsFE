# EdgeMarkets Frontend

Next.js frontend for live EdgeMarkets trading on Polymarket.

## What is implemented
- Wallet challenge-sign auth against backend sessions.
- Live Polymarket execution from the connected browser wallet.
- Order lifecycle desk with persisted backend sync.
- Creator performance pages and strategy history pages.
- Web-to-extension handoff flow.
- Audit feed, follow flow, strategy publishing, and trigger queue UX.
- Dockerfile and GitHub Actions CI.

## Routes
- `/`
- `/creators/[creatorHandle]`
- `/strategies/[strategyId]`

## Local run
```bash
npm install
npm run dev
```

## Environment
Create `.env` if needed:
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`

## Tests
```bash
npm run test
npm run typecheck
npm run build
```

Browser e2e smoke:
```bash
npm run test:e2e
```

## Extension
1. Run backend on `http://localhost:4000`.
2. Run frontend on `http://localhost:3000`.
3. Load `extension/` as an unpacked extension in Chromium.
4. Generate a handoff code from the web app and consume it in the extension popup.
