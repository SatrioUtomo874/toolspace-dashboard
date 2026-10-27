const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{22}$/;
const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"]);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

function decodeEntities(value = "") {
  return String(value)
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function validYouTubeUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== "https:" || !YT_HOSTS.has(url.hostname.toLowerCase())) return null;
  return url;
}

function videoIdFromUrl(raw) {
  const url = validYouTubeUrl(raw);
  if (!url) return "";
  let id = "";
  if (url.hostname.toLowerCase().includes("youtu.be")) id = url.pathname.split("/").filter(Boolean)[0] || "";
  else if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
  else {
    const parts = url.pathname.split("/").filter(Boolean);
    if (["shorts", "live", "embed", "v"].includes(parts[0])) id = parts[1] || "";
  }
  return VIDEO_ID_RE.test(id) ? id : "";
}

async function youtubeFetch(url, accept = "text/html,application/xml;q=0.9,*/*;q=0.8") {
  const response = await fetch(url, {
    headers: { "user-agent": UA, "accept": accept, "accept-language": "en-US,en;q=0.8,id;q=0.7" },
    redirect: "follow",
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`YouTube mengembalikan HTTP ${response.status}. Coba lagi nanti; akses dari Worker mungkin sedang dibatasi.`);
  return response;
}

function readMeta(html, property) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const key = tag.match(/(?:property|name)=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (key !== property.toLowerCase()) continue;
    return decodeEntities(tag.match(/content=["']([^"']*)["']/i)?.[1] || "");
  }
  return "";
}

async function fetchWatchPage(videoId) {
  const response = await youtubeFetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`);
  return await response.text();
}

function extractJsonAssignment(html, assignmentName) {
  const pattern = new RegExp(`(?:var\\s+)?${assignmentName}\\s*=`, "m");
  const match = pattern.exec(html);
  if (!match) return null;
  let start = html.indexOf("{", match.index + match[0].length);
  if (start < 0) return null;
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < html.length; i++) {
    const char = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === "{") depth++;
    if (char === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(html.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

function parseXmlTag(block, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match ? decodeEntities(match[1].trim()) : "";
}

async function getVideoList(rawUrl) {
  const url = validYouTubeUrl(rawUrl);
  if (!url) throw new Error("Masukkan URL HTTPS dari youtube.com atau youtu.be.");

  const singleId = videoIdFromUrl(rawUrl);
  if (singleId) {
    const html = await fetchWatchPage(singleId);
    const title = readMeta(html, "og:title") || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s*-\s*YouTube\s*$/i, "").trim() || singleId;
    return { sourceType: "video", note: "Satu video dipilih langsung.", videos: [{ id: singleId, title: decodeEntities(title), url: `https://www.youtube.com/watch?v=${singleId}`, published: "" }] };
  }

  let channelId = "";
  let playlistId = url.searchParams.get("list") || "";
  const path = url.pathname;
  const channelMatch = path.match(/\/channel\/(UC[A-Za-z0-9_-]{22})(?:\/|$)/);
  if (channelMatch) channelId = channelMatch[1];
  if (!channelId && CHANNEL_ID_RE.test(rawUrl.trim())) channelId = rawUrl.trim();
  if (!channelId && !playlistId) {
    const response = await youtubeFetch(url.href);
    const html = await response.text();
    channelId = html.match(/["'](?:channelId|externalId)["']\s*:\s*["'](UC[A-Za-z0-9_-]{22})["']/i)?.[1] ||
      html.match(/(?:channelId|externalId)\s*[:=]\s*["'](UC[A-Za-z0-9_-]{22})["']/i)?.[1] ||
      html.match(/youtube(?:\\\/|\/)channel(?:\\\/|\/)(UC[A-Za-z0-9_-]{22})/i)?.[1] ||
      html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})/i)?.[1] || "";
  }
  if (!channelId && !playlistId) throw new Error("ID channel tidak ditemukan. Coba URL youtube.com/channel/UC… atau URL video langsung.");

  const feedUrl = channelId
    ? `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`
    : `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`;
  const xml = await (await youtubeFetch(feedUrl, "application/atom+xml,application/xml,text/xml,*/*")).text();
  const entries = [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)].map(m => m[1]);
  const videos = entries.map(entry => {
    const id = parseXmlTag(entry, "yt:videoId");
    if (!VIDEO_ID_RE.test(id)) return null;
    return {
      id,
      title: parseXmlTag(entry, "title") || id,
      url: `https://www.youtube.com/watch?v=${id}`,
      published: parseXmlTag(entry, "published")
    };
  }).filter(Boolean);
  if (!videos.length) throw new Error("Feed channel tidak berisi video yang bisa diakses. Feed publik biasanya menampilkan maksimal 15 video terbaru.");
  return { sourceType: channelId ? "channel" : "playlist", note: "Feed publik YouTube menampilkan hingga 15 video terbaru; bukan seluruh arsip channel.", videos };
}

