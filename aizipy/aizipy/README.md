# Aizipy — AI Video Shortener (website)

Turns a long video into vertical 9:16 shorts with animated captions.
All video work happens in the visitor's browser; only the transcript text goes to your server so Claude can pick the best moments.

## Files
- `index.html` — the page and its design
- `app.js` — upload, clip picking, caption animations, preview and export
- `worker.js` — speech-to-text (Whisper) running in the browser, on the GPU when available
- `functions/api/pick-clips.js` — the AI clip-picker for **Cloudflare Pages**
- `api/pick-clips.js` + `vercel.json` — the same clip-picker for **Vercel** (only used if you host there)

## Put it online with Cloudflare Pages (recommended, free, unlimited bandwidth)
Cloudflare's drag-and-drop upload skips the `functions` folder, so use GitHub:
1. Create a free account at github.com → **New repository** (e.g. `aizipy`, Private is fine)
   → **uploading an existing file** → drag in everything *inside* the `aizipy`
   folder (including the `functions` and `api` folders) → **Commit changes**.
2. In dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git**,
   pick the repo. Build settings: Framework preset **None**, build command **empty**,
   build output directory **/** . Click **Save and Deploy**.
3. Project → **Settings → Variables and Secrets** → add `ANTHROPIC_API_KEY`
   (type **Secret**) with your key from console.anthropic.com → then
   **Deployments → Retry deployment** so it takes effect.
4. Project → **Custom domains** → add `aizipy.com` (and `www.aizipy.com`).
   Easiest if your domain's DNS is on Cloudflare: **Add a site** → `aizipy.com`
   → change the nameservers at the company where you bought the domain.
From then on, any file you change on GitHub goes live automatically.

## Or: Vercel
1. Create a free account at vercel.com and install nothing else.
2. Click **Add New → Project**, then drag this whole `aizipy` folder in
   (or push it to GitHub and import the repo).
3. In the project: **Settings → Environment Variables**, add
   `ANTHROPIC_API_KEY` = your key from console.anthropic.com. Redeploy.
4. **Settings → Domains** → add `aizipy.com` and follow the DNS steps shown
   (add the records at the company where you bought the domain).

Without the API key the site still works — it falls back to a simple
"most talking" picker instead of AI picks.

## Getting found on Google
The page already has: SEO title and description, keywords, canonical URL,
social share previews (og-image.png), structured data (web app, how-to, FAQ),
how-it-works / features / FAQ content, `robots.txt` and `sitemap.xml`.
After the site is live:
1. Go to search.google.com/search-console → add `aizipy.com` → verify (DNS record).
2. Sitemaps → submit `https://aizipy.com/sitemap.xml`.
3. URL inspection → `https://aizipy.com/` → "Request indexing".
4. Do the same at bing.com/webmasters (it can import from Google in one click).
What moves rankings most from here: more useful pages (guides like
"how to turn a podcast into shorts") and links from other sites.

## Ads (Google AdSense)
The site has 4 ad slots: a top banner, a big box on the "processing" screen
(people stare at it while their video transcribes), a sidebar box under the
preview (desktop only) and a box below the tools.
Ads are OFF until you fill in your IDs. Open `index.html?ads=preview` to see where they sit.

1. Put the site live on aizipy.com first, then apply at adsense.google.com.
2. Fill in `privacy.html` (date + contact email) — AdSense requires a privacy policy.
3. Once approved: AdSense → Ads → By ad unit → create 4 **Display ads**
   (responsive). Copy each unit's `data-ad-slot` number.
4. In `index.html`, find `window.AIZIPY_ADS` near the bottom and paste your
   publisher ID (`ca-pub-…`) and the 4 slot numbers.
5. In `ads.txt`, replace `pub-0000000000000000` with your ID (without `ca-`).
6. In AdSense → **Privacy & messaging**, turn on the GDPR consent message
   (required for visitors in the EU/UK). Redeploy.

## Try it on your PC first
In this folder run `python -m http.server 8000` and open http://localhost:8000
(the AI picker needs Vercel, so locally you'll get the simple picker).

## Notes
- Best in Chrome or Edge. Safari and Firefox may not export.
- First use downloads the speech model (~80 MB), then it's cached.
- Export plays each clip in real time: a 45-second short takes ~45 seconds. Keep the tab visible.
- Each AI pick costs a fraction of a cent in API usage.
