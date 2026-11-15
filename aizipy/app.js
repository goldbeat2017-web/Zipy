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
  'Luckiest Guy':     { weight: 400 },
  'Bungee':           { weight: 400 },
  'Lilita One':       { weight: 400 },
  'Titan One':        { weight: 400 },
  'Rubik':            { weight: 900 },
  'Oswald':           { weight: 700 },
  'Fredoka':          { weight: 700 },
  'Kanit':            { weight: 900, italic: true },
  'Righteous':        { weight: 400 },
  'Press Start 2P':   { weight: 400, scale: 0.6 },   // pixel font, very wide
  'Pacifico':         { weight: 400 },
  'Cairo':            { weight: 900 },               // supports Arabic
};
const fontCss = (name, px) => {
  const f = FONTS[name] || FONTS.Montserrat;
  return `${f.italic ? 'italic ' : ''}${f.weight} ${Math.round(px * (f.scale || 1))}px "${name}"`;
};
const EMOJI_FONT = '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';

const PRESETS = [
  { name: 'Viral',    anim: 'highlight', font: 'Montserrat',       text: '#ffffff', accent: '#c6ff3d', size: 92,  wpl: 3, upper: true },
  { name: 'Pop',      anim: 'pop',       font: 'Anton',            text: '#ffffff', accent: '#ffd43b', size: 104, wpl: 2, upper: true },
  { name: 'Karaoke',  anim: 'karaoke',   font: 'Archivo Black',    text: '#ffffff', accent: '#38d9ff', size: 84,  wpl: 4, upper: false },
  { name: 'Boxed',    anim: 'box',       font: 'Poppins',          text: '#ffffff', accent: '#7c4dff', size: 82,  wpl: 3, upper: false },
  { name: 'Comic',    anim: 'bounce',    font: 'Bangers',          text: '#ffffff', accent: '#ff5d8f', size: 110, wpl: 3, upper: true },
  { name: 'Marker',   anim: 'pop',       font: 'Permanent Marker', text: '#ffffff', accent: '#ff922b', size: 88,  wpl: 3, upper: false },
  { name: 'One word', anim: 'pop',       font: 'Bebas Neue',       text: '#ffffff', accent: '#c6ff3d', size: 140, wpl: 1, upper: true },
  { name: 'Clean',    anim: 'classic',   font: 'Poppins',          text: '#ffffff', accent: '#ffffff', size: 74,  wpl: 5, upper: false },
  { name: 'Hype',     anim: 'bounce',    font: 'Luckiest Guy',     text: '#ffffff', accent: '#ffd43b', size: 104, wpl: 2, upper: true },
  { name: 'Neon',     anim: 'glow',      font: 'Righteous',        text: '#ffffff', accent: '#39ff14', size: 92,  wpl: 3, upper: true },
  { name: 'Slide',    anim: 'slide',     font: 'Rubik',            text: '#ffffff', accent: '#ff5d8f', size: 90,  wpl: 3, upper: true },
  { name: 'Type',     anim: 'typewriter',font: 'Kanit',            text: '#ffffff', accent: '#38d9ff', size: 92,  wpl: 3, upper: true },
  { name: 'Gamer',    anim: 'pop',       font: 'Press Start 2P',   text: '#ffffff', accent: '#ff2e63', size: 110, wpl: 2, upper: true },
  { name: 'Bubbly',   anim: 'pop',       font: 'Titan One',        text: '#ffffff', accent: '#b197fc', size: 96,  wpl: 2, upper: false },
];

const style = { ...PRESETS[0], cropX: 0.5, posY: 0.72, show: true };

// ---------------------------------------------------------------------------
// Emojis
// ---------------------------------------------------------------------------
const emo = { auto: true, anim: 'pop', pos: 'above', size: 130 };
const EMOJI_PALETTE = ['🔥','😂','🤣','😱','🤯','😮','😍','❤️','💯','👀','👏','🙌','💪','🚀','💰','💸',
  '🤑','📈','📉','🎯','✅','❌','⚠️','💡','🧠','⏰','🎉','🏆','👑','😎','🤔','😭',
  '😡','😤','🥶','🥵','💀','👻','🤝','🙏','⚡','💥','⭐','🌍','🍕','🎮','🎧','🎬'];
// Key words (English + French) → emoji. Matching ignores case, accents and punctuation.
const EMOJI_WORDS = {
  '💰': 'money cash dollar dollars euro euros rich wealth wealthy paid salary income profit profits argent riche fric thune salaire',
  '💸': 'spend spent spending expensive cost costs price broke debt depense cher couter dette',
  '🔥': 'fire hot amazing insane crazy lit incredible fou folle dingue incroyable feu',
  '😂': 'funny laugh laughing hilarious joke lol haha drole rire blague mdr',
  '😱': 'scary shocked shock terrified horror afraid scared peur choque effrayant',
  '🤯': 'mind mindblowing unbelievable wow omg genius genial',
  '❤️': 'love loved heart lovely amour aime coeur adore',
  '💯': 'hundred percent perfect exactly absolutely totally parfait exactement absolument',
  '🚀': 'grow growth rocket launch launched skyrocket fast faster boost croissance fusee lancer lancement rapide',
  '📈': 'increase up rising gains growing stock stocks market invest investing investment hausse bourse investir',
  '📉': 'decrease down falling crash loss losses lose losing baisse perte perdre',
  '💪': 'strong strength gym workout muscle power fort force muscu puissance',
  '🧠': 'brain smart think thinking mind learn learning intelligent cerveau penser apprendre',
  '💡': 'idea ideas tip tips secret secrets trick hack astuce idee secret',
  '⏰': 'time hour hours minute minutes deadline late morning temps heure heures minutes retard matin',
  '🎯': 'goal goals target focus aim objective objectif but cible',
  '🏆': 'win won winner winning champion best victory gagner gagne victoire meilleur',
  '👑': 'king queen boss legend roi reine patron legende',
  '🎉': 'party celebrate congrats congratulations birthday fete bravo anniversaire',
  '🤔': 'why question wonder maybe hmm pourquoi question peutetre',
  '😭': 'sad cry crying tears triste pleurer larmes',
  '😡': 'angry mad hate furious rage enerve colere deteste',
  '💀': 'dead died dying kill killed mort mourir tuer',
  '👀': 'look watch see seeing look regarde voir regarder',
  '✅': 'yes correct right true done oui vrai fini',
  '❌': 'no wrong false never mistake non faux jamais erreur',
  '⚠️': 'warning careful danger dangerous risk attention prudent risque',
  '🤝': 'deal partner partnership together team accord partenaire ensemble equipe',
  '🙏': 'thank thanks please grateful merci svp',
  '😍': 'beautiful gorgeous cute pretty beau belle magnifique mignon',
  '🎮': 'game games gaming gamer play playing jeu jeux jouer',
  '🍕': 'food eat eating pizza hungry manger nourriture faim',
  '🌍': 'world global country countries planet monde pays planete',
  '⚡': 'energy electric quick instantly energie electrique vite',
};
const EMOJI_LOOKUP = new Map();
for (const [e, list] of Object.entries(EMOJI_WORDS)) for (const w of list.split(' ')) if (w && !EMOJI_LOOKUP.has(w)) EMOJI_LOOKUP.set(w, e);
const normWord = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

