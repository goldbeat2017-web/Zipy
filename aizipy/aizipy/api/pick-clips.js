// Vercel serverless function: asks Claude to pick the best moments from a transcript.
// Only transcript text reaches this server — never the video.
// Set ANTHROPIC_API_KEY in your Vercel project settings (Settings → Environment Variables).

const MAX_CHARS = 120000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: 'AI picker not configured' });

  const { segments, count = 3, min = 20, max = 60 } = req.body || {};
  if (!Array.isArray(segments) || !segments.length) return res.status(400).json({ error: 'No transcript' });

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
    if (!r.ok) return res.status(502).json({ error: 'AI request failed', detail: await r.text() });
    const data = await r.json();
    const text = (data.content || []).map((b) => b.text || '').join('');
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.status(502).json({ error: 'Could not read AI answer' });
    const clips = JSON.parse(match[0])
      .filter((c) => isFinite(c.start) && isFinite(c.end) && c.end > c.start)
      .slice(0, n);
    return res.status(200).json({ clips });
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
}
