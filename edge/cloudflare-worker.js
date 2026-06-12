// featherweight edge endpoint — standalone Cloudflare Worker.
//
// Use this instead of the Pages Function if you deploy a plain Worker.
// Routes:  GET  /<id>   ->  { data, updatedAt }
//          PUT  /<id>   <-  { data }   (stores, stamps updatedAt)
// Bind a KV namespace named FEATHERWEIGHT in wrangler.toml.
// Set CORS_ORIGIN if the Worker is on a different origin than your site.

const KEY = id => 'fw:' + String(id).replace(/[^a-z0-9_-]/gi, '').slice(0, 128);
const MAX = 100_000;

export default {
  async fetch(request, env) {
    const id = decodeURIComponent(new URL(request.url).pathname.replace(/^\/+/, '').split('/')[0]);
    const cors = {
      'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors },
      });

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (!id) return json({ error: 'missing id' }, 400);
    if (!env.FEATHERWEIGHT) return json({ data: null, updatedAt: 0, nobind: true });

    if (request.method === 'GET') {
      const v = await env.FEATHERWEIGHT.get(KEY(id));
      return new Response(v || '{"data":null,"updatedAt":0}', {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors },
      });
    }
    if (request.method === 'PUT') {
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
      const rec = JSON.stringify({ data: body && body.data !== undefined ? body.data : null, updatedAt: Date.now() });
      if (rec.length > MAX) return json({ error: 'too large' }, 413);
      await env.FEATHERWEIGHT.put(KEY(id), rec);
      return new Response(rec, { headers: { 'Content-Type': 'application/json', ...cors } });
    }
    return json({ error: 'method not allowed' }, 405);
  },
};
