// Aizipy — AI video shortener that runs in the browser.
const $ = (id) => document.getElementById(id);
const W = 1080, H = 1920;

const canvas = $('canvas');
const ctx = canvas.getContext('2d');
const video = $('video');

// ---------------------------------------------------------------------------
// Fonts, presets, style
// ---------------------------------------------------------------------------
const FONTS = {
  'Montserrat':       { weight: 900 },
  'Anton':            { weight: 400 },
  'Bebas Neue':       { weight: 400 },
  'Bangers':          { weight: 400 },
  'Archivo Black':    { weight: 400 },
  'Poppins':          { weight: 800 },
  'Permanent Marker': { weight: 400 },
};

const PRESETS = [
  { name: 'Viral',    anim: 'highlight', font: 'Montserrat',       text: '#ffffff', accent: '#c6ff3d', size: 92,  wpl: 3, upper: true },
  { name: 'Pop',      anim: 'pop',       font: 'Anton',            text: '#ffffff', accent: '#ffd43b', size: 104, wpl: 2, upper: true },
  { name: 'Karaoke',  anim: 'karaoke',   font: 'Archivo Black',    text: '#ffffff', accent: '#38d9ff', size: 84,  wpl: 4, upper: false },
  { name: 'Boxed',    anim: 'box',       font: 'Poppins',          text: '#ffffff', accent: '#7c4dff', size: 82,  wpl: 3, upper: false },
  { name: 'Comic',    anim: 'bounce',    font: 'Bangers',          text: '#ffffff', accent: '#ff5d8f', size: 110, wpl: 3, upper: true },
  { name: 'Marker',   anim: 'pop',       font: 'Permanent Marker', text: '#ffffff', accent: '#ff922b', size: 88,  wpl: 3, upper: false },
  { name: 'One word', anim: 'pop',       font: 'Bebas Neue',       text: '#ffffff', accent: '#c6ff3d', size: 140, wpl: 1, upper: true },
  { name: 'Clean',    anim: 'classic',   font: 'Poppins',          text: '#ffffff', accent: '#ffffff', size: 74,  wpl: 5, upper: false },
];

const style = { ...PRESETS[0], cropX: 0.5, posY: 0.72, show: true };

// ---------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------
let file = null;
let words = [];          // [{text, start, end}]
let clips = [];          // [{start, end, title, reason}]
let current = 0;
let playing = false;
let exporting = false;
let pagesCache = null;

// ---------------------------------------------------------------------------
// Ads (Google AdSense). Settings live in index.html → window.AIZIPY_ADS
// An ad is only filled when its slot becomes visible, because AdSense
// can't size ads inside hidden containers.
// ---------------------------------------------------------------------------
const ADS = window.AIZIPY_ADS || {};
const adsOn = /^ca-pub-\d{10,}$/.test(ADS.client || '');
const adPreview = new URLSearchParams(location.search).get('ads') === 'preview';
let adScriptLoaded = false;

