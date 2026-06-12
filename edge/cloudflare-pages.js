// featherweight edge endpoint — Cloudflare Pages Function.
//
// Install: copy to  functions/api/featherweight/[id].js  in your Pages project.
// Bind a KV namespace named FEATHERWEIGHT (Pages → Settings → Bindings,
// or wrangler.toml). That's the whole backend.
//
// It is a *dumb byte-store*: it has no idea what your data means. It hands
// back the JSON blob for an id, or stores one. Last-write-wins by updatedAt.

const KEY = id => 'fw:' + String(id).replace(/[^a-z0-9_-]/gi, '').slice(0, 128);
const MAX = 100_000; // bytes; raise if you store more

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function onRequestGet({ params, env }) {
  if (!env.FEATHERWEIGHT) return json({ data: null, updatedAt: 0, nobind: true });
  const v = await env.FEATHERWEIGHT.get(KEY(params.id));
  return new Response(v || '{"data":null,"updatedAt":0}', {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestPut({ params, request, env }) {
  if (!env.FEATHERWEIGHT) return json({ error: 'no KV bound' }, 503);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  const rec = JSON.stringify({
    data: body && body.data !== undefined ? body.data : null,
    updatedAt: Date.now(),
  });
  if (rec.length > MAX) return json({ error: 'too large' }, 413);
  await env.FEATHERWEIGHT.put(KEY(params.id), rec);
  return new Response(rec, { headers: { 'Content-Type': 'application/json' } });
}