function captionText(value) {
  return decodeEntities(value).replace(/<[^>]*>/g, "").replace(/\u200b/g, "").replace(/\s+/g, " ").trim();
}

function parseJson3(data) {
  const events = Array.isArray(data.events) ? data.events : [];
  const raw = events.filter(e => Array.isArray(e.segs) && Number.isFinite(e.tStartMs)).map(e => ({
    start: Math.max(0, e.tStartMs / 1000),
    duration: Math.max(0.2, (e.dDurationMs || 1800) / 1000),
    text: captionText(e.segs.map(s => s.utf8 || "").join(""))
  })).filter(e => e.text);
  return raw;
}

function parseXmlCaptions(xml) {
  const segments = [];
  for (const match of xml.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/gi)) {
    const attrs = match[1];
    const start = Number(attrs.match(/\bstart=["']([^"']+)["']/i)?.[1]);
    const duration = Number(attrs.match(/\bdur=["']([^"']+)["']/i)?.[1] || 1.8);
    const text = captionText(match[2].replace(/<br\s*\/?\s*>/gi, " "));
    if (Number.isFinite(start) && text) segments.push({ start, duration: Math.max(0.2, duration), text });
  }
  return segments;
}

async function getTranscript(videoId, language) {
  if (!VIDEO_ID_RE.test(videoId)) throw new Error("ID video tidak valid.");
  const html = await fetchWatchPage(videoId);
  const player = extractJsonAssignment(html, "ytInitialPlayerResponse") || extractJsonAssignment(html, "ytInitialPlayerResponse\\s*");
  const renderer = player?.captions?.playerCaptionsTracklistRenderer;
  const tracks = renderer?.captionTracks || [];
  if (!tracks.length) {
    throw new Error("Caption publik tidak ditemukan. Video mungkin tidak memiliki transkrip yang dapat diakses, atau YouTube membatasi permintaan Worker.");
  }

  let chosen;
  let translateTo = "";
  if (language && language !== "auto") {
    chosen = tracks.find(t => t.languageCode === language || t.languageCode?.startsWith(`${language}-`));
    if (!chosen) { chosen = tracks.find(t => t.kind !== "asr") || tracks[0]; translateTo = language; }
  } else {
    chosen = tracks.find(t => t.kind !== "asr") || tracks[0];
  }
  if (!chosen?.baseUrl) throw new Error("URL track caption tidak tersedia.");

  const captionUrl = new URL(chosen.baseUrl);
  captionUrl.searchParams.set("fmt", "json3");
  if (translateTo) captionUrl.searchParams.set("tlang", translateTo);
  const response = await youtubeFetch(captionUrl.href, "application/json,text/xml,*/*");
  const body = await response.text();
  let segments = [];
  try { segments = parseJson3(JSON.parse(body)); } catch { segments = parseXmlCaptions(body); }
  if (!segments.length) segments = parseXmlCaptions(body);
  if (!segments.length) throw new Error("YouTube tidak mengembalikan segmen transkrip. Coba video lain atau bahasa lain.");

  const title = readMeta(html, "og:title") || videoId;
  const text = segments.map(s => s.text).join("\n");
  return {
    videoId,
    title,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    language: translateTo || chosen.languageCode || "unknown",
    trackType: chosen.kind === "asr" ? "generated" : "manual",
    wordCount: text.split(/\s+/).filter(Boolean).length,
    text,
    segments
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (request.method !== "GET") return json({ error: "Metode tidak didukung." }, 405);
    if (url.pathname === "/api/health") return json({ ok: true, service: "toolspace-youtube-transcript", transcriptSource: "public YouTube caption tracks", maxChannelFeedVideos: 15 });
    try {
      if (url.pathname === "/api/videos") {
        const source = url.searchParams.get("url") || "";
        if (!source || source.length > 800) return json({ error: "Masukkan URL YouTube yang valid." }, 400);
        return json(await getVideoList(source));
      }
      if (url.pathname === "/api/transcript") {
        const videoId = url.searchParams.get("videoId") || "";
        const language = url.searchParams.get("lang") || "auto";
        if (!VIDEO_ID_RE.test(videoId)) return json({ error: "ID video tidak valid." }, 400);
        if (!/^(auto|[a-z]{2,3})$/i.test(language)) return json({ error: "Kode bahasa tidak valid." }, 400);
        return json(await getTranscript(videoId, language));
      }
      return json({ error: "Endpoint tidak ditemukan." }, 404);
    } catch (error) {
      const message = String(error?.message || "Permintaan gagal.").slice(0, 350);
      return json({ error: message }, 502);
    }
  }
};
