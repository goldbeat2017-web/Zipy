// Aizipy website on Cloudflare Workers.
// Serves the website files, plus one small API: /api/pick-clips (AI clip picker).
// Set ANTHROPIC_API_KEY in Cloudflare: Workers & Pages → zipy → Settings → Variables and Secrets (type: Secret).
import { onRequestPost } from '../functions/api/pick-clips.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/pick-clips') {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: { 'content-type': 'application/json' } });
      }
      return onRequestPost({ request, env });
    }
    return env.ASSETS.fetch(request);
  },
};
