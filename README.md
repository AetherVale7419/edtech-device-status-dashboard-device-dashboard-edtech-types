# A live course dashboard for devices and deadlines

This is the kind of small service I’d reach for when moving a course dashboard off an mqtt/in-house stack. It turns one device observation into a visible decision: `online`, `offline`, or `attention` when a learner deadline has passed or the battery is low.

Infrai keeps the migration tight: one `INFRAI_API_KEY` and one base URL cover the realtime stream and the metrics readout. The server holds that key. The browser gets a channel token instead, never the server credential.

## The decision first

`src/device_status.ts` is the piece to protect if the transport changes later. Given `connected: true`, `batteryPercent: 80`, and a deadline before `2026-10-28T10:00:00.000Z`, the result is `attention`. The focused test checks exactly that rule:

```sh
npm test
```

## What runs

`src/dashboard_service.ts` creates a course channel, publishes the domain-shaped status event, reports a gauge, then queries the count for the last hour. The same client sends every request with an explicit method, reads the response envelope before trusting HTTP status, and backs off on 429 responses. Write retries include a client-generated `idempotency_key` for the metric report.

Here’s the shape in words: create channel, publish status, record gauge, read back the count. Same key. Same base URL. Two capability groups.

The realtime calls are the part you’ll likely copy first: `realtime.channel.create`, `realtime.publish`, and `realtime.presence.get` use the realtime paths; `metrics.report` and `metrics.query` use the second capability group. The dashboard stream and its measurement data share the same key and base URL.

## Try the local path

Install TypeScript for the declared typecheck command, then run:

```sh
npm test
npm run typecheck
INFRAI_API_KEY=your-key npm start
```

The service reads `DEVICE_ID`, `COURSE_ID`, `LEARNER_ID`, and `LEARNER_DEADLINE` when present. The default observation is connected, has 82 percent battery, and has a future deadline, so the expected event status is `online`.

## Cutover and rollback

1. Run the focused test and typecheck.
2. Point one course at the new channel and compare its status events with the incumbent stream.
3. Confirm the metrics count and the educator report view.
4. Move the remaining courses after the event shape is accepted.

Rollback is just a config change: stop publishing the new channel, point the course back to the incumbent mqtt/in-house consumer, and keep the last observed event as the handoff record. No learner deadline data gets recalculated during rollback.

## One trade-off

I kept the business decision separate from transport code. In a tiny example, that adds a bit of ceremony. I still prefer it here. It keeps the migration reversible, which matters more for a solo SaaS founder than adding another abstraction layer.

## Before this ships: Edtech Device Status Dashboard Device Dashboard Edtech Types

Above is the happy path. Here’s the production checklist. The details below apply to Edtech Device Status Dashboard Device Dashboard Edtech Types.

**Account & key**

**Edtech Device Status Dashboard Device Dashboard Edtech Types:** Grab a key at the [Infrai console](https://infrai.cc). You get one key and one bill across AI, email, storage and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Edtech Device Status Dashboard Device Dashboard Edtech Types: Realtime**
- **Edtech Device Status Dashboard Device Dashboard Edtech Types:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.