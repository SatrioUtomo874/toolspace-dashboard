"use strict";

const form = document.querySelector("#channel-form");
const input = document.querySelector("#channel-url");
const languageSelect = document.querySelector("#language");
const notice = document.querySelector("#app-notice");
const videoWorkspace = document.querySelector("#video-workspace");
const videoList = document.querySelector("#video-list");
const listError = document.querySelector("#list-error");
const selectAllButton = document.querySelector("#select-all");
const selectNoneButton = document.querySelector("#select-none");
const startBatchButton = document.querySelector("#start-batch");
const selectionCount = document.querySelector("#selection-count");
const batchSummary = document.querySelector("#batch-summary");
const progressTrack = document.querySelector("#progress-track");
const progressFill = document.querySelector("#progress-fill");
const resultsWorkspace = document.querySelector("#results-workspace");
const resultsList = document.querySelector("#results-list");
const resultsCount = document.querySelector("#results-count");

let videos = [];
let results = new Map();
let isRunning = false;
let cancelRequested = false;

function showNotice(kind, title, message) {
  notice.classList.toggle("notice-error", kind === "error");
  notice.querySelector(".notice-icon").textContent = kind === "error" ? "!" : "i";
  notice.querySelector("strong").textContent = title;
  notice.querySelector("p").textContent = message;
  notice.hidden = false;
}

async function api(path) {
  const response = await fetch(path, { cache: "no-store", headers: { accept: "application/json" } });
  let data;
  try { data = await response.json(); } catch { throw new Error(`Respons server tidak valid (HTTP ${response.status}).`); }
  if (!response.ok) throw new Error(data.error || `Permintaan gagal (HTTP ${response.status}).`);
  return data;
}

function text(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = value ?? "";
  return element;
}

function selectedVideos() {
  return [...videoList.querySelectorAll("input[data-video-id]:checked")]
    .map(input => videos.find(video => video.id === input.dataset.videoId)).filter(Boolean);
}

function refreshSelectionCount() {
  selectionCount.textContent = `${selectedVideos().length} dipilih`;
}

function statusLabel(status) {
  return ({ pending: "Menunggu", processing: "Memproses", success: "Berhasil", failed: "Gagal", cached: "Selesai (sesi ini)" })[status] || status;
}

function renderVideos() {
  videoList.replaceChildren();
  for (const video of videos) {
    const row = document.createElement("article");
    row.className = "video-row";
    row.dataset.videoId = video.id;
    const check = document.createElement("input");
    check.type = "checkbox";
    check.dataset.videoId = video.id;
    check.setAttribute("aria-label", `Pilih ${video.title}`);
    const body = document.createElement("div");
    body.className = "video-row-body";
    const titleLink = document.createElement("a");
    titleLink.href = video.url;
    titleLink.target = "_blank";
    titleLink.rel = "noopener noreferrer";
    titleLink.className = "video-title";
    titleLink.textContent = video.title;
    const meta = text("div", "video-meta", [video.published ? new Date(video.published).toLocaleDateString("id-ID") : "", video.id].filter(Boolean).join(" · "));
    const status = text("span", "video-status", statusLabel(results.get(video.id)?.status || "pending"));
    status.dataset.status = "true";
    body.append(titleLink, meta);
    row.append(check, body, status);
    videoList.append(row);
  }
  videoWorkspace.hidden = videos.length === 0;
  refreshSelectionCount();
}

function updateVideoStatus(id, status, detail = "") {
  const row = videoList.querySelector(`[data-video-id="${CSS.escape(id)}"]`);
  if (!row) return;
  const badge = row.querySelector("[data-status]");
  badge.textContent = detail ? `${statusLabel(status)} — ${detail}` : statusLabel(status);
  badge.dataset.state = status;
}

function timestamp(seconds) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const hh = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const mm = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  const millis = String(ms % 1000).padStart(3, "0");
  return `${hh}:${mm}:${ss},${millis}`;
}

function asSrt(result) {
  return result.segments.map((segment, index) => {
    const start = timestamp(segment.start);
    const end = timestamp(segment.start + (segment.duration || 2));
    return `${index + 1}\n${start} --> ${end}\n${segment.text}\n`;
  }).join("\n");
}

function download(filename, content, mime) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(name) {
  return String(name || "transcript").replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").trim().slice(0, 100) || "transcript";
}

function renderResults() {
  resultsList.replaceChildren();
  const done = [...results.values()].filter(item => item.status === "success");
  resultsCount.textContent = `${done.length} selesai`;
  resultsWorkspace.hidden = results.size === 0;
  for (const item of results.values()) {
    const card = document.createElement("article");
    card.className = "result-card";
    const heading = document.createElement("div");
    heading.className = "result-heading";
    const body = document.createElement("div");
    body.className = "result-body";
    const title = text("h3", "", item.title || item.videoId);
    const status = text("span", `result-status ${item.status}`, item.status === "success" ? `${item.wordCount} kata · ${item.language}` : statusLabel(item.status));
    heading.append(title, status);
    if (item.status === "success") {
      const preview = text("pre", "transcript-preview", item.text.slice(0, 1600) + (item.text.length > 1600 ? "\n… (preview dipotong)" : ""));
      const actions = document.createElement("div");
      actions.className = "download-actions";
      const base = safeFilename(item.title);
      const txt = text("button", "small-button", "Unduh TXT");
      txt.type = "button";
      txt.addEventListener("click", () => download(`${base}.txt`, item.text, "text/plain"));
      const jsonButton = text("button", "small-button", "Unduh JSON");
      jsonButton.type = "button";
      jsonButton.addEventListener("click", () => download(`${base}.json`, JSON.stringify(item, null, 2), "application/json"));
      const srt = text("button", "small-button", "Unduh SRT");
      srt.type = "button";
      srt.addEventListener("click", () => download(`${base}.srt`, asSrt(item), "application/x-subrip"));
      actions.append(txt, jsonButton, srt);
      body.append(preview, actions);
    } else if (item.status === "failed") {
      body.append(text("p", "result-error", item.error || "Transkrip gagal diambil."));
    }
    card.append(heading, body);
    resultsList.append(card);
  }
}

