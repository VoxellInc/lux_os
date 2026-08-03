# Lux OS — open edge for real-time state sync

**Lightweight state sync without standing up a database.** Browser holds state (instant, offline). Edge holds a dumb byte pipe. Broker optional when you need production fencing and CAS.

This is the **open-source edge / OS shape** of [Lux](https://voxell.ai/lux/). The client lives on npm as [`@voxell/lux`](https://www.npmjs.com/package/@voxell/lux) and on GitHub as [`lux_sdk`](https://github.com/VoxellInc/lux_sdk).

```js
import { lux } from '@voxell/lux';

const doc = lux('settings', { realtime: true });
doc.load(s => render(s));
input.oninput = () => doc.save({ text: input.value });
```

## Positioning (one sentence)

If you only need **current application state** across tabs and devices, Redis pub/sub and Kafka are the wrong layers. Lux is the right one — and the open path starts here.

## What you get

- Local-first reads (no network on the UI hot path)
- Last-write-wins reconciliation
- Optional WebSocket push
- Cloudflare Pages + KV in minutes
- Path up to a buyer-deployed high-performance broker (AWS Marketplace commercial)

## Speed (product boundary)

Measured on the Lux broker path (not this edge KV alone):

- **~12 ns** in-memory read  
- **~27 µs** broker write ack p50 (local)  
- **~390 µs** p50 on private AWS networking  

Full argument: [Redis Is Not a State Sync Layer](https://voxell.ai/blog/redis-is-not-a-state-sync-layer/).

## Quick start

1. `npm i @voxell/lux` (or copy the client from `lux_sdk`)
2. Drop the edge function from `edge/` into Cloudflare Pages and bind KV
3. Open two browser windows. Save in one. Watch the other.

When procurement and production licensing matter, deploy the commercial broker via **AWS Marketplace · Lux Sync** — same mental model, signed offline license, state stays in the buyer account.

## Repo status

Package naming may still show historical `featherweight` symbols on older paths. Product name is **Lux**. Prefer `@voxell/lux` for new work.

## Links

- https://voxell.ai/lux/
- https://github.com/VoxellInc/lux_sdk
- https://www.npmjs.com/package/@voxell/lux

## License

MIT
