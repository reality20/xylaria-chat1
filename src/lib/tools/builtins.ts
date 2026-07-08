import type { Tool } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// CORS-proxy helpers — used for endpoints that don't expose CORS headers.
// AllOrigins is a free public proxy that mirrors the upstream response and
// returns it with permissive CORS headers.
// ─────────────────────────────────────────────────────────────────────────────
const CORS_PROXIES = [
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u: string) => `https://thingproxy.freeboard.io/fetch/${u}`,
];

async function fetchViaProxy(url: string, init?: RequestInit): Promise<Response> {
  // Try direct first (works for CORS-enabled APIs like Wikipedia)
  try {
    const direct = await fetch(url, init);
    if (direct.ok) return direct;
  } catch { /* fall through to proxies */ }
  for (const wrap of CORS_PROXIES) {
    try {
      const r = await fetch(wrap(url), init);
      if (r.ok) return r;
    } catch { /* try next */ }
  }
  throw new Error(`All fetch attempts failed for ${url}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Calculator
// ─────────────────────────────────────────────────────────────────────────────
export const calculator: Tool = {
  name: 'calculator',
  description: 'Evaluate mathematical expressions. Supports +, -, *, /, ** (power), sqrt, sin, cos, tan, log, ln, abs, pi, e.',
  parameters: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: 'Math expression like "(4+5)*2" or "sqrt(16)+sin(pi/2)"' },
    },
    required: ['expression'],
  },
  execute: ({ expression }) => {
    try {
      const sanitized = String(expression)
        .replace(/[^0-9+\-*/().\s^%,piexpEPIsqrtloglnsincostanabsroundfloorceil]/gi, '')
        .replace(/\^/g, '**')
        .replace(/\b(sqrt|log|ln|sin|cos|tan|abs|round|floor|ceil)\(/gi, 'Math.$1(')
        .replace(/\bpi\b/gi, 'Math.PI')
        .replace(/\be(?![xp])/gi, 'Math.E')
        .replace(/%/g, '/100');
      const result = Function(`"use strict"; return (${sanitized})`)();
      return { result: Number(Number(result).toPrecision(10)).toString() };
    } catch {
      return { error: 'Invalid expression. Use standard math notation.' };
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Weather (Open-Meteo — CORS-enabled, no key)
// ─────────────────────────────────────────────────────────────────────────────
export const weather: Tool = {
  name: 'weather',
  description: 'Get current weather for any city using Open-Meteo (free, no API key).',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name, e.g. "London" or "Tokyo, Japan"' },
    },
    required: ['location'],
  },
  execute: async ({ location }) => {
    try {
      const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(String(location))}&count=1`).then(r => r.json());
      if (!geo.results?.[0]) return { error: `Location not found: ${location}` };
      const { latitude, longitude, name, country } = geo.results[0];
      const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation&daily=temperature_2m_max,temperature_2m_min&timezone=auto`).then(r => r.json());
      const codes: Record<number, string> = {
        0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Foggy',48:'Rime fog',
        51:'Light drizzle',53:'Moderate drizzle',55:'Dense drizzle',61:'Slight rain',63:'Moderate rain',
        65:'Heavy rain',71:'Slight snow',73:'Moderate snow',75:'Heavy snow',80:'Rain showers',
        81:'Moderate showers',82:'Violent showers',95:'Thunderstorm',96:'Thunderstorm with hail',
      };
      return {
        location: `${name}, ${country}`,
        temperature: `${w.current.temperature_2m}${w.current_units.temperature_2m}`,
        feelsLike: `${w.current.apparent_temperature}${w.current_units.apparent_temperature}`,
        humidity: `${w.current.relative_humidity_2m}%`,
        condition: codes[w.current.weather_code] || 'Unknown',
        wind: `${w.current.wind_speed_10m} km/h`,
        precipitation: `${w.current.precipitation} mm`,
        high: `${w.daily.temperature_2m_max[0]}${w.daily_units.temperature_2m_max}`,
        low: `${w.daily.temperature_2m_min[0]}${w.daily_units.temperature_2m_min}`,
      };
    } catch { return { error: 'Failed to fetch weather' }; }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Web search — uses Wikipedia REST + DuckDuckGo Instant Answer + proxy fallback
// ─────────────────────────────────────────────────────────────────────────────
export const webSearch: Tool = {
  name: 'web_search',
  description: 'Search the web. Returns title, snippet, and URL for each result. Combines Wikipedia, DuckDuckGo Instant Answers, and a Bing/HTML fallback through a CORS proxy.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      num_results: { type: 'number', description: 'Number of results 1-10, default 6' },
    },
    required: ['query'],
  },
  execute: async ({ query, num_results }) => {
    const q = String(query);
    const count = Math.min(Math.max(Number(num_results) || 6, 1), 10);
    const results: Array<{ title: string; snippet: string; url: string; source: string }> = [];
    const headers = { 'User-Agent': 'XylariaBot/1.0 (https://github.com/reality20/xylaria-chat1)' };

    // (a) Wikipedia Action API — CORS-enabled, returns JSON.
    try {
      const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=3&origin=*`,
        { headers }
      ).then(r => r.json());
      for (const page of (searchRes.query?.search || []).slice(0, 2)) {
        if (results.length >= count) break;
        const p = page as { title: string; snippet: string; pageid: number };
        try {
          const summary = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
            { headers }
          ).then(r => r.json());
          if (summary.extract) {
            results.push({
              title: summary.title || p.title,
              snippet: summary.extract.slice(0, 280),
              url: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title)}`,
              source: 'Wikipedia',
            });
          }
        } catch { /* skip individual page */ }
      }
    } catch { /* Wikipedia unavailable */ }

    // (b) DuckDuckGo Instant Answer API (CORS-enabled)
    try {
      const ddg = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`).then(r => r.json());
      if (ddg.AbstractText) {
        results.push({
          title: ddg.Heading || q,
          snippet: ddg.AbstractText,
          url: ddg.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
          source: 'DuckDuckGo',
        });
      }
      for (const topic of (ddg.RelatedTopics || []).slice(0, 4)) {
        if (results.length >= count) break;
        const t = topic as { Text?: string; FirstURL?: string };
        if (t.Text && t.FirstURL) {
          results.push({ title: t.Text.split(' - ')[0], snippet: t.Text.slice(0, 220), url: t.FirstURL, source: 'DuckDuckGo' });
        }
      }
    } catch { /* DDG unavailable */ }

    // (c) HTML search via CORS proxy (Bing) — fills remaining slots
    if (results.length < count) {
      try {
        const res = await fetchViaProxy(`https://www.bing.com/search?q=${encodeURIComponent(q)}&count=${count * 2}`);
        const html = await res.text();
        const re = /<li class="b_algo">[\s\S]*?<h2><a href="(http[^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(html)) !== null && results.length < count) {
          const title = m[2].replace(/<[^>]*>/g, '').trim();
          const snippet = m[3].replace(/<[^>]*>/g, '').trim().slice(0, 220);
          if (title && !results.some(r => r.url === m![1])) {
            results.push({ title, snippet, url: m[1], source: 'Bing' });
          }
        }
      } catch { /* proxy failed */ }
    }

    if (results.length === 0) return { query: q, results: 'No results found. Try a different query.' };
    return {
      query: q,
      count: results.length,
      results: results.map((r, i) => `${i + 1}. [${r.source}] ${r.title}\n${r.snippet}\n${r.url}`).join('\n\n'),
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Image search — uses Wikipedia image API + Openverse (CORS-enabled)
// ─────────────────────────────────────────────────────────────────────────────
export const imageSearch: Tool = {
  name: 'image_search',
  description: 'Search for images. Returns direct image URLs with titles. Uses Openverse and Wikipedia (CORS-enabled).',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Image search query, e.g. "cute cats"' },
      num_results: { type: 'number', description: 'Number of images 1-8, default 4' },
    },
    required: ['query'],
  },
  execute: async ({ query, num_results }) => {
    const q = String(query);
    const count = Math.min(Math.max(Number(num_results) || 4, 1), 8);
    const images: Array<{ url: string; title: string; source: string }> = [];

    // (a) Openverse API (CORS-enabled, free, no key)
    try {
      const ov = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=${count}&mature=false`).then(r => r.json());
      for (const r of (ov.results || []).slice(0, count)) {
        images.push({ url: r.url, title: r.title || q, source: 'Openverse' });
      }
    } catch { /* Openverse unavailable */ }

    // (b) Wikimedia Commons API (CORS-enabled)
    if (images.length < count) {
      try {
        const wm = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(q)}&gsrlimit=${count}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&origin=*`).then(r => r.json());
        const pages = wm.query?.pages || {};
        for (const key of Object.keys(pages)) {
          if (images.length >= count) break;
          const info = pages[key].imageinfo?.[0];
          if (info?.url || info?.thumburl) {
            images.push({ url: info.thumburl || info.url, title: pages[key].title.replace(/^File:/, ''), source: 'Wikimedia' });
          }
        }
      } catch { /* Wikimedia unavailable */ }
    }

    // (c) Lorem Picsum fallback (random images, not query-related, but always works)
    if (images.length === 0) {
      for (let i = 0; i < Math.min(count, 4); i++) {
        images.push({ url: `https://picsum.photos/seed/${encodeURIComponent(q)}${i}/800/600`, title: `${q} (placeholder)`, source: 'Picsum' });
      }
    }

    if (images.length === 0) return { query: q, images: 'No images found. Try a different query.' };
    return {
      query: q,
      count: images.length,
      images: images.map((img) => `![${img.title}](${img.url})`).join('\n'),
      image_urls: images.map((img) => img.url),
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. Fetch URL — extract readable text from any web page
// ─────────────────────────────────────────────────────────────────────────────
export const fetchUrl: Tool = {
  name: 'fetch_url',
  description: 'Fetch and extract text content from a URL. Strips HTML, scripts, styles. Returns up to 8000 chars.',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'URL to fetch' },
    },
    required: ['url'],
  },
  execute: async ({ url }) => {
    try {
      const res = await fetchViaProxy(String(url), { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      // Strip scripts, styles, and HTML tags. Try to preserve article text.
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 8000);
      return { url, content: text, chars: text.length };
    } catch { return { error: `Failed to fetch ${url}` }; }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. Date/time
// ─────────────────────────────────────────────────────────────────────────────
export const datetime: Tool = {
  name: 'datetime',
  description: 'Get current date and time in any timezone.',
  parameters: {
    type: 'object',
    properties: {
      timezone: { type: 'string', description: 'IANA timezone like "America/New_York" or "UTC"' },
    },
    required: [],
  },
  execute: ({ timezone }) => {
    const now = new Date();
    const tz = timezone ? String(timezone) : undefined;
    return {
      iso: now.toISOString(),
      local: now.toLocaleString('en-US', { timeZone: tz, dateStyle: 'full', timeStyle: 'long' }),
      timezone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. Unit conversion
// ─────────────────────────────────────────────────────────────────────────────
export const convert: Tool = {
  name: 'convert',
  description: 'Convert between units (length, mass, temperature, time, data).',
  parameters: {
    type: 'object',
    properties: {
      value: { type: 'number', description: 'Value to convert' },
      from: { type: 'string', description: 'Source unit (m, km, kg, lb, c, f, s, min, h, mb, gb, etc)' },
      to: { type: 'string', description: 'Target unit' },
    },
    required: ['value', 'from', 'to'],
  },
  execute: ({ value, from, to }) => {
    const v = Number(value);
    const f = String(from).toLowerCase();
    const t = String(to).toLowerCase();
    const c: Record<string, Record<string, number>> = {
      m: { km: 0.001, cm: 100, mm: 1000, ft: 3.28084, in: 39.3701, mi: 0.000621371, yd: 1.09361 },
      km: { m: 1000, mi: 0.621371 }, ft: { m: 0.3048 }, mi: { km: 1.60934 },
      kg: { g: 1000, lb: 2.20462, oz: 35.274 }, lb: { kg: 0.453592 },
      s: { min: 1 / 60, h: 1 / 3600 }, min: { s: 60, h: 1 / 60 }, h: { s: 3600, min: 60 },
      mb: { kb: 1024, gb: 1 / 1024 }, gb: { mb: 1024, kb: 1048576, tb: 1 / 1024 }, tb: { gb: 1024 },
    };
    if (f === 'c' && t === 'f') return { result: `${(v * 9 / 5 + 32).toFixed(2)} F` };
    if (f === 'f' && t === 'c') return { result: `${((v - 32) * 5 / 9).toFixed(2)} C` };
    if (f === 'c' && t === 'k') return { result: `${(v + 273.15).toFixed(2)} K` };
    if (f === 'k' && t === 'c') return { result: `${(v - 273.15).toFixed(2)} C` };
    const conv = c[f]?.[t];
    if (conv) return { result: `${(v * conv).toFixed(4).replace(/\.?0+$/, '')} ${t}` };
    return { error: `Cannot convert ${f} to ${t}` };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. Text analysis
// ─────────────────────────────────────────────────────────────────────────────
export const analyzeText: Tool = {
  name: 'analyze_text',
  description: 'Analyze text: word count, reading time, readability, keyword extraction.',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Text to analyze' },
      mode: { type: 'string', description: 'Mode: stats, keywords, readability', enum: ['stats', 'keywords', 'readability'] },
    },
    required: ['text', 'mode'],
  },
  execute: ({ text, mode }) => {
    const t = String(text);
    const words = t.trim().split(/\s+/).filter(Boolean);
    const sentences = t.split(/[.!?]+/).filter(Boolean);
    switch (mode) {
      case 'stats':
        return {
          characters: t.length, words: words.length, sentences: sentences.length,
          paragraphs: t.split('\n\n').filter(Boolean).length,
          readingTime: `${Math.ceil(words.length / 200)} min`,
        };
      case 'keywords': {
        const freq: Record<string, number> = {};
        const stop = new Set(['the','and','for','are','but','not','you','all','can','had','her','was','one','our','out','day','get','has','him','his','how','its','may','new','now','old','see','two','who','boy','did','she','use','her','way','many','oil','sit','set','run','eat','far','sea','eye','ago','off','too','any','say','man','try','ask','end','why','let','put','far','set','old','try','way','too','also','this','that','with','have','from','they','been','were','said','each','which','their','time','would','there','could','other','after','first','never','these','think','where','being','every','great','might','shall']);
        for (const w of words) { const lw = w.toLowerCase().replace(/[^a-z]/g, ''); if (lw.length > 3 && !stop.has(lw)) freq[lw] = (freq[lw] || 0) + 1; }
        return { keywords: Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([w, c]) => `${w} (${c})`) };
      }
      case 'readability': {
        const syllables = words.reduce((s, w) => { const m = w.toLowerCase().match(/[aeiouy]{1,2}/g); return s + (m ? m.length : 1); }, 0);
        const flesch = 206.835 - 1.015 * (words.length / Math.max(sentences.length, 1)) - 84.6 * (syllables / Math.max(words.length, 1));
        return { fleschReadingEase: flesch.toFixed(1), grade: (0.39 * (words.length / Math.max(sentences.length, 1)) + 11.8 * (syllables / Math.max(words.length, 1)) - 15.59).toFixed(1), level: flesch >= 90 ? 'Very Easy' : flesch >= 70 ? 'Easy' : flesch >= 50 ? 'Fairly Difficult' : 'Difficult' };
      }
      default: return { error: 'Unknown mode' };
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. Memory store / 10. Memory retrieve
// ─────────────────────────────────────────────────────────────────────────────
export const memoryStore: Tool = {
  name: 'memory_store',
  description: 'Store a key-value pair in persistent memory. Use this to remember user preferences, facts, or context across conversations.',
  parameters: {
    type: 'object',
    properties: {
      key: { type: 'string', description: 'Unique key (e.g. "user_name", "preferred_language")' },
      value: { type: 'string', description: 'Value to store' },
    },
    required: ['key', 'value'],
  },
  execute: ({ key, value }) => {
    try {
      const data = JSON.parse(localStorage.getItem('xylaria-memory') || '{}');
      data[String(key)] = { value: String(value), timestamp: Date.now() };
      localStorage.setItem('xylaria-memory', JSON.stringify(data));
      return { success: true, key: String(key), message: `Stored: "${key}" = "${value}"` };
    } catch { return { error: 'Failed to store memory' }; }
  },
};

export const memoryRetrieve: Tool = {
  name: 'memory_retrieve',
  description: 'Retrieve stored memories. Leave key empty to list all.',
  parameters: {
    type: 'object',
    properties: {
      key: { type: 'string', description: 'Key to retrieve. Empty = list all.' },
    },
    required: [],
  },
  execute: ({ key }) => {
    try {
      const data = JSON.parse(localStorage.getItem('xylaria-memory') || '{}');
      if (key) return data[String(key)] ? { key, value: data[String(key)].value } : { error: `No memory for "${key}"` };
      return { memories: Object.entries(data).map(([k, v]) => ({ key: k, ...(v as Record<string, unknown>) })) };
    } catch { return { error: 'Failed to retrieve' }; }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 11. Iris v1.5 — Image generator (FLUX.2-Klein-Multi-LoRA via HF Space Gradio API)
// ─────────────────────────────────────────────────────────────────────────────
const IRIS_SPACE = 'https://m3st3rj4k3l-flux-2-klein-multi-lora.hf.space';

// 1×1 white PNG (base64). Used as a placeholder base image — the FLUX model
// requires a base image even for text-only generation. The blank pixel is
// discarded by the model; only the prompt drives the output.
const BLANK_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

async function uploadBlankBaseImage(): Promise<{ path: string; url: string }> {
  // Decode base64 → Blob → upload via Gradio's /upload endpoint.
  const byteChars = atob(BLANK_PNG_B64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'image/png' });
  const form = new FormData();
  form.append('files', blob, 'blank.png');
  const res = await fetch(`${IRIS_SPACE}/gradio_api/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Iris upload failed: HTTP ${res.status}`);
  const paths = await res.json() as string[];
  if (!paths[0]) throw new Error('Iris upload: no path returned');
  return { path: paths[0], url: `${IRIS_SPACE}/gradio_api/file=${paths[0]}` };
}

async function irisGenerate(prompt: string, opts: {
  width?: number; height?: number; steps?: number; guidance?: number;
  seed?: number; batch?: number;
}): Promise<{ images: string[]; seed: number; params: Record<string, unknown> }> {
  const width = opts.width ?? 1024;
  const height = opts.height ?? 1024;
  const steps = Math.min(Math.max(opts.steps ?? 24, 1), 50);
  const guidance = opts.guidance ?? 3.5;
  const seed = opts.seed ?? Math.floor(Math.random() * 2_147_483_647);
  const batch = Math.min(Math.max(opts.batch ?? 1, 1), 4);

  // Upload a 1×1 blank base image (the FLUX Gradio requires it).
  const base = await uploadBlankBaseImage();
  const baseImageObj = {
    path: base.path,
    url: base.url,
    orig_name: 'blank.png',
    mime_type: 'image/png',
  };

  // The Gradio API for /infer has 27 positional parameters (see MCP docs).
  const data = [
    baseImageObj,                           // 0: base_image (ImageData)
    [],                                     // 1: reference_images (Gallery — empty list)
    prompt,                                 // 2: prompt
    '',                                     // 3: lora_prompt_text
    '',                                     // 4: custom_prompt_text
    [],                                     // 5: selected_titles (no LoRAs)
    seed,                                   // 6: seed
    false,                                  // 7: randomize_seed
    guidance,                               // 8: guidance_scale
    steps,                                  // 9: steps
    'None',                                 // 10: upscale_factor
    'Custom',                               // 11: canvas_mode ('Auto (from base image)' or 'Custom')
    width,                                  // 12: custom_width
    height,                                 // 13: custom_height
    'Stretch',                              // 14: canvas_fit_mode ('Stretch'|'Pad (color)'|'Pad (blur)'|'Crop (cover)')
    '#000000',                              // 15: pad_color
    batch,                                  // 16: batch_count
    'Random seed each run',                 // 17: batch_vary ('Random seed each run'|'Sequential seed (+1 each)'|'Sweep first LoRA weight')
    0.0,                                    // 18: sweep_min
    1.0,                                    // 19: sweep_max
    null,                                   // 20: state (internal Gradio State)
    0.0, 0.0, 0.0, 0.0, 0.0, 0.0,           // 21-26: 6 LoRA weight slots (0.0–2.0)
  ];

  // Step 1: POST /gradio_api/call/infer to start the job.
  const startRes = await fetch(`${IRIS_SPACE}/gradio_api/call/infer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  if (!startRes.ok) throw new Error(`Iris start failed: HTTP ${startRes.status}`);
  const { event_id } = await startRes.json();
  if (!event_id) throw new Error('Iris: no event_id returned');

  // Step 2: SSE stream — GET /gradio_api/call/infer/{event_id}.
  const streamRes = await fetch(`${IRIS_SPACE}/gradio_api/call/infer/${event_id}`, {
    headers: { 'Accept': 'text/event-stream' },
  });
  if (!streamRes.ok || !streamRes.body) throw new Error(`Iris stream failed: HTTP ${streamRes.status}`);

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let resultData: unknown = null;
  let streamError: string | null = null;

  // Read SSE events until we get a `complete` event (timeout after 240s).
  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    for (const evt of events) {
      const lines = evt.split('\n');
      let evtType = '';
      let evtData = '';
      for (const ln of lines) {
        if (ln.startsWith('event:')) evtType = ln.slice(6).trim();
        else if (ln.startsWith('data:')) evtData += ln.slice(5).trim();
      }
      if (evtType === 'complete') {
        try { resultData = JSON.parse(evtData); } catch { resultData = evtData; }
      } else if (evtType === 'error') {
        streamError = evtData;
      }
    }
  }
  reader.releaseLock();

  if (streamError) throw new Error(`Iris stream error: ${streamError}`);

  // The `complete` event payload is an array: [images_array, status_string].
  // - images_array is a list of ImageData objects: { url, path, orig_name, ... }
  // - status_string may contain "Batch X/Y failed: '...'" on GPU quota errors.
  const arr = Array.isArray(resultData) ? resultData as unknown[] : [];
  const imageItems = Array.isArray(arr[0]) ? arr[0] as unknown[] : [];
  const statusStr = typeof arr[1] === 'string' ? arr[1] as string : '';

  // Detect quota/runtime errors in the status string.
  if (imageItems.length === 0 && statusStr) {
    throw new Error(`Iris: ${statusStr}`);
  }

  const images: string[] = [];
  for (const item of imageItems) {
    const f = item as { url?: string; path?: string; image?: { url?: string }; orig_name?: string };
    const url = f?.url || f?.image?.url || (f?.path ? `${IRIS_SPACE}/gradio_api/file=${f.path}` : null);
    if (url) images.push(url);
  }
  if (images.length === 0) throw new Error(`Iris: no image returned. Status: ${statusStr || 'unknown'}`);
  return { images, seed, params: { width, height, steps, guidance, batch } };
}

export const irisImageGen: Tool = {
  name: 'iris_image_gen',
  description: 'Generate images from text prompts using the Iris v1.5 model (FLUX.2-Klein-Multi-LoRA). Returns one or more image URLs. Best for: illustrations, concept art, photos, designs. Aspect ratios via width/height. Note: the free HF Space may run out of GPU quota — retry after a minute if you get a quota error.',
  parameters: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'Image description. Detailed prompts yield better results, e.g. "a serene mountain lake at dawn, fog rising, cinematic lighting, ultra-detailed".' },
      width: { type: 'number', description: 'Image width in px (256-1536). Default 1024.' },
      height: { type: 'number', description: 'Image height in px (256-1536). Default 1024.' },
      steps: { type: 'number', description: 'Inference steps 1-50. More = better quality, slower. Default 24.' },
      guidance: { type: 'number', description: 'CFG guidance scale 1-20. Higher = closer to prompt. Default 3.5.' },
      seed: { type: 'number', description: 'Reproducibility seed. Omit for random.' },
      batch: { type: 'number', description: 'Number of images to generate 1-4. Default 1.' },
    },
    required: ['prompt'],
  },
  execute: async ({ prompt, width, height, steps, guidance, seed, batch }) => {
    try {
      const result = await irisGenerate(String(prompt), {
        width: width ? Number(width) : undefined,
        height: height ? Number(height) : undefined,
        steps: steps ? Number(steps) : undefined,
        guidance: guidance ? Number(guidance) : undefined,
        seed: seed ? Number(seed) : undefined,
        batch: batch ? Number(batch) : undefined,
      });
      return {
        model: 'Iris v1.5',
        prompt: String(prompt),
        seed: result.seed,
        params: result.params,
        count: result.images.length,
        image_urls: result.images,
        // Markdown-renderable result for the chat
        images: result.images.map((u, i) => `![Iris v1.5 image ${i + 1}](${u})`).join('\n'),
      };
    } catch (err) {
      return { error: `Iris v1.5 failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 12. SVG artifact generator — emits a structured artifact for the canvas
// ─────────────────────────────────────────────────────────────────────────────
export const svgGenerator: Tool = {
  name: 'svg_generator',
  description: 'Render a Scalable Vector Graphic (SVG) from a description. Returns an artifact that opens in the artifact viewer (ChatGPT-style). Use for diagrams, icons, illustrations, charts, logos.',
  parameters: {
    type: 'object',
    properties: {
      description: { type: 'string', description: 'What the SVG should depict.' },
      svg_code: { type: 'string', description: 'Raw SVG markup (root <svg> element). Required.' },
      title: { type: 'string', description: 'Title for the artifact.' },
    },
    required: ['description', 'svg_code'],
  },
  execute: ({ description, svg_code, title }) => {
    // The caller wraps this in an artifact JSON block (see registry.ts)
    return {
      artifact: {
        type: 'svg',
        title: String(title || `SVG: ${String(description).slice(0, 40)}`),
        content: String(svg_code),
        language: 'svg',
      },
      description: String(description),
      note: 'An SVG artifact has been generated and will open in the artifact viewer.',
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// All built-in tools
// ─────────────────────────────────────────────────────────────────────────────
export const BUILTIN_TOOLS: Tool[] = [
  calculator, weather, webSearch, imageSearch, fetchUrl, datetime, convert,
  analyzeText, memoryStore, memoryRetrieve,
  irisImageGen,  // Iris v1.5 image generator
  svgGenerator,  // SVG artifact generator
];
