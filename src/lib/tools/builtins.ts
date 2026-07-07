import type { Tool } from '@/types';

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

export const webSearch: Tool = {
  name: 'web_search',
  description: 'Search the web using DuckDuckGo (free, no API key). Returns title, snippet, and URL for each result.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      num_results: { type: 'number', description: 'Number of results 1-8, default 5' },
    },
    required: ['query'],
  },
  execute: async ({ query, num_results }) => {
    try {
      const count = Math.min(Math.max(Number(num_results) || 5, 1), 8);
      // Use DuckDuckGo HTML interface
      const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(String(query))}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      const html = await res.text();
      const results: Array<{ title: string; snippet: string; url: string }> = [];
      const re = /<a rel="nofollow" class="result__a" href="(.*?)">(.*?)<\/a>[\s\S]*?<a class="result__snippet">(.*?)<\/a>/g;
      let m; while ((m = re.exec(html)) !== null && results.length < count) {
        results.push({ title: m[2].replace(/<[^>]*>/g, ''), snippet: m[3].replace(/<[^>]*>/g, ''), url: m[1] });
      }
      return results.length ? { query, results: results.map((r, i) => `${i + 1}. ${r.title}\n${r.snippet}\n${r.url}`).join('\n\n') } : { query, results: 'No results found.' };
    } catch { return { error: 'Search failed' }; }
  },
};

export const imageSearch: Tool = {
  name: 'image_search',
  description: 'Search for images using DuckDuckGo image search. Returns direct image URLs.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Image search query, e.g. "cute cats"' },
      num_results: { type: 'number', description: 'Number of images 1-6, default 3' },
    },
    required: ['query'],
  },
  execute: async ({ query, num_results }) => {
    try {
      const count = Math.min(Math.max(Number(num_results) || 3, 1), 6);
      const res = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(String(query))}&iax=images&ia=images`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      const html = await res.text();
      const images: Array<{ url: string; title: string }> = [];
      // Try to extract image URLs from DuckDuckGo response
      const imgRe = /"image":"(https?:\/\/[^"]+)"/g;
      let imgMatch;
      while ((imgMatch = imgRe.exec(html)) !== null && images.length < count) {
        images.push({ url: imgMatch[1], title: query as string });
      }
      // Fallback: try alternative pattern
      if (images.length === 0) {
        const altRe = /https?:\/\/[^\s"<>]+\.(?:jpg|jpeg|png|gif|webp)/gi;
        let altMatch: RegExpExecArray | null;
        while ((altMatch = altRe.exec(html)) !== null && images.length < count) {
          const m = altMatch as RegExpExecArray;
          if (!images.some((i) => i.url === m[0])) {
            images.push({ url: m[0], title: query as string });
          }
        }
      }
      return images.length
        ? { query, images: images.map((img) => `![${img.title}](${img.url})`).join('\n') }
        : { query, images: 'No images found. Try a different query.' };
    } catch { return { error: 'Image search failed' }; }
  },
};

export const fetchUrl: Tool = {
  name: 'fetch_url',
  description: 'Fetch and extract text content from a URL.',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'URL to fetch' },
    },
    required: ['url'],
  },
  execute: async ({ url }) => {
    try {
      const res = await fetch(String(url), { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 6000);
      return { url, content: text, chars: text.length };
    } catch { return { error: `Failed to fetch ${url}` }; }
  },
};

export const datetime: Tool = {
  name: 'datetime',
  description: 'Get current date and time.',
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

export const BUILTIN_TOOLS: Tool[] = [
  calculator, weather, webSearch, imageSearch, fetchUrl, datetime, convert, analyzeText, memoryStore, memoryRetrieve,
];