// Give a few key words an emoji automatically (at most one every ~2.5 s, so it never feels spammy).
function refreshAutoEmojis() {
  let last = -Infinity;
  for (const w of words) {
    const e = EMOJI_LOOKUP.get(normWord(w.text));
    w._auto = '';
    if (e && w.start - last >= 2.5) { w._auto = e; last = w.start; }
  }
}
const wordEmoji = (w) => (w.emoji !== undefined ? w.emoji : (emo.auto ? w._auto || '' : ''));
const RTL = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

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

// Link mode: a server downloads only the moments the AI picked (see window.AIZIPY_SERVER).
const SERVER = String(window.AIZIPY_SERVER || '').trim().replace(/\/+$/, '');
let mode = 'file';         // 'file' (uploaded) or 'link' (pasted link)
let fileURL = null;
let linkUrl = '';
let sourceDuration = 0;    // length of the original video in seconds
let media = [];            // link mode, per clip: { start, end, ready, url, progress, failed, error, promise }
let tOff = 0;              // the loaded file starts at this time in the original video
let loadedSrc = null;
let selectToken = 0;
const PAD = 8;             // extra seconds downloaded around each clip so edges can be adjusted
const now = () => video.currentTime + tOff;

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

// Pasting a link anywhere on the start screen opens the link tab and fills it in.
document.addEventListener('paste', (e) => {
  if ($('hero').style.display === 'none' || e.target === $('linkInput')) return;
  const text = (e.clipboardData && e.clipboardData.getData('text') || '').trim();
  if (/^(https?:\/\/)?[\w-]+(\.[\w-]+)+\/\S*$/i.test(text)) {
    setTab('link');
    $('linkInput').value = text;
    linkMsg('Link pasted — press Start.');
  }
});

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
  let raw = $('linkInput').value.trim();
  if (!raw) { $('linkInput').focus(); return linkMsg('Paste a video link first.', true); }
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw.replace(/^\/+/, '');
  let url;
  try { url = new URL(raw); } catch { return linkMsg('That doesn\'t look like a valid link.', true); }
  if (!url.hostname.includes('.') && url.hostname !== 'localhost') return linkMsg('That doesn\'t look like a valid link.', true);

  if (SERVER) { linkMsg(''); startFromLink(normalizeLink(url)); return; }

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
  mode = 'file';
  $('hero').style.display = 'none';
  document.body.classList.add('working');
  fileURL = URL.createObjectURL(f);
  try { await setSource(fileURL, 0); }
  catch { return setStatus('This video format is not supported by your browser. Try an MP4 file.', null, true); }
  sourceDuration = video.duration;

  try {
    setStatus('Extracting audio…', 0.02);
    const audio = await decodeAudio(f);
    words = await transcribe(audio);
    refreshAutoEmojis();
    if (!words.length) throw new Error('No speech found in this video. Aizipy needs spoken content to find moments.');

    setStatus('AI is picking your best moments…', 1);
    clips = await pickClips(words, sourceDuration);
    showWorkspace();
  } catch (err) {
    console.error(err);
    setStatus(err.message || String(err), null, true);
  }
}

