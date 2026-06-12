// featherweight — cross-device state for static sites.
//
// Local-first: your state lives in the browser (instant, offline). A dumb
// key-value store at the edge syncs it between devices. No framework, no
// origin server, no round-trip in the hot path. ~1 KB, zero dependencies.
//
// Record shape on the wire: { data: <any JSON>, updatedAt: <ms> }
// Conflict policy: last-write-wins by updatedAt (single-writer assumption).
//
//   import { featherweight } from 'featherweight';
//   const store = featherweight('my-doc');           // id is the KV key
//   store.load(state => render(state));              // cache now, remote if newer
//   button.onclick = () => store.save({ count: n }); // local now, edge debounced
//
// See README for the edge endpoint (Cloudflare Pages Function / Worker).

export function featherweight(id, opts = {}) {
  const endpoint = (opts.endpoint || '/api/featherweight').replace(/\/+$/, '');
  const debounce = opts.debounce == null ? 800 : opts.debounce;
  const onStatus = opts.onStatus || function () {};
  const storage = opts.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  const LKEY = 'fw-' + id;
  const url = endpoint + '/' + encodeURIComponent(id);

  function readLocal() {
    try { return JSON.parse(storage && storage.getItem(LKEY)); } catch (e) { return null; }
  }
  function writeLocal(rec) {
    try { storage && storage.setItem(LKEY, JSON.stringify(rec)); } catch (e) {}
  }

  let timer = null;

  return {
    /**
     * Local-first load. Calls apply(data, meta) with the cached value
     * immediately (if any), then again with the remote value if it is newer.
     * meta = { source: 'local' | 'remote' }.
     */
    async load(apply) {
      const local = readLocal();
      let localTs = 0;
      if (local) { localTs = local.updatedAt || 0; if (apply) apply(local.data, { source: 'local' }); }
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('http ' + res.status);
        const remote = await res.json();
        if (remote && !remote.nobind && (remote.updatedAt || 0) > localTs) {
          writeLocal(remote);
          if (apply) apply(remote.data, { source: 'remote' });
        }
        onStatus('synced');
      } catch (e) {
        onStatus('offline');
      }
      return this;
    },

    /**
     * Save state. Writes the cache synchronously (survives reloads instantly)
     * and debounces a PUT to the edge. Safe to call on every keystroke/click.
     */
    save(data) {
      const rec = { data: data, updatedAt: Date.now() };
      writeLocal(rec);
      onStatus('saving');
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rec),
          });
          onStatus(res.ok ? 'synced' : 'local-only');
        } catch (e) {
          onStatus('local-only');
        }
      }, debounce);
      return this;
    },

    /** Flush a pending save immediately (e.g. on pagehide/visibilitychange). */
    flush() {
      if (!timer) return;
      clearTimeout(timer); timer = null;
      const rec = readLocal();
      if (!rec) return;
      try {
        fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rec),
          keepalive: true, // survives page unload for small payloads
        });
      } catch (e) {}
    },

    /** The current cached value, synchronously. */
    peek() { const l = readLocal(); return l ? l.data : null; },
  };
}

export default featherweight;
