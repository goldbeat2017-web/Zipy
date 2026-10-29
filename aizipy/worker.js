// Aizipy transcription worker — runs Whisper inside the visitor's browser.
// Uses the GPU (WebGPU) when available, otherwise the CPU (WebAssembly).
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';

env.allowLocalModels = false;

const MODEL = 'onnx-community/whisper-base_timestamped';
const SAMPLE_RATE = 16000;
const CHUNK_SECONDS = 30;

let asr = null;
let device = 'wasm';

async function loadModel() {
  if (asr) return;
  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) device = 'webgpu';
    } catch { /* fall back to CPU */ }
  }
  const files = {};
  asr = await pipeline('automatic-speech-recognition', MODEL, {
    device,
    dtype: device === 'webgpu'
      ? { encoder_model: 'fp32', decoder_model_merged: 'q4' }
      : 'q8',
    progress_callback: (p) => {
      if (p.status === 'progress' && p.total) {
        files[p.file] = { loaded: p.loaded, total: p.total };
        const all = Object.values(files);
        const loaded = all.reduce((a, f) => a + f.loaded, 0);
        const total = all.reduce((a, f) => a + f.total, 0);
        self.postMessage({ type: 'download', progress: loaded / total });
      }
    },
  });
  self.postMessage({ type: 'ready', device });
}

// Split audio into ~30s pieces, cutting at the quietest moment near each boundary
// so words are not chopped in half.
function splitAudio(audio) {
  const pieces = [];
  const target = CHUNK_SECONDS * SAMPLE_RATE;
  const search = 4 * SAMPLE_RATE;
  const win = Math.floor(0.1 * SAMPLE_RATE);
  let start = 0;
  while (start < audio.length) {
    let end = Math.min(start + target, audio.length);
    if (end < audio.length) {
      let best = end, bestEnergy = Infinity;
      for (let s = end - search; s + win <= end; s += win) {
        let e = 0;
        for (let i = s; i < s + win; i++) e += audio[i] * audio[i];
        if (e < bestEnergy) { bestEnergy = e; best = s + win / 2; }
      }
      end = Math.floor(best);
    }
    pieces.push({ offset: start / SAMPLE_RATE, data: audio.subarray(start, end) });
    start = end;
  }
  return pieces;
}

self.onmessage = async (e) => {
  try {
    await loadModel();
    const pieces = splitAudio(e.data.audio);
    const words = [];
    let language = null;
    for (let i = 0; i < pieces.length; i++) {
      const { offset, data } = pieces[i];
      if (data.length < SAMPLE_RATE * 0.5) continue;
      const out = await asr(data, { return_timestamps: 'word' });
      for (const c of out.chunks || []) {
        const text = (c.text || '').trim();
        if (!text) continue;
        const [s, en] = c.timestamp;
        const start = offset + (s ?? 0);
        const end = offset + (en ?? s ?? 0);
        words.push({ text, start, end: Math.max(end, start + 0.05) });
      }
      self.postMessage({ type: 'progress', progress: (i + 1) / pieces.length, words });
    }
    self.postMessage({ type: 'done', words, language });
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err && err.message || err) });
  }
};
