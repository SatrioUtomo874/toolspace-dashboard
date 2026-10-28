'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const Engine = window.DetectiveEngine;
const STORAGE_KEY = 'sebentar-detektif-progress-v2';
const SETTINGS_KEY = 'sebentar-detektif-settings-v1';

let progress = loadProgress();
let settings = loadSettings();
let currentSeed = '';
let currentDifficulty = 'medium';
let currentMode = 'endless';
let currentCase = null;
let revealedClues = new Set();
let selectedSuspectId = '';
let wrongAttempts = 0;
let hintsUsed = 0;
let interrogationsUsed = 0;
let caseState = 'playing'; // playing | solved | revealed
let earnedThisRun = 0;
let selectedQuestion = '';
let toastTimer = 0;

function utcDateKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}
function loadProgress() {
  const blank = { xp: 0, solved: {}, recent: [], dailyHistory: [], runs: 0, bestScore: 0 };
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return blank;
    return {
      xp: Math.max(0, Number(raw.xp) || 0),
      solved: raw.solved && typeof raw.solved === 'object' ? raw.solved : {},
      recent: Array.isArray(raw.recent) ? raw.recent : [],
      dailyHistory: Array.isArray(raw.dailyHistory) ? raw.dailyHistory : [],
      runs: Math.max(0, Number(raw.runs) || 0),
      bestScore: Math.max(0, Number(raw.bestScore) || 0)
    };
  } catch { return blank; }
}
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return {
      theme: ['auto', 'fun', 'tense', 'cozy', 'noir'].includes(saved.theme) ? saved.theme : 'auto',
      difficulty: ['auto', 'easy', 'medium', 'hard'].includes(saved.difficulty) ? saved.difficulty : 'auto'
    };
  } catch { return { theme: 'auto', difficulty: 'auto' }; }
}
function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch { toast('Penyimpanan browser penuh atau diblokir. Progres mungkin tidak tersimpan.'); }
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* Preferences are optional. */ }
}
function escapeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function getLocalTime() { return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); }
function formatDateUTC(date = new Date()) {
  return date.toLocaleDateString('id-ID', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}
function caseSolved(id) { return Boolean(progress.solved[id]?.solved); }
function getSolvedEntries() { return Object.values(progress.solved).filter(entry => entry && entry.solved); }
function rankStreak() {
  const dates = new Set(progress.dailyHistory);
  let days = 0;
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  while (dates.has(utcDateKey(cursor))) {
    days += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return days;
}
function applyTheme() {
  const actual = settings.theme === 'auto' ? (currentCase?.theme || 'cozy') : settings.theme;
  document.body.dataset.theme = actual;
  const theme = Engine.THEMES[actual] || Engine.THEMES.cozy;
  $('#themeSelect').value = settings.theme;
  $('#themeNote').textContent = `${theme.emoji} Suasana ${theme.label.toLowerCase()}`;
  if ($('#caseMood') && currentCase) $('#caseMood').textContent = `${theme.emoji} ${theme.label.toUpperCase()}`;
  $('#quoteCard').dataset.mood = actual;
  const quotes = {
    fun: ['“Kalau semua orang panik, periksa siapa yang masih santai.”', 'CATATAN DETEKTIF CERIA'],
    tense: ['“Satu menit bisa mengubah seluruh cerita.”', 'BERKAS WAKTU KRITIS'],
    cozy: ['“Detail kecil sering bicara lebih jujur daripada ingatan.”', 'CATATAN DETEKTIF'],
    noir: ['“Semua orang punya cerita. Jam tidak pernah mengarang.”', 'ARSIP TENGAH MALAM']
  };
  $('#quoteText').textContent = quotes[actual][0];
  $('#quoteCredit').textContent = quotes[actual][1];
}
function renderStats() {
  const entries = getSolvedEntries();
  const rank = Engine.rankFor(progress.xp);
  const solvedCount = entries.length;
  const perfectCount = entries.filter(item => Number(item.score) >= 90).length;
  $('#totalPoints').textContent = String(progress.xp);
  $('#solvedCount').textContent = String(solvedCount);
  $('#bestScore').textContent = solvedCount ? String(perfectCount) : '—';
  $('#rankLabel').textContent = rank.name;
  $('#rankTitle').textContent = rank.name;
  $('#rankBadge').textContent = rank.icon;
  const progressWithinRank = Math.max(0, Math.min(100, (progress.xp - rank.min) / Math.max(1, rank.next - rank.min) * 100));
  $('#rankProgressBar').style.width = `${progressWithinRank}%`;
  $('#rankProgressLabel').textContent = `${progress.xp} / ${rank.next} XP`;
  $('#rankFootnote').textContent = `${rankStreak()} hari streak Daily Mystery. ${perfectCount} kasus dengan skor 90+.`;
}
function addRecent(item) {
  progress.recent = [
    { seed: item.seed, difficulty: item.difficultyKey, id: item.id, title: item.title, emoji: item.emoji, theme: item.theme, mode: currentMode, openedAt: Date.now() },
    ...progress.recent.filter(entry => entry.id !== item.id)
  ].slice(0, 8);
  saveProgress();
}
function renderArchive() {
  $('#archiveCount').textContent = String(progress.recent.length).padStart(2, '0');
  const container = $('#caseArchive');
  if (!progress.recent.length) {
    container.innerHTML = '<div class="archive-empty">Belum ada berkas di sini. Tekan <b>Kasus baru</b> untuk merakit misteri pertama.</div>';
    return;
  }
  container.innerHTML = progress.recent.map(entry => {
    const solved = caseSolved(entry.id);
    return `<button class="archive-item ${entry.id === currentCase?.id ? 'active' : ''}" type="button" data-seed="${escapeText(entry.seed)}" data-difficulty="${escapeText(entry.difficulty)}" data-mode="${escapeText(entry.mode || 'endless')}" title="Buka kembali ${escapeText(entry.title)}">
      <span class="archive-emoji">${escapeText(entry.emoji)}</span><span class="archive-meta"><strong>${escapeText(entry.title)}</strong><small>${escapeText(entry.difficulty.toUpperCase())} · ${escapeText(entry.seed.slice(0, 16))}</small></span><span class="archive-state ${solved ? 'done' : ''}">${solved ? '✓' : '↗'}</span></button>`;
  }).join('');
}
function updateUrl() {
  try {
    const url = new URL(location.href);
    url.searchParams.set('seed', currentSeed);
    url.searchParams.set('difficulty', currentDifficulty);
    url.searchParams.set('theme', settings.theme);
    history.replaceState({}, '', url);
  } catch { /* Local file preview may not support history APIs. */ }
}
function applyQuerySettings() {
  const params = new URLSearchParams(location.search);
  const theme = params.get('theme');
  const difficulty = params.get('difficulty');
  if (['auto', 'fun', 'tense', 'cozy', 'noir'].includes(theme)) settings.theme = theme;
  if (['auto', 'easy', 'medium', 'hard'].includes(difficulty)) settings.difficulty = difficulty;
  $('#difficultySelect').value = settings.difficulty;
  $('#themeSelect').value = settings.theme;
}
function buildCase(seed, difficulty = 'auto', mode = 'endless') {
  const opts = {};
  if (difficulty !== 'auto') opts.difficulty = difficulty;
  if (mode === 'daily') opts.difficulty = 'medium';
  return Engine.generateCase(seed, opts);
}
function startCase(seed, difficulty = settings.difficulty, mode = 'endless', updateHistory = true) {
  try {
    currentSeed = String(seed || Engine.makeRandomSeed());
    currentMode = mode;
    currentCase = buildCase(currentSeed, difficulty, mode);
    currentDifficulty = currentCase.difficultyKey;
    selectedSuspectId = '';
    revealedClues = new Set();
    wrongAttempts = 0;
    hintsUsed = 0;
    interrogationsUsed = 0;
    selectedQuestion = '';
    caseState = 'playing';
    earnedThisRun = 0;
    if (updateHistory) addRecent(currentCase);
    renderCase();
    renderArchive();
    renderStats();
    applyTheme();
    updateUrl();
    return true;
  } catch (error) {
    console.error('Gagal merakit kasus:', error);
    toast('Mesin kasus mengalami masalah. Coba rakit seed baru.');
    return false;
  }
}
function renderCase() {
  const item = currentCase;
  if (!item) return;
  const validation = Engine.validateCase(item);
  if (!validation.valid) {
    $('#caseTitle').textContent = 'Berkas ditahan untuk pemeriksaan';
    $('#casePremise').textContent = 'Generator menemukan kasus yang belum memenuhi aturan logika. Coba buat kasus baru.';
    console.error('Case validation errors:', validation.errors);
    return;
  }
  $('#sectionTitle').textContent = currentMode === 'daily' ? 'Kasus harian' : currentMode === 'shared' ? 'Berkas dari teman' : 'Berkas yang sedang dibuka';
  $('#difficultySelect').disabled = currentMode === 'daily';
  $('#difficultySelect').value = currentMode === 'daily' ? 'medium' : settings.difficulty;
  $('#todayLabel').textContent = currentMode === 'daily' ? `DAILY · ${formatDateUTC()}` : currentMode === 'shared' ? 'SHARED CASE' : 'ENDLESS MODE';
  $('#caseNumber').textContent = item.number;
  $('#caseDifficulty').textContent = item.difficulty;
  $('#caseLocation').textContent = item.location;
  $('#caseMood').textContent = `${Engine.THEMES[item.theme].emoji} ${Engine.THEMES[item.theme].label.toUpperCase()}`;
  $('#caseType').textContent = item.category;
  $('#caseTitle').textContent = item.title;
  $('#casePremise').textContent = item.premise;
  $('#caseObjective').textContent = item.objective;
  $('#caseIllustration').textContent = item.emoji;
  $('#caseSeedLabel').textContent = `SEED ${item.seed.length > 21 ? item.seed.slice(0, 21) + '…' : item.seed}`;
  $('#estimatedTime').textContent = item.difficultyKey === 'hard' ? '3–5 menit' : item.difficultyKey === 'medium' ? '2–4 menit' : '1–3 menit';
  $('#suspectCountLabel').textContent = `${item.suspects.length} tersangka`;
  $('#clueCount').textContent = `0/${item.clues.length} petunjuk`;
  $('#caseSolvedTag').textContent = caseSolved(item.id) ? 'PERNAH DIPECAHKAN' : 'BELUM DIPECAHKAN';
  $('#clueGrid').innerHTML = item.clues.map((clue, index) => `<button class="clue-card" type="button" data-clue-id="${escapeText(clue.id)}" aria-expanded="false"><span class="clue-top"><span class="clue-icon">${escapeText(clue.icon)}</span><span class="clue-status">${clue.evidence === 'KUAT' ? 'BUKTI UTAMA' : 'BUKTI KONTEKS'}</span></span><strong>${escapeText(clue.title)}</strong><span class="clue-copy">${escapeText(clue.teaser)}</span></button>`).join('');
  $('#suspectGrid').innerHTML = item.suspects.map(suspect => `<button class="suspect-card" type="button" data-suspect-id="${escapeText(suspect.id)}" aria-pressed="false"><span class="suspect-selected-mark">✓</span><span class="suspect-avatar">${escapeText(suspect.emoji)}</span><strong>${escapeText(suspect.name)}</strong><p>${escapeText(suspect.role)}<br><span>${escapeText(suspect.alibi)}</span></p></button>`).join('');
  $('#interrogationSuspect').innerHTML = item.suspects.map(suspect => `<option value="${escapeText(suspect.id)}">${escapeText(suspect.name)} — ${escapeText(suspect.role)}</option>`).join('');
  $('#questionGrid').innerHTML = item.questions.map(question => `<button class="question-button" type="button" data-question-id="${escapeText(question.id)}">${escapeText(question.label)}</button>`).join('');
  $('#dialogueOutput').innerHTML = '<span class="dialogue-label">CATATAN INTEROGASI</span><p>Pilih pertanyaan untuk mulai berbicara dengan tersangka.</p>';
  $('#selectedSuspectNote').textContent = 'Baca bukti, pilih tersangka, lalu ajukan tuduhan.';
  $('#accuseBtn').disabled = true;
  $('#accuseBtn').innerHTML = 'Ajukan tuduhan <span>↗</span>';
  $('#hintPanel').hidden = true;
  $('#hintPanel').innerHTML = '';
  $('#hintBtn').disabled = false;
  $('#hintBtn').innerHTML = 'Minta petunjuk <span>−15 poin</span>';
  $('#feedbackPanel').hidden = true;
  $('#feedbackPanel').className = 'feedback-panel';
  $('#revealSolutionBtn').hidden = true;
  $('#resultPanel').hidden = true;
  $('#caseCard').classList.remove('is-closed');
  renderArchive();
  applyTheme();
}
function revealClue(clueId) {
  if (caseState !== 'playing') return;
  const clue = currentCase.clues.find(item => item.id === clueId);
  const card = $(`[data-clue-id="${CSS.escape(clueId)}"]`);
  if (!clue || !card) return;
  if (revealedClues.has(clueId)) {
    revealedClues.delete(clueId);
    card.classList.remove('is-open');
    card.setAttribute('aria-expanded', 'false');
    card.querySelector('.clue-copy').textContent = clue.teaser;
    card.querySelector('.clue-status').textContent = clue.evidence === 'KUAT' ? 'BUKTI UTAMA' : 'BUKTI KONTEKS';
  } else {
    revealedClues.add(clueId);
    card.classList.add('is-open');
    card.setAttribute('aria-expanded', 'true');
    card.querySelector('.clue-copy').textContent = clue.detail;
    card.querySelector('.clue-status').textContent = clue.evidence;
  }
  $('#clueCount').textContent = `${revealedClues.size}/${currentCase.clues.length} petunjuk dibuka`;
}
function selectSuspect(suspectId) {
  if (caseState !== 'playing') return;
  const suspect = currentCase.suspects.find(item => item.id === suspectId);
  if (!suspect) return;
  selectedSuspectId = suspectId;
  $$('.suspect-card').forEach(card => {
    const selected = card.dataset.suspectId === suspectId;
    card.classList.toggle('selected', selected);
    card.setAttribute('aria-pressed', String(selected));
  });
  $('#selectedSuspectNote').textContent = `${suspect.name} dipilih. Apakah bukti waktu dan jejak mendukung dugaanmu?`;
  $('#accuseBtn').disabled = false;
  $('#feedbackPanel').hidden = true;
}
function showFeedback(message, type = '') {
  const panel = $('#feedbackPanel');
  panel.className = `feedback-panel ${type}`.trim();
  panel.textContent = message;
  panel.hidden = false;
}
function useHint() {
  if (caseState !== 'playing') return;
  if (hintsUsed >= currentCase.hints.length) { toast('Semua petunjuk bantuan sudah dipakai.'); return; }
  const hint = currentCase.hints[hintsUsed];
  hintsUsed += 1;
  $('#hintPanel').innerHTML = `<strong>Petunjuk ${hintsUsed}/${currentCase.hints.length} · ${escapeText(hint.title)}</strong><span>${escapeText(hint.text)}</span>`;
  $('#hintPanel').hidden = false;
  $('#hintBtn').innerHTML = hintsUsed >= currentCase.hints.length ? 'Bantuan habis' : `Minta petunjuk <span>−15 poin</span>`;
  if (hintsUsed >= currentCase.hints.length) $('#hintBtn').disabled = true;
}
function askQuestion(questionId) {
  if (caseState !== 'playing') return;
  const suspect = currentCase.suspects.find(item => item.id === $('#interrogationSuspect').value);
  const question = currentCase.questions.find(item => item.id === questionId);
  if (!suspect || !question) return;
  interrogationsUsed += 1;
  selectedQuestion = questionId;
  $$('.question-button').forEach(button => button.classList.toggle('active', button.dataset.questionId === questionId));
  const answer = suspect.responses[questionId] || '“Aku tidak punya jawaban lain untuk saat ini.”';
  $('#dialogueOutput').innerHTML = `<span class="dialogue-label">${escapeText(suspect.name.toUpperCase())} · ${escapeText(question.label.toUpperCase())}</span><p>${escapeText(answer)}</p><small>${escapeText(suspect.behavior)} saat menjawab. Ini hanya konteks, bukan bukti kesalahan.</small>`;
}
function finishCase(revealed = false) {
  const item = currentCase;
  const alreadySolved = caseSolved(item.id);
  const score = revealed || alreadySolved ? 0 : Engine.scoreCase({ difficulty: item.difficultyKey, revealedHints: hintsUsed, wrongAttempts, daily: currentMode === 'daily' });
  earnedThisRun = score;
  caseState = revealed ? 'revealed' : 'solved';
  if (!revealed && !alreadySolved) {
    progress.solved[item.id] = { solved: true, score, date: utcDateKey(), seed: item.seed, title: item.title, difficulty: item.difficultyKey };
    progress.xp += score;
    progress.runs += 1;
    progress.bestScore = Math.max(progress.bestScore, score);
    if (currentMode === 'daily') {
      progress.dailyHistory = [...new Set([...progress.dailyHistory, utcDateKey()])].slice(-90);
    }
    saveProgress();
  }
  $('#caseCard').classList.add('is-closed');
  $('#resultIcon').textContent = revealed ? '⌕' : '✓';
  $('#resultEyebrow').textContent = revealed ? 'FILE DECLASSIFIED' : 'CASE CLOSED';
  $('#resultTitle').textContent = revealed ? `Solusi ditemukan: ${item.culpritName}` : alreadySolved ? 'Terpecahkan sekali lagi!' : 'Tajam sekali, Detektif!';
  $('#resultDescription').textContent = revealed
    ? 'Kamu membuka solusi tanpa menyelesaikan tuduhan. Baca rekonstruksi untuk melihat hubungan antar-bukti.'
    : alreadySolved
      ? 'Kasus ini sudah pernah kamu pecahkan. Kamu bisa melatih analisismu lagi, tetapi XP tidak diberikan dua kali untuk seed yang sama.'
      : `Kamu memilih ${item.suspects.find(suspect => suspect.id === item.answer).name}. Kamu mendapatkan ${score} XP setelah memperhitungkan tingkat kesulitan, bantuan, dan tuduhan yang keliru.`;
  $('#resultScore').textContent = `+${score}`;
  $('#solutionText').textContent = item.explanation;
  $('#resultPanel').hidden = false;
  $('#feedbackPanel').hidden = true;
  $('#revealSolutionBtn').hidden = true;
  $('#caseSolvedTag').textContent = revealed ? 'SOLUSI DIBUKA' : 'KASUS TERPECAHKAN';
  $('#resultPanel').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  renderStats(); renderArchive();
}
function accuse() {
  if (caseState !== 'playing' || !selectedSuspectId) return;
  const item = currentCase;
  const suspect = item.suspects.find(candidate => candidate.id === selectedSuspectId);
  if (!suspect) return;
  if (selectedSuspectId !== item.answer) {
    wrongAttempts += 1;
    const messages = [
      `${suspect.name} memang punya bagian cerita yang terasa janggal, tetapi bukti belum mengarah padanya. Cocokkan waktu dengan jejak yang ditemukan.`,
      `Belum tepat. Bedakan orang yang sempat mengakses lokasi dengan orang yang benar-benar ada saat kejadian.`,
      `Masih belum cocok. Cari dua bukti independen yang menunjuk ke orang yang sama; jangan hanya mengandalkan motif atau sikap gugup.`
    ];
    showFeedback(messages[Math.min(wrongAttempts - 1, messages.length - 1)], 'error');
    $('#selectedSuspectNote').textContent = `Tuduhan ke-${wrongAttempts}. Kamu masih bisa memeriksa bukti dan mengganti pilihan.`;
    if (wrongAttempts >= 3) $('#revealSolutionBtn').hidden = false;
    return;
  }
  finishCase(false);
}
function revealSolution() { if (caseState === 'playing') finishCase(true); }
function shareCase() {
  const url = new URL(location.href);
  url.searchParams.set('seed', currentCase.seed);
  url.searchParams.set('difficulty', currentCase.difficultyKey);
  url.searchParams.set('theme', settings.theme);
  const text = `🕵️ Sebentar, Detektif!\nCoba pecahkan: ${currentCase.title}\nMode: ${currentMode === 'daily' ? 'Daily Mystery' : 'Endless Mystery'}\n${url.toString()}`;
  if (navigator.share) {
    navigator.share({ title: 'Sebentar, Detektif!', text, url: url.toString() }).catch(() => {});
  } else if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => toast('Tautan kasus disalin. Kirim ke temanmu!')).catch(() => fallbackCopy(text));
  } else fallbackCopy(text);
}
function fallbackCopy(text) {
  const area = document.createElement('textarea');
  area.value = text; area.setAttribute('readonly', '');
  area.style.position = 'fixed'; area.style.opacity = '0';
  document.body.appendChild(area); area.select();
  try { document.execCommand('copy'); toast('Tautan kasus siap dibagikan.'); } catch { toast('Salin URL dari kolom alamat browser.'); }
  area.remove();
}
function newEndlessCase() {
  const seed = Engine.makeRandomSeed();
  startCase(seed, settings.difficulty, 'endless');
  toast('Kasus baru berhasil dirakit. Periksa tiap detail!');
}
function openDailyCase() {
  const seed = Engine.getDailySeed();
  startCase(seed, 'medium', 'daily');
  toast('Daily Mystery: seed hari ini sama untuk semua pemain.');
}
function nextCase() {
  const seed = Engine.makeRandomSeed();
  startCase(seed, settings.difficulty, 'endless');
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}
function onArchiveClick(event) {
  const button = event.target.closest('[data-seed]');
  if (!button) return;
  startCase(button.dataset.seed, button.dataset.difficulty, button.dataset.mode || 'shared', false);
  toast('Berkas lama dibuka kembali. XP tidak digandakan untuk kasus yang sudah selesai.');
}
function init() {
  applyQuerySettings();
  const params = new URLSearchParams(location.search);
  const sharedSeed = params.get('seed');
  const difficulty = ['auto', 'easy', 'medium', 'hard'].includes(params.get('difficulty')) ? params.get('difficulty') : settings.difficulty;
  const storedTheme = settings.theme;
  if (sharedSeed) {
    startCase(sharedSeed, difficulty, sharedSeed.startsWith('daily-') ? 'daily' : 'shared');
  } else {
    startCase(Engine.getDailySeed(), 'medium', 'daily');
  }
  settings.theme = storedTheme;
  $('#themeSelect').value = settings.theme;
  $('#difficultySelect').value = settings.difficulty;
  applyTheme(); renderStats(); renderArchive();
}