// ---------------------------------------------------------------------------
// Link mode: talk to the download server
// ---------------------------------------------------------------------------
async function api(path, body) {
  let res;
  try {
    res = await fetch(SERVER + path, body
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : { cache: 'no-store' });
  } catch {
    throw new Error('Our video server can\'t be reached right now. Please try again in a moment.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Something went wrong. Please try again.');
  return data;
}

async function runJob(path, body, onProgress) {
  const { id } = await api(path, body);
  let misses = 0;
  for (;;) {
    await new Promise((r) => setTimeout(r, 1200));
    let job;
    try { job = await api(`/jobs/${id}`); misses = 0; }
    catch (e) { if (++misses > 5) throw e; continue; }
    if (job.status === 'done') return job;
    if (job.status === 'error') throw new Error(job.error || 'Something went wrong. Please try again.');
    if (onProgress) onProgress(job.progress || 0, job.status);
  }
}

async function jobFile(id, part = 0) {
  let res;
  try { res = await fetch(`${SERVER}/jobs/${id}/file?part=${part}`, { cache: 'no-store' }); }
  catch { throw new Error('Our video server can\'t be reached right now. Please try again in a moment.'); }
  if (!res.ok) throw new Error('This file has expired. Please start again.');
  return res.blob();
}

async function startFromLink(url) {
  mode = 'link';
  linkUrl = url;
  $('hero').style.display = 'none';
  document.body.classList.add('working');
  try {
    setStatus('Checking your link…', 0.01);
    const info = await api('/info', { url });
    linkUrl = info.url || url;
    const name = info.title ? `“${info.title.length > 70 ? info.title.slice(0, 70) + '…' : info.title}”` : 'your video';
    setStatus(`Getting the audio of ${name}…`, 0.02);
    const job = await runJob('/jobs/audio', { url: linkUrl }, (p, st) =>
      setStatus(st === 'queued' ? 'Waiting for a free spot on our server…' : `Getting the audio of ${name}… ${Math.round(p * 100)}%`, 0.02 + p * 0.13));
    sourceDuration = job.result.duration;
    words = await transcribeParts(job, (p, label) => setStatus(label, 0.15 + p * 0.8));
    refreshAutoEmojis();
    if (!words.length) throw new Error('No speech found in this video. Aizipy needs spoken content to find moments.');

    setStatus('AI is picking your best moments…', 0.97);
    clips = await pickClips(words, sourceDuration);
    media = [];
    clips.forEach((_, i) => ensureClipMedia(i).catch(() => {}));
    showWorkspace();
  } catch (err) {
    console.error(err);
    setStatus(err.message || String(err), null, true);
    showRetry();
  }
}

function showRetry() {
  if ($('retryBtn')) return;
  const b = document.createElement('button');
  b.id = 'retryBtn'; b.className = 'btn'; b.style.marginTop = '14px';
  b.textContent = 'Try another video';
  b.onclick = () => location.reload();
  $('status').appendChild(b);
}

// Download (on the server) only the part of the video this clip needs, plus a little padding.
function ensureClipMedia(i) {
  const c = clips[i];
  const m = media[i];
  if (m && !m.failed && c.start >= m.start - 0.01 && c.end <= m.end + 0.01) return m.promise;
  const s = Math.max(0, c.start - PAD);
  const e = Math.min(sourceDuration || c.end + PAD, c.end + PAD);
  const fresh = { start: s, end: e, progress: 0, ready: false, failed: false, queued: true };
  media[i] = fresh;
  fresh.promise = (async () => {
    const job = await runJob('/jobs/clip', { url: linkUrl, start: +s.toFixed(3), end: +e.toFixed(3) }, (p, st) => {
      fresh.progress = p; fresh.queued = st === 'queued'; mediaChanged(i);
    });
    const blob = await jobFile(job.id);
    fresh.url = URL.createObjectURL(blob);
    fresh.ready = true;
    mediaChanged(i);
    return fresh;
  })().catch((err) => {
    fresh.failed = true; fresh.error = err.message;
    mediaChanged(i);
    throw err;
  });
  mediaChanged(i);
  return fresh.promise;
}

function mediaChanged(i) {
  updateMediaBadges();
  if (i === current && !mediaReady()) drawFrame();
}

function mediaReady() {
  if (mode !== 'link') return true;
  const m = media[current];
  return !!(m && m.ready && loadedSrc === m.url);
}

function updateMediaBadges() {
  document.querySelectorAll('.mstat').forEach((el) => {
    const m = media[+el.dataset.i];
    if (mode !== 'link' || !m) { el.textContent = ''; return; }
    el.className = 'mstat' + (m.failed ? ' bad' : m.ready ? ' ok' : '');
    el.textContent = m.failed ? '⚠ Failed — click to retry'
      : m.ready ? '✓ Ready'
      : m.queued ? '⏳ Waiting…' : `⏳ Preparing ${Math.round(m.progress * 100)}%`;
  });
}

function setSource(src, offset) {
  return new Promise((res, rej) => {
    video.onloadedmetadata = () => res();
    video.onerror = () => rej(new Error('This clip could not be played.'));
    tOff = offset;
    loadedSrc = src;
    video.src = src;
  });
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

// One speech-AI session that can transcribe several audio pieces in a row.
function createTranscriber(onStatus = () => {}) {
  const override = window.__aizipy && window.__aizipy.transcribeOverride;
  if (override) return { run: async (audio, offset = 0) => override(audio, offset), close() {} };
  const worker = new Worker('worker.js', { type: 'module' });
  let pending = null;
  let offset = 0;
  worker.onmessage = ({ data }) => {
    if (data.type === 'download') onStatus({ phase: 'download', p: data.progress });
    if (data.type === 'ready') onStatus({ phase: 'ready', device: data.device });
    if (data.type === 'progress') onStatus({ phase: 'progress', p: data.progress });
    if (data.type === 'done' && pending) {
      const r = pending; pending = null;
      r.resolve(data.words.map((w) => ({ ...w, start: w.start + offset, end: w.end + offset })));
    }
    if (data.type === 'error' && pending) { const r = pending; pending = null; r.reject(new Error('Transcription failed: ' + data.message)); }
  };
  worker.onerror = (e) => { if (pending) { pending.reject(new Error('Transcription failed: ' + (e.message || 'worker error'))); pending = null; } };
  return {
    run(audio, off = 0) {
      offset = off;
      return new Promise((resolve, reject) => {
        pending = { resolve, reject };
        worker.postMessage({ audio }, [audio.buffer]);
      });
    },
    close() { worker.terminate(); },
  };
}

async function transcribe(audio) {
  let device = 'CPU';
  setStatus('Loading the speech AI (first time only, ~80 MB)…', 0.03);
  const t = createTranscriber((s) => {
    if (s.phase === 'download') setStatus('Loading the speech AI (first time only, ~80 MB)…', s.p * 0.3);
    if (s.phase === 'ready') { device = s.device === 'webgpu' ? 'GPU' : 'CPU'; setStatus(`Transcribing on your ${device}…`, 0.3); }
    if (s.phase === 'progress') setStatus(`Transcribing on your ${device}… ${Math.round(s.p * 100)}%`, 0.3 + s.p * 0.65);
  });
  try { return cleanWords(await t.run(audio, 0)); }
  finally { t.close(); }
}

// Link mode: the server sends the audio in 10-minute parts (with a small overlap),
// so even multi-hour streams never overload the browser's memory.
async function transcribeParts(job, onStatus) {
  const parts = job.result.parts;
  const n = parts.length;
  let k = 0;
  let device = 'CPU';
  const label = (p) => `Transcribing on your ${device}… ${Math.round(((k + p) / n) * 100)}%` + (n > 1 ? ` (part ${k + 1} of ${n})` : '');
  const t = createTranscriber((s) => {
    if (s.phase === 'download') onStatus(0, `Loading the speech AI (first time only, ~80 MB)… ${Math.round(s.p * 100)}%`);
    if (s.phase === 'ready') { device = s.device === 'webgpu' ? 'GPU' : 'CPU'; onStatus(k / n, label(0)); }
    if (s.phase === 'progress') onStatus((k + s.p) / n, label(s.p));
  });
  const all = [];
  try {
    let next = jobFile(job.id, parts[0].index);
    for (k = 0; k < n; k++) {
      const blob = await next;
      next = k + 1 < n ? jobFile(job.id, parts[k + 1].index) : null;
      if (next) next.catch(() => {});
      const audio = await decodeAudio(blob);
      onStatus(k / n, label(0));
      const ws = await t.run(audio, parts[k].start);
      const last = k === n - 1;
      for (const w of ws) {
        if (w.start >= parts[k].keepFrom - 0.01 && (last || w.start < parts[k].keepTo)) all.push(w);
      }
    }
  } finally { t.close(); }
  return cleanWords(all);
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
  buildPlatformControls();
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
        <div class="mstat" data-i="${i}"></div>
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
        c[inp.dataset.k] = Math.max(0, Math.min(sourceDuration, v));
        if (c.end <= c.start + 1) c.end = Math.min(sourceDuration, c.start + 1);
        if (c.end - c.start > 220) c.end = c.start + 220;
        selectClip(i);
      };
    });
    list.appendChild(el);
  });
  updateMediaBadges();
}

