# featherweight

**Cross-device state for static sites.** Your data lives in the browser
(instant, offline); a dumb key-value store at the edge syncs it between
devices. No framework, no origin server, no round-trip in the hot path.
~1 KB, zero dependencies.

```js
import { featherweight } from 'featherweight';

const store = featherweight('my-doc');            // id = the storage key
store.load(state => render(state));               // cache instantly, then remote if newer
saveBtn.onclick = () => store.save({ count: 7 }); // local now, edge debounced
```

That's the whole idea: **local-first reads, last-write-wins sync, through a
backend that has no idea what your data means.**

---

## Why

A static site has no server to remember anything. The usual answers are both
too big for a lot of cases:

- **Rewrite it as an SPA** — ship a framework runtime to every visitor to
  persist a counter. A cargo plane for a sandwich.
- **Stand up a backend** — a server, a schema, a deploy, to store a blob.

featherweight is the small middle: keep the state on the client, and use the
edge as a *byte pipe* — a key-value namespace that stores and returns one JSON
blob per id. On Cloudflare that's a Pages Function + KV binding you can stand
up in two minutes, and it deploys with your static site.

## Install

Copy `src/featherweight.js` into your project (or `npm i @voxell/featherweight`),
and drop one edge endpoint in place.

### 1. Client

```html
<script type="module">
  import { featherweight } from '/featherweight.js';

  const notes = featherweight('notes', {
    onStatus: s => statusEl.textContent = s,   // 'saving' | 'synced' | 'offline' | 'local-only'
  });

  // Local-first: applies the cached value immediately, then the remote
  // value if it's newer (reconciled by updatedAt).
  notes.load(data => { textarea.value = (data && data.text) || ''; });

  textarea.addEventListener('input', () => notes.save({ text: textarea.value }));
  addEventListener('pagehide', () => notes.flush());   // flush a pending save on exit
</script>
```

### 2. Edge (Cloudflare Pages)

Copy `edge/cloudflare-pages.js` to `functions/api/featherweight/[id].js`, then
bind a KV namespace named **`FEATHERWEIGHT`** (Pages → Settings → Bindings, or
`wrangler.toml`). Done. (A standalone Worker variant is in `edge/cloudflare-worker.js`.)

```
wrangler kv namespace create FEATHERWEIGHT
# then bind it as FEATHERWEIGHT for Production (+ Preview) and redeploy
```

Until the KV is bound, the endpoint reports `nobind: true` and the client just
runs **local-only** — nothing breaks, it simply doesn't sync yet.

## API

| call | does |
|---|---|
| `featherweight(id, opts?)` | create a store. `opts`: `endpoint` (default `/api/featherweight`), `debounce` (ms, default 800), `onStatus(s)`, `storage` (default `localStorage`). |
| `store.load(apply)` | local-first load. `apply(data, {source})` fires with the cached value, then the remote value if newer. |
| `store.save(data)` | write the cache now (survives reload instantly) + debounced `PUT` to the edge. Safe to call every keystroke. |
| `store.flush()` | send a pending save immediately (use on `pagehide`). |
| `store.peek()` | the current cached value, synchronously. |

`data` is any JSON-serializable value. The wire/record shape is
`{ data, updatedAt }`.

## When to use it

Use featherweight when **all** of these are roughly true:

- **Single writer.** One person editing their own thing across their own
  devices (a tool, a dashboard, a tracker, a game sheet, notes).
- **Small, read-mostly state.** Kilobytes, not a database.
- **Offline and instant matter.** You want it to work on a plane and never
  spin a loader for local reads.
- **No SSR requirement.** First paint doesn't need to be server-rendered for
  SEO.

It shines for personal apps on a CDN where a real backend would be silly.

## When **not** to use it (honest)

- **Multiple concurrent writers.** It's last-write-wins; two devices editing
  at once will clobber. If you need real merge, you want CRDTs
  (Automerge, Yjs) or a sync engine (ElectricSQL, Replicache/Zero) — that's a
  different, heavier tool, and a fine one.
- **Anything sensitive or trust-bound.** The endpoint has **no auth** by
  default — possession of the id is access. Fine for a personal sheet; add a
  capability token (in the id/URL) or real auth before storing anything you'd
  mind a stranger reading or overwriting.
- **Large or heavily-queried data.** It stores/returns one blob; it's not a
  database. KV is eventually consistent (cross-region propagation can take up
  to ~60s) and has write-rate limits.
- **You already have a backend.** Then just use it.

## How it works

1. **Read:** `load()` paints from `localStorage` synchronously, then `GET`s the
   blob from the edge and re-applies only if `updatedAt` is newer. The network
   is never in the way of showing your data.
2. **Write:** `save()` updates the cache immediately and debounces a `PUT`.
   Offline? It stays cached and reports `local-only`; it'll sync next time.
3. **Reconcile:** last-write-wins by `updatedAt`. Simple on purpose.
4. **Backend:** a tiny function that puts/gets a JSON string in KV by id. It is
   deliberately dumb — which is what makes it cheap, cacheable, and replaceable.

## The bigger picture

featherweight is the persistence piece of a broader idea — static delivery +
local-first client + a dumb edge store — written up here:
**[The Featherweight Pattern](https://sentimark.ai/blog/the-featherweight-pattern/)**
(where it fits among SPA and HTML-over-the-wire, plus the JSON-vs-binary
numbers on whether the payload should ever be binary).

## License

MIT © Voxell, Inc.