$('#clueGrid').addEventListener('click', event => {
  const card = event.target.closest('[data-clue-id]');
  if (card) revealClue(card.dataset.clueId);
});
$('#suspectGrid').addEventListener('click', event => {
  const card = event.target.closest('[data-suspect-id]');
  if (card) selectSuspect(card.dataset.suspectId);
});
$('#caseArchive').addEventListener('click', onArchiveClick);
$('#questionGrid').addEventListener('click', event => {
  const button = event.target.closest('[data-question-id]');
  if (button) askQuestion(button.dataset.questionId);
});
$('#accuseBtn').addEventListener('click', accuse);
$('#hintBtn').addEventListener('click', useHint);
$('#revealSolutionBtn').addEventListener('click', revealSolution);
$('#dailyBtn').addEventListener('click', openDailyCase);
$('#dailySideBtn').addEventListener('click', openDailyCase);
$('#endlessBtn').addEventListener('click', newEndlessCase);
$('#shareCaseBtn').addEventListener('click', shareCase);
$('#shareResultBtn').addEventListener('click', shareCase);
$('#nextCaseBtn').addEventListener('click', nextCase);
$('#replayBtn').addEventListener('click', () => startCase(currentSeed, currentDifficulty, currentMode, false));
$('#footerNextBtn').addEventListener('click', newEndlessCase);
$('#themeSelect').addEventListener('change', event => {
  settings.theme = event.target.value;
  saveSettings(); applyTheme(); updateUrl();
  toast(settings.theme === 'auto' ? 'Suasana mengikuti nuansa kasus.' : `Nuansa ${Engine.THEMES[settings.theme].label} diaktifkan.`);
});
$('#difficultySelect').addEventListener('change', event => {
  settings.difficulty = event.target.value;
  saveSettings();
  toast('Kompleksitas baru dipakai pada kasus berikutnya.');
});
$('#howToBtn').addEventListener('click', () => $('#howToDialog').showModal());
$('#closeGuideBtn').addEventListener('click', () => $('#howToDialog').close());
$('#howToDialog').addEventListener('click', event => { if (event.target === $('#howToDialog')) $('#howToDialog').close(); });

init();