function showAd(id) {
  const box = $(id);
  if (!box || box.dataset.filled) return;
  if (box.offsetParent === null && getComputedStyle(box.parentElement).display === 'none') return;
  if (id === 'adSidebar' && window.innerWidth <= 820) return;
  const slot = (ADS.slots || {})[box.dataset.slot];

  if (adsOn && slot) {
    if (!adScriptLoaded) {
      const s = document.createElement('script');
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS.client}`;
      document.head.appendChild(s);
      adScriptLoaded = true;
    }
    const ins = box.querySelector('ins');
    ins.className = 'adsbygoogle';
    ins.removeAttribute('data-preview');
    ins.dataset.adClient = ADS.client;
    ins.dataset.adSlot = slot;
    ins.dataset.adFormat = 'auto';
    ins.dataset.fullWidthResponsive = 'true';
    box.classList.add('on');
    box.dataset.filled = '1';
    requestAnimationFrame(() => {
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
      catch (e) { console.warn('Ad failed', e); }
    });
  } else if (adPreview) {
    box.classList.add('on', 'preview');
    box.dataset.filled = '1';
  }
}
showAd('adTop');

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------
const drop = $('drop');
drop.onclick = () => $('fileInput').click();
$('fileInput').onchange = (e) => e.target.files[0] && start(e.target.files[0]);
drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
drop.ondragleave = () => drop.classList.remove('over');
drop.ondrop = (e) => {
  e.preventDefault(); drop.classList.remove('over');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('video')) start(f);
};
$('newVideoBtn').onclick = () => location.reload();

// ---------------------------------------------------------------------------
// Paste a link
// ---------------------------------------------------------------------------
function setTab(which) {
  const isLink = which === 'link';
  $('tabFile').classList.toggle('on', !isLink);
  $('tabLink').classList.toggle('on', isLink);
  $('tabFile').setAttribute('aria-selected', String(!isLink));
  $('tabLink').setAttribute('aria-selected', String(isLink));
  drop.style.display = isLink ? 'none' : 'block';
  $('linkBox').style.display = isLink ? 'block' : 'none';
  if (isLink) $('linkInput').focus();
}
$('tabFile').onclick = () => setTab('file');
$('tabLink').onclick = () => setTab('link');

function linkMsg(text, isError) {
  $('linkMsg').textContent = text;
  $('linkMsg').className = isError ? 'error' : '';
}

function normalizeLink(url) {
  // Dropbox share links → direct download links
  if (/dropbox\.com/.test(url.hostname)) {
    url.hostname = 'dl.dropboxusercontent.com';
    url.searchParams.delete('dl');
  }
  return url.toString();
}

$('linkForm').onsubmit = async (e) => {
  e.preventDefault();
  let url;
  try { url = new URL($('linkInput').value.trim()); } catch { return linkMsg('That doesn\'t look like a valid link.', true); }

  if (/(^|\.)(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com|fb\.watch|twitch\.tv|vimeo\.com|x\.com|twitter\.com)$/i.test(url.hostname)) {
    return linkMsg('Links to YouTube, TikTok, Instagram and similar sites can\'t be used. For your own videos, download the file (e.g. from YouTube Studio) and upload it.', true);
  }

  const btn = e.submitter || $('linkForm').querySelector('button');
  btn.disabled = true;
  try {
    linkMsg('Connecting…');
    const res = await fetch(normalizeLink(url));
    if (!res.ok) throw new Error('status ' + res.status);
    const type = res.headers.get('content-type') || '';
    if (type && !type.startsWith('video/') && !type.includes('octet-stream')) {
      throw new Error('not-video');
    }
    const total = Number(res.headers.get('content-length')) || 0;
    const reader = res.body.getReader();
    const parts = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      got += value.length;
      linkMsg(total ? `Downloading… ${Math.round((got / total) * 100)}%` : `Downloading… ${(got / 1e6).toFixed(0)} MB`);
    }
    const name = decodeURIComponent(url.pathname.split('/').pop() || 'video.mp4');
    const f = new File(parts, name, { type: type.startsWith('video/') ? type : 'video/mp4' });
    linkMsg('');
    start(f);
  } catch (err) {
    console.warn(err);
    linkMsg(err.message === 'not-video'
      ? 'That link opens a web page, not a video file. Use a link that ends in .mp4, .webm or .mov.'
      : 'This website doesn\'t allow its videos to be loaded from other sites. Download the video and upload the file instead.', true);
  } finally {
    btn.disabled = false;
  }
};

function setStatus(text, progress, isError) {
  $('status').style.display = 'block';
  $('statusText').textContent = text;
  $('statusText').className = isError ? 'error' : '';
  if (progress != null) $('bar').style.width = Math.round(progress * 100) + '%';
  showAd('adProcessing');
}

async function start(f) {
  file = f;
  $('hero').style.display = 'none';
  document.body.classList.add('working');
  video.src = URL.createObjectURL(f);
  await new Promise((res, rej) => { video.onloadedmetadata = res; video.onerror = () => rej(new Error('This video format is not supported by your browser.')); });

  try {
    setStatus('Extracting audio…', 0.02);
    const audio = await decodeAudio(f);
    words = await transcribe(audio);
    if (!words.length) throw new Error('No speech found in this video. Aizipy needs spoken content to find moments.');

    setStatus('AI is picking your best moments…', 1);
    clips = await pickClips(words, video.duration);
    showWorkspace();
  } catch (err) {
    console.error(err);
    setStatus(err.message || String(err), null, true);
  }
}

async function decodeAudio(f) {
  const buf = await f.arrayBuffer();
  const ac = new AudioContext({ sampleRate: 16000 });
  let decoded;
  try { decoded = await ac.decodeAudioData(buf); }
  catch { throw new Error('Could not read the audio of this video. Try an MP4 file.'); }
  finally { ac.close(); }
  const ch0 = decoded.getChannelData(0);
  if (decoded.numberOfChannels === 1) return ch0;
  const ch1 = decoded.getChannelData(1);
  const mono = new Float32Array(ch0.length);
  for (let i = 0; i < ch0.length; i++) mono[i] = (ch0[i] + ch1[i]) / 2;
  return mono;
}

function transcribe(audio) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('worker.js', { type: 'module' });
    setStatus('Loading the speech AI (first time only, ~80 MB)…', 0.03);
    worker.onmessage = ({ data }) => {
      if (data.type === 'download') setStatus('Loading the speech AI (first time only, ~80 MB)…', data.progress * 0.3);
      if (data.type === 'ready') setStatus(`Transcribing on your ${data.device === 'webgpu' ? 'GPU' : 'CPU'}…`, 0.3);
      if (data.type === 'progress') setStatus(`Transcribing… ${Math.round(data.progress * 100)}%`, 0.3 + data.progress * 0.65);
      if (data.type === 'done') { worker.terminate(); resolve(cleanWords(data.words)); }
      if (data.type === 'error') { worker.terminate(); reject(new Error('Transcription failed: ' + data.message)); }
    };
    worker.onerror = (e) => reject(new Error('Transcription failed: ' + (e.message || 'worker error')));
    worker.postMessage({ audio }, [audio.buffer]);
  });
}

function cleanWords(list) {
  return list
    .filter((w) => w.text && isFinite(w.start) && isFinite(w.end))
    .sort((a, b) => a.start - b.start);
}

// ---------------------------------------------------------------------------
// Picking clips
// ---------------------------------------------------------------------------
function toSegments(ws) {
  const segs = [];
  let cur = null;
  ws.forEach((w, i) => {
    if (!cur) cur = { start: w.start, end: w.end, text: '' };
    cur.text += (cur.text ? ' ' : '') + w.text;
    cur.end = w.end;
    const next = ws[i + 1];
    const sentenceEnd = /[.!?]$/.test(w.text);
    const pause = next && next.start - w.end > 0.8;
    if (!next || sentenceEnd || pause || cur.end - cur.start > 12) { segs.push(cur); cur = null; }
  });
  return segs;
}

async function pickClips(ws, duration) {
  const segs = toSegments(ws.filter((w) => w.end <= duration + 0.5));
  const min = 20, max = 60, count = duration > 600 ? 5 : 3;
  let picked = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    const res = await fetch('/api/pick-clips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segments: segs.map((s) => ({ start: +s.start.toFixed(1), end: +s.end.toFixed(1), text: s.text })), count, min, max }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) picked = (await res.json()).clips;
  } catch (e) { console.warn('AI picker unavailable, using built-in picker', e); }

  picked = (picked || []).filter((c) => isFinite(c.start) && isFinite(c.end) && c.end > c.start);
  if (!picked.length) picked = pickSimple(segs, count, min, max, duration);

  const fix = (list) => list
    .map((c, i) => ({
      start: Math.max(0, +c.start),
      end: Math.min(duration, +c.end),
      title: c.title || `Clip ${i + 1}`,
      reason: c.reason || '',
    }))
    .filter((c) => c.end - c.start >= 1);
  let result = fix(picked);
  if (!result.length) result = fix(pickSimple(segs, count, min, max, duration));
  return result.sort((a, b) => a.start - b.start);
}

function pickSimple(segs, count, min, max, duration) {
  const cands = [];
  for (let i = 0; i < segs.length; i++) {
    let n = 0;
    for (let j = i; j < segs.length; j++) {
      n += segs[j].text.split(' ').length;
      const len = segs[j].end - segs[i].start;
      if (len > max) break;
      if (len >= min) cands.push({ score: n / len, start: segs[i].start, end: segs[j].end });
    }
  }
  cands.sort((a, b) => b.score - a.score);
  const chosen = [];
  for (const c of cands) {
    if (chosen.every((o) => c.end <= o.start || c.start >= o.end)) chosen.push(c);
    if (chosen.length === count) break;
  }
  if (!chosen.length) chosen.push({ start: 0, end: Math.min(duration, max) });
  chosen.sort((a, b) => a.start - b.start);
  return chosen.map((c, i) => ({ ...c, title: `Clip ${i + 1}`, reason: 'Lots of talking in this part' }));
}

// ---------------------------------------------------------------------------
// Workspace UI
// ---------------------------------------------------------------------------
function fmt(t) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function showWorkspace() {
  $('status').style.display = 'none';
  $('work').style.display = 'grid';
  showAd('adSidebar');
  showAd('adBottom');
  buildStyleControls();
  renderClipList();
  selectClip(0);
}

function renderClipList() {
  const list = $('clipList');
  list.innerHTML = '';
  clips.forEach((c, i) => {
    const el = document.createElement('div');
    el.className = 'clip' + (i === current ? ' active' : '');
    el.innerHTML = `
      <div class="num">${i + 1}</div>
      <div class="info">
        <div class="title"></div>
        <div class="meta">
          <input type="number" step="0.1" min="0" data-k="start" value="${c.start.toFixed(1)}"> →
          <input type="number" step="0.1" min="0" data-k="end" value="${c.end.toFixed(1)}">
          · ${Math.round(c.end - c.start)}s
        </div>
        <div class="meta reason"></div>
      </div>`;
    el.querySelector('.title').textContent = c.title;
    el.querySelector('.reason').textContent = c.reason;
    el.onclick = (e) => { if (e.target.tagName !== 'INPUT') selectClip(i); };
    el.querySelectorAll('input').forEach((inp) => {
      inp.onchange = () => {
        const v = parseFloat(inp.value);
        if (!isFinite(v)) return;
        c[inp.dataset.k] = Math.max(0, Math.min(video.duration, v));
        if (c.end <= c.start + 1) c.end = Math.min(video.duration, c.start + 1);
        current = i; pagesCache = null;
        renderClipList(); renderWords(); seekPreview(c.start);
      };
    });
    list.appendChild(el);
  });
}

function selectClip(i) {
  stopPreview();
  current = i;
  pagesCache = null;
  renderClipList();
  renderWords();
  seekPreview(clips[i].start + 0.05);
}

function clipWords(c = clips[current]) {
  return words.filter((w) => w.start >= c.start - 0.05 && w.end <= c.end + 0.05);
}

function renderWords() {
  const box = $('words');
  box.innerHTML = '';
  clipWords().forEach((w) => {
    const s = document.createElement('span');
    s.textContent = w.text;
    s.title = fmt(w.start);
    s.onclick = () => {
      const v = prompt('Edit word (leave empty to remove):', w.text);
      if (v === null) return;
      if (v.trim()) w.text = v.trim();
      else words.splice(words.indexOf(w), 1);
      pagesCache = null; renderWords(); drawFrame();
    };
    w._el = s;
    box.appendChild(s);
    box.appendChild(document.createTextNode(' '));
  });
}

function buildStyleControls() {
  const pre = $('presets');
  pre.innerHTML = '';
  PRESETS.forEach((p) => {
    const b = document.createElement('button');
    b.className = 'preset';
    b.style.fontFamily = `"${p.font}"`;
    b.style.fontWeight = FONTS[p.font].weight;
    b.style.color = p.accent;
    b.innerHTML = `${p.upper ? p.name.toUpperCase() : p.name}<small>${animLabel(p.anim)}</small>`;
    b.onclick = () => { Object.assign(style, p); syncControls(); };
    pre.appendChild(b);
  });

  const fs = $('fontSel');
  fs.innerHTML = Object.keys(FONTS).map((f) => `<option>${f}</option>`).join('');

  const bind = (id, key, conv = (v) => v, ev = 'input') => {
    $(id).addEventListener(ev, (e) => {
      const el = e.target;
      style[key] = conv(el.type === 'checkbox' ? el.checked : el.value);
      if (key === 'wpl' || key === 'upper') pagesCache = null;
      markPreset(); drawFrame();
    });
  };
  bind('animSel', 'anim', String, 'change');
  bind('fontSel', 'font', String, 'change');
  bind('textColor', 'text');
  bind('accentColor', 'accent');
  bind('sizeInp', 'size', Number);
  bind('posInp', 'posY', (v) => v / 100);
  bind('wplInp', 'wpl', Number);
  bind('cropInp', 'cropX', (v) => v / 100);
  bind('upperChk', 'upper', Boolean, 'change');
  bind('captionsChk', 'show', Boolean, 'change');
  syncControls();
}

function animLabel(a) {
  return { highlight: 'Highlight', pop: 'Pop in', karaoke: 'Karaoke', box: 'Word box', bounce: 'Bounce', classic: 'Static' }[a];
}

function syncControls() {
  $('animSel').value = style.anim;
  $('fontSel').value = style.font;
  $('textColor').value = style.text;
  $('accentColor').value = style.accent;
  $('sizeInp').value = style.size;
  $('posInp').value = Math.round(style.posY * 100);
  $('wplInp').value = style.wpl;
  $('cropInp').value = Math.round(style.cropX * 100);
  $('upperChk').checked = style.upper;
  pagesCache = null;
  markPreset();
  document.fonts.load(`${FONTS[style.font].weight} 80px "${style.font}"`).then(() => drawFrame());
}

function markPreset() {
  [...$('presets').children].forEach((b, i) => {
    const p = PRESETS[i];
    const same = ['anim', 'font', 'text', 'accent', 'size', 'wpl', 'upper'].every((k) => p[k] === style[k]);
    b.classList.toggle('active', same);
  });
}

// ---------------------------------------------------------------------------
// Drawing: video frame + animated captions
// ---------------------------------------------------------------------------
function buildPages() {
  if (pagesCache) return pagesCache;
  const ws = clipWords();
  const pages = [];
  let page = [];
  ws.forEach((w, i) => {
    page.push(w);
    const next = ws[i + 1];
    const brk = page.length >= style.wpl || /[.!?,]$/.test(w.text) || (next && next.start - w.end > 0.6);
    if (!next || brk) { pages.push(page); page = []; }
  });
  pagesCache = pages.map((p, i) => ({
    words: p,
    start: p[0].start,
    end: pages[i + 1] ? Math.min(pages[i + 1][0].start, p[p.length - 1].end + 0.5) : p[p.length - 1].end + 0.5,
  }));
  return pagesCache;
}

function drawFrame() {
  const t = video.currentTime;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const vw = video.videoWidth, vh = video.videoHeight;
  if (vw && vh) {
    const ar = W / H;
    let sw, sh;
    if (vw / vh > ar) { sh = vh; sw = vh * ar; } else { sw = vw; sh = vw / ar; }
    const sx = (vw - sw) * style.cropX;
    const sy = (vh - sh) / 2;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, W, H);
  }
  if (style.show) drawCaptions(t);
  highlightTranscript(t);
}

const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const clamp01 = (x) => Math.max(0, Math.min(1, x));

function drawCaptions(t) {
  const page = buildPages().find((p) => t >= p.start - 0.02 && t < p.end);
  if (!page) return;

  const { weight } = FONTS[style.font];
  const size = style.size;
  ctx.font = `${weight} ${size}px "${style.font}"`;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  const space = ctx.measureText(' ').width;
  const maxW = W * 0.86;
  const items = page.words.map((w) => {
    const text = style.upper ? w.text.toUpperCase() : w.text;
    return { w, text, width: ctx.measureText(text).width };
  });

  // Wrap into lines.
  const lines = [[]];
  let lineW = 0;
  for (const it of items) {
    const add = (lines[lines.length - 1].length ? space : 0) + it.width;
    if (lineW + add > maxW && lines[lines.length - 1].length) { lines.push([]); lineW = 0; }
    lines[lines.length - 1].push(it);
    lineW += (lines[lines.length - 1].length > 1 ? space : 0) + it.width;
  }

  const lineH = size * 1.22;
  const top = H * style.posY - ((lines.length - 1) * lineH) / 2;

  // Active word = the one being spoken, or the last spoken one during a pause.
  let active = null;
  for (const it of items) if (t >= it.w.start) active = it;

  lines.forEach((line, li) => {
    const total = line.reduce((a, it) => a + it.width, 0) + space * (line.length - 1);
    let x = (W - total) / 2;
    const y = top + li * lineH;
    for (const it of line) {
      drawWord(it, x, y, t, it === active, size);
      x += it.width + space;
    }
  });
}

function drawWord(it, x, y, t, isActive, size) {
  const { anim, text: textColor, accent } = style;
  const spoken = t >= it.w.start;
  const since = t - it.w.start;
  let scale = 1, alpha = 1, fill = textColor, dy = 0;

  if (anim === 'pop') {
    if (!spoken) return;
    const p = clamp01(since / 0.16);
    scale = 0.5 + 0.5 * easeOutBack(p);
    alpha = clamp01(since / 0.08);
    if (isActive) fill = accent;
  } else if (anim === 'bounce') {
    if (!spoken) alpha = 0.35;
    if (isActive) { fill = accent; dy = -Math.sin(clamp01(since / 0.25) * Math.PI) * size * 0.22; scale = 1.08; }
  } else if (anim === 'highlight') {
    if (isActive) { fill = accent; scale = 1 + 0.12 * (1 - clamp01((since - 0.12) / 0.25)) ; scale = Math.max(scale, 1.06); }
  } else if (anim === 'box') {
    if (isActive) {
      const pad = size * 0.16, p = clamp01(since / 0.1);
      ctx.save();
      ctx.translate(x + it.width / 2, y);
      ctx.scale(0.85 + 0.15 * p, 0.85 + 0.15 * p);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.roundRect(-it.width / 2 - pad, -size * 0.62, it.width + pad * 2, size * 1.2, size * 0.22);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x + it.width / 2, y + dy);
  ctx.scale(scale, scale);
  const lx = -it.width / 2;

  ctx.lineWidth = size * 0.17;
  ctx.strokeStyle = 'rgba(0,0,0,0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.05;
  if (anim !== 'box' || !isActive) ctx.strokeText(it.text, lx, 0);
  ctx.shadowColor = 'transparent';

  ctx.fillStyle = fill;
  ctx.fillText(it.text, lx, 0);

  if (anim === 'karaoke') {
    const dur = Math.max(0.05, it.w.end - it.w.start);
    const p = t >= it.w.end ? 1 : clamp01(since / dur);
    if (p > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(lx - 4, -size, (it.width + 8) * p, size * 2);
      ctx.clip();
      ctx.fillStyle = accent;
      ctx.fillText(it.text, lx, 0);
      ctx.restore();
    }
  }
  ctx.restore();
}

let lastHi = null;
function highlightTranscript(t) {
  const w = words.find((x) => t >= x.start && t < x.end);
  if (w === lastHi) return;
  if (lastHi && lastHi._el) lastHi._el.classList.remove('now');
  if (w && w._el) w._el.classList.add('now');
  lastHi = w;
}

// ---------------------------------------------------------------------------
// Preview playback
// ---------------------------------------------------------------------------
let audioCtx, sourceNode, monitorGain, recordDest;
function ensureAudioGraph() {
  if (audioCtx) return;
  audioCtx = new AudioContext();
  sourceNode = audioCtx.createMediaElementSource(video);
  monitorGain = audioCtx.createGain();
  recordDest = audioCtx.createMediaStreamDestination();
  sourceNode.connect(monitorGain).connect(audioCtx.destination);
  sourceNode.connect(recordDest);
}

function seekPreview(t) {
  return new Promise((res) => {
    const done = () => { video.removeEventListener('seeked', done); drawFrame(); res(); };
    video.addEventListener('seeked', done);
    video.currentTime = t;
  });
}

function loop(onEnd) {
  const c = clips[current];
  drawFrame();
  if (video.currentTime >= c.end || video.ended) { video.pause(); onEnd(); return; }
  if (playing || exporting) requestAnimationFrame(() => loop(onEnd));
}

$('playBtn').onclick = async () => {
  if (exporting) return;
  if (playing) { stopPreview(); return; }
  ensureAudioGraph();
  await audioCtx.resume();
  monitorGain.gain.value = 1;
  const c = clips[current];
  if (video.currentTime < c.start || video.currentTime >= c.end - 0.1) await seekPreview(c.start);
  playing = true;
  $('playBtn').textContent = '❚❚ Pause';
  await video.play();
  loop(() => { playing = false; $('playBtn').textContent = '▶ Preview'; });
};

function stopPreview() {
  playing = false;
  video.pause();
  $('playBtn').textContent = '▶ Preview';
}

// ---------------------------------------------------------------------------
// Export (real-time render of the canvas + audio)
// ---------------------------------------------------------------------------
function pickMime() {
  const opts = [
    ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'mp4'],
    ['video/mp4', 'mp4'],
    ['video/webm;codecs=vp9,opus', 'webm'],
    ['video/webm', 'webm'],
  ];
  return opts.find(([m]) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || null;
}

async function exportClip(index) {
  const mime = pickMime();
  if (!mime) { alert('Your browser cannot export video. Please use Chrome or Edge.'); return; }
  stopPreview();
  selectClip(index);
  ensureAudioGraph();
  await audioCtx.resume();
  await document.fonts.load(`${FONTS[style.font].weight} 80px "${style.font}"`);

  const c = clips[index];
  exporting = true;
  setButtons(true);
  await seekPreview(c.start);

  const stream = canvas.captureStream(30);
  recordDest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
  const rec = new MediaRecorder(stream, { mimeType: mime[0], videoBitsPerSecond: 10_000_000, audioBitsPerSecond: 160_000 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise((r) => (rec.onstop = r));

  monitorGain.gain.value = 0; // silent while exporting
  const label = $('exportBtn');
  const tick = setInterval(() => {
    const p = clamp01((video.currentTime - c.start) / (c.end - c.start));
    label.textContent = `Exporting ${Math.round(p * 100)}%`;
  }, 250);

  rec.start(500);
  await video.play();
  await new Promise((done) => loop(done));
  rec.stop();
  await stopped;
  clearInterval(tick);
  stream.getVideoTracks().forEach((tr) => tr.stop());
  monitorGain.gain.value = 1;
  exporting = false;
  setButtons(false);

  const blob = new Blob(chunks, { type: mime[0].split(';')[0] });
  addDownload(blob, `${String(index + 1).padStart(2, '0')}_${safeName(c.title)}.${mime[1]}`);
}

function safeName(s) { return (s || 'clip').replace(/[^\w\- ]/g, '').trim().replace(/\s+/g, '_').slice(0, 50) || 'clip'; }

function addDownload(blob, name) {
  $('downloadsPanel').hidden = false;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.textContent = `⬇ ${name}  (${(blob.size / 1e6).toFixed(1)} MB)`;
  $('downloads').prepend(a);
  a.click();
}

function setButtons(busy) {
  ['playBtn', 'exportBtn', 'exportAllBtn'].forEach((id) => ($(id).disabled = busy));
  $('exportBtn').textContent = 'Export clip';
}

$('exportBtn').onclick = () => exportClip(current);
$('exportAllBtn').onclick = async () => { for (let i = 0; i < clips.length; i++) await exportClip(i); };

// Hook for automated testing: load a transcript without running the speech AI.
window.__aizipy = {
  async loadWithTranscript(f, ws, cl) {
    file = f; $('hero').style.display = 'none'; document.body.classList.add('working');
    video.src = URL.createObjectURL(f);
    await new Promise((r) => (video.onloadedmetadata = r));
    words = cleanWords(ws);
    clips = cl || (await pickClips(words, video.duration));
    showWorkspace();
  },
  style, exportClip,
};
