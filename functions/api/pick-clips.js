// Cloudflare Pages Function: POST /api/pick-clips
// Asks Claude to pick the best moments from a transcript. Only transcript text reaches this server.
// Set ANTHROPIC_API_KEY in Cloudflare: your Pages project → Settings → Variables and Secrets (type: Secret).

const MAX_CHARS = 120000;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: 'AI picker not configured' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const { segments, count = 3, min = 20, max = 60 } = body || {};
  if (!Array.isArray(segments) || !segments.length) return json({ error: 'No transcript' }, 400);

  const n = Math.max(1, Math.min(10, Number(count) || 3));
  let transcript = segments
    .map((s) => `[${Number(s.start).toFixed(1)}-${Number(s.end).toFixed(1)}] ${String(s.text).slice(0, 500)}`)
    .join('\n');
  if (transcript.length > MAX_CHARS) transcript = transcript.slice(0, MAX_CHARS);

  const prompt = `You are an expert short-form video editor (TikTok, YouTube Shorts, Reels).
Below is a timestamped transcript of a long video. Choose the ${n} best moments to turn into standalone shorts.

Rules:
- Each clip must be between ${min} and ${max} seconds long.
- Each clip must make sense on its own: a strong hook in the first seconds, one complete idea, a satisfying ending.
- Start and end exactly on segment boundaries from the transcript.
- Clips must not overlap.
- Give each clip a short catchy title (max 6 words) in the same language as the video.

Reply with ONLY a JSON array, no other text:
[{"start": 12.3, "end": 48.0, "title": "Short catchy title", "reason": "why it works, max 12 words"}]

Transcript:
${transcript}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!r.ok) return json({ error: 'AI request failed' }, 502);
    const data = await r.json();
    const text = (data.content || []).map((b) => b.text || '').join('');
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return json({ error: 'Could not read AI answer' }, 502);
    const clips = JSON.parse(match[0])
      .filter((c) => isFinite(c.start) && isFinite(c.end) && c.end > c.start)
      .slice(0, n);
    return json({ clips });
  } catch (err) {
    return json({ error: String(err.message || err) }, 500);
  }
}

export function onRequest() {
  return json({ error: 'POST only' }, 405);
}