async function selectClip(i) {
  stopPreview();
  current = i;
  pagesCache = null;
  const token = ++selectToken;
  renderClipList();
  renderWords();
  try {
    if (mode === 'link') {
      if (!mediaReady()) drawFrame();
      const m = await ensureClipMedia(i);
      if (token !== selectToken) return false;
      if (loadedSrc !== m.url) await setSource(m.url, m.start);
      tOff = m.start;
    } else if (loadedSrc !== fileURL) {
      await setSource(fileURL, 0);
    }
    if (token !== selectToken) return false;
    await seekPreview(clips[i].start + 0.05);
    return true;
  } catch (err) {
    console.warn(err);
    if (token === selectToken) drawFrame();
    return false;
  }
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
    const e = wordEmoji(w);
    if (e) { s.classList.add('has-emoji'); s.dataset.emoji = e; }
    s.onclick = (ev) => openWordEditor(w, ev.currentTarget);
    w._el = s;
    box.appendChild(s);
    box.appendChild(document.createTextNode(' '));
  });
}

// Small pop-up to edit a word and pick its emoji.
let editing = null;
function openWordEditor(w, anchor) {
  stopPreview();
  editing = w;
  const ed = $('wordEditor');
  $('weText').value = w.text;
  const cur = wordEmoji(w);
  $('weEmojis').innerHTML = '';
  EMOJI_PALETTE.forEach((e) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = e; b.title = 'Add ' + e;
    if (e === cur) b.classList.add('on');
    b.onclick = () => { w.emoji = e; document.fonts.load(`80px ${EMOJI_FONT}`, e); closeWordEditor(); };
    $('weEmojis').appendChild(b);
  });
  ed.hidden = false;
  const r = anchor.getBoundingClientRect();
  const eh = ed.offsetHeight, ew = ed.offsetWidth;
  let top = r.bottom + 8;
  if (top + eh > window.innerHeight - 8) top = Math.max(8, r.top - eh - 8);
  ed.style.top = top + 'px';
  ed.style.left = Math.max(16, Math.min(r.left, window.innerWidth - ew - 16)) + 'px';
  $('weText').focus();
  $('weText').select();
}
function closeWordEditor(save = true) {
  const w = editing;
  if (w && save) {
    const v = $('weText').value.trim();
    if (v) w.text = v;
  }
  editing = null;
  $('wordEditor').hidden = true;
  pagesCache = null; renderWords(); drawFrame();
}
$('weNone').onclick = () => { if (editing) editing.emoji = ''; closeWordEditor(); };
$('weDelete').onclick = () => {
  if (editing) words.splice(words.indexOf(editing), 1);
  editing = null; $('wordEditor').hidden = true;
  pagesCache = null; renderWords(); drawFrame();
};
$('weDone').onclick = () => closeWordEditor();
$('weText').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') closeWordEditor();
  if (e.key === 'Escape') closeWordEditor(false);
});
document.addEventListener('mousedown', (e) => {
  if (!editing || $('wordEditor').contains(e.target) || (e.target.closest && e.target.closest('#words'))) return;
  closeWordEditor();
});

function buildStyleControls() {
  const pre = $('presets');
  pre.innerHTML = '';
  PRESETS.forEach((p) => {
    const b = document.createElement('button');
    b.className = 'preset';
    b.style.fontFamily = `"${p.font}"`;
    b.style.fontWeight = FONTS[p.font].weight;
    if (FONTS[p.font].italic) b.style.fontStyle = 'italic';
    if (FONTS[p.font].scale) b.style.fontSize = '12px';
    b.style.color = p.accent;
    b.innerHTML = `${p.upper ? p.name.toUpperCase() : p.name}<small>${animLabel(p.anim)}</small>`;
    b.onclick = () => { Object.assign(style, p); syncControls(); };
    pre.appendChild(b);
  });

  const grid = $('fontGrid');
  grid.innerHTML = '';
  Object.entries(FONTS).forEach(([name, f]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = name;
    b.dataset.font = name;
    b.setAttribute('role', 'option');
    b.style.fontFamily = `"${name}"`;
    b.style.fontWeight = f.weight;
    if (f.italic) b.style.fontStyle = 'italic';
    if (f.scale) b.style.fontSize = '10px';
    b.onclick = () => { style.font = name; syncControls(); };
    grid.appendChild(b);
  });

  $('emoAutoChk').onchange = (e) => { emo.auto = e.target.checked; renderWords(); drawFrame(); };
  $('emoAnimSel').onchange = (e) => { emo.anim = e.target.value; drawFrame(); };
  $('emoPosSel').onchange = (e) => { emo.pos = e.target.value; drawFrame(); };
  $('emoSizeInp').oninput = (e) => { emo.size = Number(e.target.value); drawFrame(); };
  document.fonts.load(`80px ${EMOJI_FONT}`, words.map(wordEmoji).join('') || '🔥').then(() => drawFrame());

  const bind = (id, key, conv = (v) => v, ev = 'input') => {
    $(id).addEventListener(ev, (e) => {
      const el = e.target;
      style[key] = conv(el.type === 'checkbox' ? el.checked : el.value);
      if (key === 'wpl' || key === 'upper') pagesCache = null;
      markPreset(); drawFrame();
    });
  };
  bind('animSel', 'anim', String, 'change');
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
  return { highlight: 'Highlight', pop: 'Pop in', karaoke: 'Karaoke', box: 'Word box', bounce: 'Bounce',
    slide: 'Slide up', typewriter: 'Typewriter', glow: 'Neon glow', classic: 'Static' }[a];
}