function updateProgress(done, total, failed) {
  const percent = total ? Math.round(done / total * 100) : 0;
  progressTrack.hidden = total === 0;
  progressFill.style.width = `${percent}%`;
  batchSummary.textContent = `${done}/${total} selesai · ${failed} gagal${cancelRequested ? " · penghentian diminta" : ""}`;
}

async function checkApi() {
  try {
    const health = await api("/api/health");
    showNotice("info", "Cloudflare Worker aktif", `API merespons. Sumber caption: ${health.transcriptSource}. Feed channel menyediakan hingga ${health.maxChannelFeedVideos} video terbaru.`);
  } catch (error) {
    showNotice("error", "API Cloudflare belum tersedia", `${error.message} Pastikan Worker API sudah disertakan dan deployment terbaru berhasil.`);
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const value = input.value.trim();
  if (!value) { showNotice("error", "URL masih kosong", "Masukkan URL channel atau video YouTube."); input.focus(); return; }
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  button.querySelector("span").textContent = "…";
  showNotice("info", "Mengambil daftar video…", "Meminta data dari feed publik YouTube. Hasil bergantung pada akses dari Cloudflare.");
  listError.hidden = true;
  try {
    const data = await api(`/api/videos?url=${encodeURIComponent(value)}`);
    videos = data.videos || [];
    results.clear();
    renderResults();
    renderVideos();
    showNotice("info", "Daftar video dimuat", `${videos.length} video ditemukan. ${data.note || "Pilih video untuk memulai."}`);
    if (videos.length) videoWorkspace.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    videos = [];
    videoWorkspace.hidden = true;
    listError.hidden = false;
    listError.querySelector("p").textContent = error.message;
    showNotice("error", "Gagal mengambil daftar video", error.message);
  } finally {
    button.disabled = false;
    button.querySelector("span").textContent = "↗";
  }
});

videoList.addEventListener("change", event => {
  if (event.target.matches("input[data-video-id]")) refreshSelectionCount();
});
selectAllButton.addEventListener("click", () => { videoList.querySelectorAll("input[data-video-id]").forEach(check => { check.checked = true; }); refreshSelectionCount(); });
selectNoneButton.addEventListener("click", () => { videoList.querySelectorAll("input[data-video-id]").forEach(check => { check.checked = false; }); refreshSelectionCount(); });

startBatchButton.addEventListener("click", async () => {
  if (isRunning) { cancelRequested = true; startBatchButton.disabled = true; return; }
  const chosen = selectedVideos();
  if (!chosen.length) { showNotice("error", "Belum ada video dipilih", "Centang minimal satu video untuk memulai."); return; }
  if (chosen.length > 15) { showNotice("error", "Batch terlalu besar", "Pilih maksimal 15 video untuk satu batch pada versi beta."); return; }
  isRunning = true;
  cancelRequested = false;
  startBatchButton.textContent = "Batalkan setelah video ini";
  startBatchButton.classList.add("secondary-button");
  const language = languageSelect.value || "auto";
  let done = 0, failed = 0;
  results.clear();
  renderResults();
  updateProgress(done, chosen.length, failed);
  try {
    for (const video of chosen) {
      if (cancelRequested) break;
      updateVideoStatus(video.id, "processing");
      results.set(video.id, { videoId: video.id, title: video.title, status: "processing" });
      renderResults();
      try {
        const result = await api(`/api/transcript?videoId=${encodeURIComponent(video.id)}&lang=${encodeURIComponent(language)}`);
        const item = { ...result, status: "success" };
        results.set(video.id, item);
        updateVideoStatus(video.id, "success", `${item.wordCount} kata`);
      } catch (error) {
        failed++;
        results.set(video.id, { videoId: video.id, title: video.title, status: "failed", error: error.message });
        updateVideoStatus(video.id, "failed", error.message.slice(0, 90));
      }
      done++;
      renderResults();
      updateProgress(done, chosen.length, failed);
    }
  } finally {
    isRunning = false;
    startBatchButton.disabled = false;
    startBatchButton.textContent = "Mulai transkripsi";
    startBatchButton.classList.remove("secondary-button");
    if (cancelRequested && done < chosen.length) batchSummary.textContent += ` · ${chosen.length - done} video dilewati`;
    showNotice(failed ? "error" : "info", "Batch selesai", `${done - failed} berhasil, ${failed} gagal${cancelRequested ? ", dihentikan sesuai permintaan" : ""}. Video tanpa caption publik dapat gagal; tidak ada transkrip palsu yang dibuat.`);
    resultsWorkspace.hidden = results.size === 0;
    if (results.size) resultsWorkspace.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

checkApi();
