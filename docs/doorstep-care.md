# Doorstep: Ring package watch

Category: caretaking. This is an activity log, not an emergency or wellness detection service. Motion cannot identify a person; a quiet log is not proof of safety or absence. It stores no Ring media or activity in a database. The optional offline sample is synthetic and is **not** a Ring simulator.

## Local setup

1. Use Node.js 20+ and run `npm ci` from the repository root.
2. Sign into the [Ring Developer Playground](https://developer.amazon.com/ring/console/playground), generate a short-lived access token, and use its Ring simulator or a consented Ring device. The Playground requires an Amazon Developer sign-in.
3. Copy `.env.example` to `.env.local`. Set `RING_ACCESS_TOKEN` to the Playground token. Generate an installation UUID with `node -p "require('node:crypto').randomUUID()"` and set `RING_HARDWARE_ID` to it. Do not commit or show either value. Do not set `RING_REFRESH_TOKEN` alongside `RING_ACCESS_TOKEN`.
4. Run `npm run dev` and visit `http://localhost:3000/` (which opens `/care`). Open `/camera`, start the Playground device's live stream, then stop it. Back on `/care`, select **Ring activity** and refresh. The app requests motion, doorbell, and on-demand live-view history for the discovered device. The Playground live view generates an `on_demand` history event, which is a simulator demonstration, **not** proof of a package. The offline sample must never be presented as simulator evidence.
5. If you receive 401, regenerate the short-lived token and restart. For 406, check the UUID and Ring's server-IP restrictions. History is limited to activity after user consent; this page displays the first page only. Do not infer that an empty history means no visitors.

The route is `app/api/care/activity/route.ts`. It calls `https://api.amazonvision.com/v1/devices` then `/v1/history/devices/{device_id}/events?event_types=motion,ding,on_demand` from the server. The selected ID must be in the discovered device list. It sends Bearer authorization, `User-Agent`, `Hardware_Id`, and content-type headers. The browser receives no token, images, or video. The refresh button sends a new request; there is no background monitoring or emergency alerting. Don't expose this demo unauthenticated on the public internet with your Ring credentials: the local route currently has no user login.

Run `npm test` and `npm run build` for local checks. Neither test substitutes for a real Ring simulator run.

## Package Watch: what counts as a delivery

Ring's Event History API does not identify a package in its returned event attributes. The package card therefore uses a separate Ring webhook: `POST /api/packages/webhook`, with a verified `X-Signature: sha256=<hex HMAC>` over the **raw request body**. Only `data.type=motion_detected` and `data.attributes.sub_type=package_delivery` become delivery alerts. Generic motion, people, vehicles, and live views do not. The HMAC key is `RING_WEBHOOK_HMAC_KEY`. The app deduplicates retries by request/event ID, keeps up to 100 alerts in process memory, and shows alerts only for the selected discovered Ring device. Restarting the server clears alerts. The page is a manual-refresh view, not a push notification service; it cannot determine pickup or theft.

### Local signed-fixture demonstration (not the official Ring simulator)

1. Generate a local-only key with `node -p "require('node:crypto').randomBytes(32).toString('hex')"` and put it in `.env.local` as `RING_WEBHOOK_HMAC_KEY=...`. Restart `npm run dev` if it doesn't reload the environment file.
2. Keep a valid Playground access token and `RING_HARDWARE_ID` in `.env.local`. Run `node scripts/simulate-package.mjs` in another terminal from the repository root.
3. Refresh `/care`. The package card reads **SIMULATED, NOT A REAL DELIVERY**. The script sends only to localhost, signs a fixture with the local key and never prints the secrets. This tests HMAC verification, filtering, storage, and the UI, but is not proof that Ring sent a package alert.

### Real Ring package alerts (not configured in this local test)

Register a Ring partner app, use its issued HMAC signing key as `RING_WEBHOOK_HMAC_KEY`, arrange HTTPS delivery to `/api/packages/webhook`, complete account linking, and enable Smart Alerts on the device. Ring may then send `motion_detected` webhooks with `attributes.sub_type=package_delivery`. Do not deploy this sample as-is: `/care` has no user authentication and alerts live only in memory. The Playground access token alone cannot configure a production webhook. For a public deployment, add user authentication, per-account authorization, durable storage, and replay protection first.

## Demo video shot list (English, target 2 minutes)

- 0:00–0:20: Introduce Doorstep Care, its caretaking use case, and the safety disclaimer.
- 0:20–0:45: Show the Ring Developer Playground's simulator and token-generation screen. Never show the actual token.
- 0:45–1:20: Show the simulator's live view at `/camera`, then open `/care` in Ring activity mode and refresh to show the on-demand event. Explain this records the camera view, not a package at the door.
- 1:20–1:45: Show the actual server-side API calls in the source and the activity timeline. If needed, show the offline sample separately, with the label visible.
- 1:45–2:00: State limitations and product feedback. Record the screen and English narration, upload publicly to YouTube or Vimeo, then put the URL in the submission. No video has been recorded or published by this repository.

## Product feedback (observed locally unless marked untested)

| API/tool | What works well | Friction or request | Validation status |
| --- | --- | --- | --- |
| Ring Device Discovery (`GET /v1/devices`) | One call returned the Playground device for the supplied token; good for a device picker. | Examples should consistently include mandatory `User-Agent` and `Hardware_Id` headers to avoid 406 confusion. | Live Playground response: HTTP 200, one device. |
| Ring Event History (`GET /v1/history/devices/{id}/events`) | Metadata-only filter is privacy-conscious; after a simulator live view, `on_demand` was available. | Document which simulator events appear in history; an empty response can reflect consent or simulator limitations. A bounded time-window query would help caretaking summaries. | Live Playground response: HTTP 200, one on-demand event; motion/ding not tested. |
| Ring Developer Playground and simulator | Token and simulated WHEP video enabled a hardware-free run. | Provide a deterministic motion/ding history trigger and a shareable test-mode guide. | Simulator video played locally; event appeared in Ring history. |
| Ring signed webhook / motion classification | `package_delivery` is a precise signal that avoids falsely labeling ordinary motion as a package. | The Playground token does not supply a signing key or a clearly documented package-webhook trigger; a package-video scene is not the same as a delivered webhook. | Raw-body HMAC and subtype processing tested with a local signed fixture; no genuine Ring package webhook received. |
| Server-side `fetch` / Next.js route | Keeps Bearer credentials out of browser requests and makes errors explicit. | This local sample still needs a login, deployment hardening and durable audit design for production. | Local HTTP 200, tests and build passed. |
| Ring WHEP live stream at `/camera` | Simulated video and audio tracks were live in the browser in the earlier dashboard. | Short session duration and teardown complicate demos. | Previously played Ring Playground video locally; the simplified camera page has not been retested with a fresh token. |

Sources: [Ring Partner API reference](https://developer.amazon.com/docs/ring/api-documentation.html), including Device Discovery, Event History and required headers; [Ring release notes](https://developer.amazon.com/docs/ring/release-notes.html) for the Playground and event simulator.