function syncControls() {
  $('animSel').value = style.anim;
  [...$('fontGrid').children].forEach((b) => {
    const on = b.dataset.font === style.font;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', String(on));
  });
  $('textColor').value = style.text;
  $('accentColor').value = style.accent;
  $('sizeInp').value = style.size;
  $('posInp').value = Math.round(style.posY * 100);
  $('wplInp').value = style.wpl;
  $('cropInp').value = Math.round(style.cropX * 100);
  $('upperChk').checked = style.upper;
  pagesCache = null;
  markPreset();
  document.fonts.load(fontCss(style.font, 80)).then(() => drawFrame());
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

function drawLoading() {
  const m = media[current];
  ctx.fillStyle = '#0d0d12';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = m && m.failed ? '#ff6b6b' : '#f1f1f6';
  ctx.font = '800 54px Poppins, system-ui, sans-serif';
  ctx.fillText(m && m.failed ? 'Could not prepare this clip' : 'Preparing this clip…', W / 2, H / 2 - 60);
  ctx.font = '500 38px Poppins, system-ui, sans-serif';
  ctx.fillStyle = '#9a9ab0';
  const sub = !m ? '' : m.failed ? 'Click the clip in the list to try again'
    : m.queued ? 'Waiting for a free spot on our server' : `${Math.round(m.progress * 100)}%`;
  ctx.fillText(sub, W / 2, H / 2 + 20);
  if (m && !m.failed) {
    ctx.fillStyle = '#1e1e2a'; ctx.fillRect(W * 0.2, H / 2 + 90, W * 0.6, 14);
    ctx.fillStyle = '#c6ff3d'; ctx.fillRect(W * 0.2, H / 2 + 90, W * 0.6 * m.progress, 14);
  }
  ctx.textAlign = 'left';
}

function drawFrame() {
  if (!mediaReady()) { drawLoading(); return; }
  const t = now();
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

// ---------------------------------------------------------------------------
// Platform previews: how the short will look inside each app.
// Drawn on a separate overlay canvas, so it is NEVER part of the export.
// Safe-zone margins are approximate (1080×1920) and vary a little by phone.
// ---------------------------------------------------------------------------
const PLATFORMS = {
  none:      { label: 'No overlay' },
  tiktok:    { label: 'TikTok',          safe: { l: 60, t: 170, r: 150, b: 440 } },
  shorts:    { label: 'YouTube Shorts',  safe: { l: 60, t: 150, r: 170, b: 430 } },
  reels:     { label: 'Instagram Reels', safe: { l: 60, t: 220, r: 150, b: 450 } },
  fbreels:   { label: 'Facebook Reels',  safe: { l: 60, t: 200, r: 150, b: 470 } },
};
const view = { platform: 'tiktok', showSafe: true, keepSafe: true };
const overlay = $('overlay');
const octx = overlay.getContext('2d');

function safeRect() {
  const p = PLATFORMS[view.platform];
  if (!p.safe) return null;
  const { l, t, r, b } = p.safe;
  return { x: l, y: t, w: W - l - r, h: H - t - b, x2: W - r, y2: H - b };
}

function captionBox() {
  const s = safeRect();
  if (s && view.keepSafe) return { safe: true, w: s.w * 0.96, cx: s.x + s.w / 2, yMin: s.y, yMax: s.y2 };
  return { safe: false, w: W * 0.86, cx: W / 2 };
}

let lastWarn = '';
function checkSafe(b) {
  const s = safeRect();
  let msg = '';
  if (s && !view.keepSafe && (b.left < s.x || b.right > s.x2 || b.top < s.y || b.bottom > s.y2)) {
    msg = `⚠ On ${PLATFORMS[view.platform].label}, part of your captions will be hidden behind the app's buttons or text. Tick "Keep captions in safe zone" or move them.`;
  }
  if (msg !== lastWarn) {
    lastWarn = msg;
    $('safeWarn').textContent = msg;
    $('safeWarn').hidden = !msg;
  }
}

function buildPlatformControls() {
  const box = $('platforms');
  box.innerHTML = '';
  Object.entries(PLATFORMS).forEach(([key, p]) => {
    const b = document.createElement('button');
    b.textContent = p.label;
    b.setAttribute('role', 'tab');
    b.onclick = () => { view.platform = key; refreshPlatform(); };
    b.dataset.key = key;
    box.appendChild(b);
  });
  $('safeChk').onchange = (e) => { view.showSafe = e.target.checked; drawOverlay(); };
  $('keepSafeChk').onchange = (e) => { view.keepSafe = e.target.checked; drawFrame(); };
  refreshPlatform();
}

function refreshPlatform() {
  [...$('platforms').children].forEach((b) => {
    const on = b.dataset.key === view.platform;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', String(on));
  });
  $('safeRow').style.display = view.platform === 'none' ? 'none' : 'flex';
  if (view.platform === 'none') { lastWarn = ''; $('safeWarn').hidden = true; }
  drawOverlay();
  drawFrame();
}

// --- tiny icon set (generic shapes, no brand logos) ---
const ICON = '#ffffff';
function shadowOn(c) { c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 10; c.shadowOffsetY = 2; }
function txt(c, s, x, y, { size = 34, weight = 600, align = 'left', color = ICON } = {}) {
  c.font = `${weight} ${size}px Poppins, system-ui, sans-serif`;
  c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = color;
  c.fillText(s, x, y);
  return c.measureText(s).width;
}
function heart(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y + s * 0.35);
  c.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.45, y - s * 0.85, x, y - s * 0.35);
  c.bezierCurveTo(x + s * 0.45, y - s * 0.85, x + s * 0.9, y - s * 0.25, x, y + s * 0.35);
  c.fill();
}
function bubble(c, x, y, s) {
  c.beginPath(); c.ellipse(x, y - s * 0.05, s * 0.55, s * 0.45, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(x - s * 0.3, y + s * 0.25); c.lineTo(x - s * 0.45, y + s * 0.55); c.lineTo(x - s * 0.02, y + s * 0.36); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.55)';
  [-0.22, 0, 0.22].forEach((d) => { c.beginPath(); c.arc(x + s * d, y - s * 0.05, s * 0.06, 0, Math.PI * 2); c.fill(); });
  c.fillStyle = ICON;
}
function shareArrow(c, x, y, s) {
  c.beginPath();
  c.moveTo(x + s * 0.55, y - s * 0.1);
  c.lineTo(x + s * 0.05, y - s * 0.55);
  c.lineTo(x + s * 0.05, y - s * 0.3);
  c.quadraticCurveTo(x - s * 0.6, y - s * 0.25, x - s * 0.55, y + s * 0.5);
  c.quadraticCurveTo(x - s * 0.3, y + s * 0.05, x + s * 0.05, y + s * 0.08);
  c.lineTo(x + s * 0.05, y + s * 0.35);
  c.closePath(); c.fill();
}
function plane(c, x, y, s) {
  c.lineWidth = s * 0.1; c.strokeStyle = ICON; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(x - s * 0.5, y - s * 0.4); c.lineTo(x + s * 0.5, y - s * 0.4); c.lineTo(x - s * 0.05, y + s * 0.5); c.lineTo(x - s * 0.15, y - s * 0.05); c.closePath(); c.stroke();
  c.beginPath(); c.moveTo(x - s * 0.15, y - s * 0.05); c.lineTo(x + s * 0.5, y - s * 0.4); c.stroke();
}
function bookmark(c, x, y, s) {
  c.beginPath(); c.moveTo(x - s * 0.35, y - s * 0.5); c.lineTo(x + s * 0.35, y - s * 0.5); c.lineTo(x + s * 0.35, y + s * 0.5);
  c.lineTo(x, y + s * 0.25); c.lineTo(x - s * 0.35, y + s * 0.5); c.closePath(); c.fill();
}
function thumb(c, x, y, s, down) {
  c.save(); c.translate(x, y); if (down) c.rotate(Math.PI);
  c.beginPath(); c.roundRect(-s * 0.5, -s * 0.05, s * 0.22, s * 0.55, s * 0.05); c.fill();
  c.beginPath(); c.moveTo(-s * 0.2, -s * 0.05); c.lineTo(-s * 0.02, -s * 0.5); c.quadraticCurveTo(s * 0.15, -s * 0.55, s * 0.1, -s * 0.15);
  c.lineTo(s * 0.45, -s * 0.15); c.quadraticCurveTo(s * 0.58, -s * 0.12, s * 0.5, s * 0.05); c.lineTo(s * 0.38, s * 0.5); c.lineTo(-s * 0.2, s * 0.5); c.closePath(); c.fill();
  c.restore();
}
function dots(c, x, y, s, vertical) {
  [-0.3, 0, 0.3].forEach((d) => { c.beginPath(); c.arc(vertical ? x : x + s * d, vertical ? y + s * d : y, s * 0.08, 0, Math.PI * 2); c.fill(); });
}
function remix(c, x, y, s) {
  c.lineWidth = s * 0.1; c.strokeStyle = ICON;
  c.beginPath(); c.arc(x, y, s * 0.38, 0.3, Math.PI * 1.7); c.stroke();
  c.beginPath(); c.arc(x, y, s * 0.15, 0, Math.PI * 2); c.fill();
}
function avatar(c, x, y, r, plus, color = '#ff3b5c') {
  c.fillStyle = '#9aa0b4'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#d7dae6'; c.beginPath(); c.arc(x, y - r * 0.2, r * 0.38, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(x, y + r * 0.62, r * 0.6, r * 0.42, 0, Math.PI, 0); c.fill();
  c.lineWidth = 4; c.strokeStyle = ICON; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
  if (plus) {
    c.fillStyle = color; c.beginPath(); c.arc(x, y + r, r * 0.38, 0, Math.PI * 2); c.fill();
    c.fillStyle = ICON; c.fillRect(x - r * 0.2, y + r - 3, r * 0.4, 6); c.fillRect(x - 3, y + r - r * 0.2, 6, r * 0.4);
  }
  c.fillStyle = ICON;
}
function disc(c, x, y, r) {
  c.fillStyle = '#222'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#9aa0b4'; c.beginPath(); c.arc(x, y, r * 0.5, 0, Math.PI * 2); c.fill();
  c.fillStyle = ICON;
}
function search(c, x, y, s) {
  c.lineWidth = s * 0.12; c.strokeStyle = ICON;
  c.beginPath(); c.arc(x - s * 0.08, y - s * 0.08, s * 0.32, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.moveTo(x + s * 0.16, y + s * 0.16); c.lineTo(x + s * 0.45, y + s * 0.45); c.stroke();
}
function camera(c, x, y, s) {
  c.lineWidth = s * 0.1; c.strokeStyle = ICON;
  c.beginPath(); c.roundRect(x - s * 0.5, y - s * 0.35, s, s * 0.75, s * 0.15); c.stroke();
  c.beginPath(); c.arc(x, y + s * 0.02, s * 0.2, 0, Math.PI * 2); c.stroke();
}
function pill(c, x, y, label, filled) {
  c.font = '700 30px Poppins, system-ui, sans-serif';
  const w = c.measureText(label).width + 44;
  c.lineWidth = 3; c.strokeStyle = ICON; c.fillStyle = filled ? ICON : 'transparent';
  c.beginPath(); c.roundRect(x, y - 30, w, 60, filled ? 30 : 14); filled ? c.fill() : c.stroke();
  txt(c, label, x + w / 2, y + 1, { size: 30, weight: 700, align: 'center', color: filled ? '#000' : ICON });
  return w;
}
function rail(c, x, items) {
  items.forEach(([y, draw, label]) => {
    c.fillStyle = ICON; shadowOn(c); draw(y);
    if (label) txt(c, label, x, y + 70, { size: 27, weight: 600, align: 'center' });
  });
}

function drawOverlay() {
  const c = octx;
  c.clearRect(0, 0, W, H);
  const p = view.platform;
  if (p === 'none') return;

  // App-style shading at top and bottom.
  let g = c.createLinearGradient(0, 0, 0, 280);
  g.addColorStop(0, 'rgba(0,0,0,0.4)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, 280);
  g = c.createLinearGradient(0, 1350, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
  c.fillStyle = g; c.fillRect(0, 1350, W, H - 1350);

  c.save();
  shadowOn(c);
  const R = 1005; // right rail centre
  if (p === 'tiktok') {
    txt(c, 'LIVE', 50, 125, { size: 30, weight: 800 });
    txt(c, 'Following', 430, 125, { size: 38, weight: 600, align: 'center', color: 'rgba(255,255,255,0.7)' });
    txt(c, 'For You', 660, 125, { size: 38, weight: 800, align: 'center' });
    c.fillStyle = ICON; c.fillRect(630, 160, 60, 6);
    search(c, 1010, 120, 56);
    avatar(c, R, 900, 50, true);
    rail(c, R, [
      [1060, (y) => heart(c, R, y, 82), '248K'],
      [1215, (y) => bubble(c, R, y, 80), '1,204'],
      [1365, (y) => bookmark(c, R, y, 64), '18.2K'],
      [1515, (y) => shareArrow(c, R, y, 74), '9,876'],
    ]);
    disc(c, R, 1680, 46);
    txt(c, '@yourname', 40, 1570, { size: 38, weight: 800 });
    txt(c, 'Your caption goes here… #fyp #viral', 40, 1630, { size: 33, weight: 500 });
    txt(c, '♫  original sound - yourname', 40, 1700, { size: 31, weight: 500 });
  } else if (p === 'shorts') {
    search(c, 880, 115, 56);
    c.fillStyle = ICON; dots(c, 1010, 115, 64, true);
    rail(c, R, [
      [1010, (y) => thumb(c, R, y, 70), '48K'],
      [1165, (y) => thumb(c, R, y, 70, true), 'Dislike'],
      [1320, (y) => bubble(c, R, y, 72), '1.2K'],
      [1475, (y) => shareArrow(c, R, y, 70), 'Share'],
      [1630, (y) => remix(c, R, y, 70), 'Remix'],
    ]);
    c.fillStyle = '#9aa0b4'; c.beginPath(); c.roundRect(R - 40, 1745, 80, 80, 14); c.fill();
    avatar(c, 75, 1620, 34);
    const nw1 = txt(c, '@yourname', 125, 1620, { size: 34, weight: 700 });
    shadowOn(c); pill(c, 125 + nw1 + 22, 1620, 'Subscribe', true);
    shadowOn(c);
    txt(c, 'Your Short title goes here', 40, 1710, { size: 34, weight: 500 });
  } else if (p === 'reels') {
    txt(c, 'Reels ⌄', 45, 130, { size: 46, weight: 800 });
    camera(c, 1010, 130, 64);
    rail(c, R, [
      [1180, (y) => heart(c, R, y, 78), '24.5K'],
      [1335, (y) => bubble(c, R, y, 76), '312'],
      [1490, (y) => plane(c, R, y, 66), '1.1K'],
    ]);
    c.fillStyle = ICON; dots(c, R, 1625, 64);
    c.lineWidth = 4; c.strokeStyle = ICON; c.fillStyle = '#9aa0b4';
    c.beginPath(); c.roundRect(R - 34, 1700, 68, 68, 12); c.fill(); c.stroke();
    avatar(c, 75, 1630, 36);
    const nw2 = txt(c, 'yourname', 128, 1630, { size: 34, weight: 700 });
    shadowOn(c); pill(c, 128 + nw2 + 22, 1630, 'Follow', false);
    shadowOn(c);
    txt(c, 'Your caption goes here… more', 40, 1715, { size: 32, weight: 500 });
    txt(c, '♫  yourname · Original audio', 40, 1780, { size: 30, weight: 500 });
  } else if (p === 'fbreels') {
    txt(c, 'Reels', 45, 130, { size: 46, weight: 800 });
    search(c, 900, 130, 56);
    avatar(c, 1010, 130, 32);
    rail(c, R, [
      [1150, (y) => thumb(c, R, y, 70), '12K'],
      [1305, (y) => bubble(c, R, y, 74), '845'],
      [1460, (y) => shareArrow(c, R, y, 70), '2.3K'],
    ]);
    c.fillStyle = ICON; dots(c, R, 1600, 64);
    avatar(c, 75, 1610, 36);
    const nw3 = txt(c, 'Your Page', 128, 1610, { size: 34, weight: 700 });
    shadowOn(c); pill(c, 128 + nw3 + 22, 1610, 'Follow', false);
    shadowOn(c);
    txt(c, 'Your caption goes here… See more', 40, 1700, { size: 32, weight: 500 });
    txt(c, '♫  Your Page · Original audio', 40, 1765, { size: 30, weight: 500 });
  }
  c.restore();

  // Safe zone: tint what the app covers, outline what stays clear.
  const s = safeRect();
  if (s && view.showSafe) {
    c.save();
    c.fillStyle = 'rgba(255,70,70,0.16)';
    c.beginPath(); c.rect(0, 0, W, H); c.rect(s.x, s.y, s.w, s.h); c.fill('evenodd');
    c.setLineDash([22, 14]); c.lineWidth = 5; c.strokeStyle = '#c6ff3d';
    c.strokeRect(s.x, s.y, s.w, s.h);
    c.setLineDash([]);
    c.fillStyle = '#c6ff3d';
    c.font = '800 28px Poppins, system-ui, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText('SAFE ZONE', s.x + 14, s.y + 12);
    c.restore();
  }
}

function drawCaptions(t) {
  const page = buildPages().find((p) => t >= p.start - 0.02 && t < p.end);
  if (!page) return;

  const box = captionBox();
  const maxW = box.w;
  let size = style.size * ((FONTS[style.font] || {}).scale || 1);
  const measure = () => {
    ctx.font = fontCss(style.font, size / ((FONTS[style.font] || {}).scale || 1));
    return page.words.map((w) => {
      const text = style.upper ? w.text.toUpperCase() : w.text;
      return { w, text, width: ctx.measureText(text).width };
    });
  };
  let items = measure();
  // A single long word wider than the caption area: shrink the text to fit.
  const widest = Math.max(...items.map((it) => it.width));
  if (widest > maxW) { size = Math.floor(size * (maxW / widest)); items = measure(); }
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const space = ctx.measureText(' ').width;

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
  const half = size * 0.62;
  let top = H * style.posY - ((lines.length - 1) * lineH) / 2;
  if (box.safe) {
    // Keep the whole caption block inside the platform's safe zone.
    const blockH = (lines.length - 1) * lineH;
    top = Math.max(box.yMin + half, Math.min(top, box.yMax - half - blockH));
  }
  const widths = lines.map((line) => line.reduce((a, it) => a + it.width, 0) + space * (line.length - 1));
  checkSafe({
    left: box.cx - Math.max(...widths) / 2, right: box.cx + Math.max(...widths) / 2,
    top: top - half, bottom: top + (lines.length - 1) * lineH + half,
  });

  // Active word = the one being spoken, or the last spoken one during a pause.
  let active = null;
  for (const it of items) if (t >= it.w.start) active = it;

  // Right-to-left languages (Arabic, Hebrew…): place words from right to left.
  const rtl = items.some((it) => RTL.test(it.text));
  lines.forEach((line, li) => {
    let x = box.cx - widths[li] / 2;
    const y = top + li * lineH;
    for (const it of (rtl ? [...line].reverse() : line)) {
      drawWord(it, x, y, t, it === active, size);
      x += it.width + space;
    }
  });

  // Emoji of the latest spoken word on this caption that has one. An emoji stays
  // at least EMOJI_HOLD seconds, even if the caption has already moved on.
  let ew = null;
  for (const it of items) if (t >= it.w.start && wordEmoji(it.w)) ew = it.w;
  if (!ew) {
    const c = clips[current];
    for (const w of words) {
      if (w.start > t) break;
      if (t - w.start < EMOJI_HOLD && (!c || w.start >= c.start - 0.05) && wordEmoji(w)) ew = w;
    }
  }
  if (ew) {
    const es = emo.size;
    let ey = emo.pos === 'below'
      ? top + (lines.length - 1) * lineH + half + es * 0.62
      : top - half - es * 0.62;
    if (box.safe) ey = Math.max(box.yMin + es * 0.55, Math.min(ey, box.yMax - es * 0.55));
    drawEmoji(wordEmoji(ew), box.cx, ey, t - ew.start, es);
  }
}

const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
const EMOJI_HOLD = 1.3;

function drawEmoji(e, x, y, since, size) {
  let scale = 1, rot = 0, dy = 0, alpha = 1;
  const p = clamp01(since / 0.28);
  switch (emo.anim) {
    case 'pop': scale = easeOutBack(p); alpha = clamp01(since / 0.1); break;
    case 'bounce': scale = easeOutBack(p); dy = -Math.abs(Math.sin(since * 5.5)) * size * 0.22; break;
    case 'spin': scale = easeOutBack(p); rot = (1 - easeOutCubic(clamp01(since / 0.55))) * Math.PI * 2; break;
    case 'float': alpha = clamp01(since / 0.2); dy = (1 - easeOutCubic(clamp01(since / 0.45))) * size * 0.6 + Math.sin(since * 3) * size * 0.06; break;
    case 'shake': scale = easeOutBack(p); rot = Math.sin(since * 28) * 0.28 * Math.max(0.15, 1 - since / 0.8); break;
    case 'pulse': scale = easeOutBack(p) * (1 + 0.1 * Math.sin(since * 9)); break;
    default: break;
  }
  if (scale <= 0.01 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y + dy);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.04;
  ctx.fillText(e, 0, 0);
  ctx.restore();
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
  } else if (anim === 'slide') {
    if (!spoken) return;
    const p = clamp01(since / 0.22);
    dy = (1 - easeOutCubic(p)) * size * 0.55;
    alpha = p;
    if (isActive) fill = accent;
  } else if (anim === 'typewriter') {
    if (!spoken) return;
    if (isActive) fill = accent;
  } else if (anim === 'glow') {
    if (!spoken) alpha = 0.55;
    if (isActive) fill = accent;
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
  ctx.textAlign = 'left';
  let txt = it.text;
  if (anim === 'typewriter') {
    // Reveal the word letter by letter while it's being spoken.
    const chars = [...txt];
    const dur = Math.max(0.12, Math.min(0.45, it.w.end - it.w.start));
    txt = chars.slice(0, Math.max(1, Math.ceil(chars.length * clamp01(since / dur)))).join('');
  }
  if (anim !== 'box' || !isActive) ctx.strokeText(txt, lx, 0);
  ctx.shadowColor = 'transparent';

  if (anim === 'glow' && isActive) {
    ctx.shadowColor = accent;
    ctx.shadowBlur = size * 0.55;
    ctx.fillStyle = fill;
    ctx.fillText(txt, lx, 0);
    ctx.shadowBlur = size * 0.25;
  }
  ctx.fillStyle = fill;
  ctx.fillText(txt, lx, 0);
  ctx.shadowColor = 'transparent';

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
    video.currentTime = Math.max(0, t - tOff);
  });
}

function loop(onEnd) {
  const c = clips[current];
  drawFrame();
  if (now() >= c.end || video.ended) { video.pause(); onEnd(); return; }
  if (playing || exporting) requestAnimationFrame(() => loop(onEnd));
}

$('playBtn').onclick = async () => {
  if (exporting) return;
  if (playing) { stopPreview(); return; }
  if (!mediaReady()) return;
  ensureAudioGraph();
  await audioCtx.resume();
  monitorGain.gain.value = 1;
  const c = clips[current];
  if (now() < c.start || now() >= c.end - 0.1) await seekPreview(c.start);
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
  const label0 = $('exportBtn');
  label0.disabled = true;
  label0.textContent = 'Preparing…';
  const ok = await selectClip(index);
  label0.disabled = false;
  label0.textContent = 'Export clip';
  if (!ok) { alert('This clip is not ready yet or could not be prepared. Please try again.'); return; }
  ensureAudioGraph();
  await audioCtx.resume();
  await document.fonts.load(fontCss(style.font, 80));
  await document.fonts.load(`80px ${EMOJI_FONT}`, clipWords(clips[index]).map(wordEmoji).join('') || '🔥');

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
    const p = clamp01((now() - c.start) / (c.end - c.start));
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
    file = f; mode = 'file'; $('hero').style.display = 'none'; document.body.classList.add('working');
    fileURL = URL.createObjectURL(f);
    await setSource(fileURL, 0);
    sourceDuration = video.duration;
    words = cleanWords(ws);
    refreshAutoEmojis();
    clips = cl || (await pickClips(words, sourceDuration));
    showWorkspace();
  },
  style, emo, exportClip, refreshAutoEmojis, words: () => words,
  state: () => ({ mode, tOff, current, media: media.map((m) => m && { start: m.start, end: m.end, ready: m.ready, failed: m.failed }), clips }),
};

// Link box help text depends on whether the download server is configured.
if (SERVER) {
  $('linkHelp').textContent = 'Paste a YouTube, Twitch, Kick or direct video link. Only the parts you clip are downloaded. Only use videos you own or have permission to clip.';
  $('linkInput').placeholder = 'Paste a YouTube, Twitch or video link';
}
