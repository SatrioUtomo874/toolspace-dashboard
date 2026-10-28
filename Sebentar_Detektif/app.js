'use strict';

const CASES = [
  {
    id: 'donut-terakhir', number: 'CASE 001', title: 'Siapa mengambil donat terakhir?', shortTitle: 'Donat terakhir', emoji: '🍩', category: 'KANTOR', difficulty: 'MUDAH', location: 'Ruang istirahat kantor', type: 'MISTERI MAKANAN',
    premise: 'Donat cokelat terakhir lenyap tepat sebelum rapat pukul 10.15. Tiga orang punya cerita berbeda—dan satu cerita tidak cocok dengan bukti.',
    objective: 'Temukan siapa yang memakan donat, bukan sekadar siapa yang sempat masuk pantry.',
    suspects: [
      { id: 'kiko', name: 'Kiko', emoji: '🧑🏻‍💻', role: 'Anak meeting', alibi: '“Aku terus di depan laptop sejak pukul 10.00.”' },
      { id: 'nara', name: 'Nara', emoji: '👩🏽‍🎨', role: 'Tim desain', alibi: '“Aku cuma mengambil air di pantry.”' },
      { id: 'bima', name: 'Bima', emoji: '🧢', role: 'Anak lapangan', alibi: '“Aku di luar gedung sampai pukul 10.15.”' }
    ], answer: 'kiko',
    clues: [
      { id: 'audio', icon: '🎙️', title: 'Rekaman meeting', teaser: 'Ada suara yang tidak seharusnya muncul.', detail: 'Pukul 10.09 mikrofon laptop Kiko menangkap suara bungkus makanan diremas, lalu suara kunyahan. Kiko mengaku tidak menyentuh makanan sama sekali.', evidence: 'KUAT' },
      { id: 'crumbs', icon: '🔎', title: 'Remah di meja', teaser: 'Sesuatu tertinggal di dekat keyboard.', detail: 'Ada remah berwarna cokelat tepat di bawah keyboard Kiko. Tisu di sampingnya memiliki noda cokelat yang masih baru.', evidence: 'KUAT' },
      { id: 'pantry', icon: '🚪', title: 'Sensor pantry', teaser: 'Pintu pantry sempat terbuka.', detail: 'Sensor mencatat pintu terbuka pukul 10.06–10.07. Gelas air milik Nara ditemukan di dekat dispenser. Ini membuktikan ia mampir, tetapi tidak membuktikan ia mengambil donat.', evidence: 'KONTEKS' }
    ],
    explanation: 'Kiko mengatakan tetap meeting dan tidak menyentuh makanan. Namun, mikrofon laptopnya menangkap bungkus dan kunyahan pada pukul 10.09, lalu remah donat ditemukan tepat di bawah keyboardnya. Nara memang masuk pantry, tetapi bukti itu hanya menunjukkan ia mengambil air. Dua bukti yang saling menguatkan mengarah ke Kiko.'
  },
  {
    id: 'slide-berubah', number: 'CASE 002', title: 'Siapa mengubah slide presentasi?', shortTitle: 'Slide berubah', emoji: '🖥️', category: 'TEKNOLOGI', difficulty: 'SEDANG', location: 'Ruang rapat B', type: 'MISTERI DIGITAL',
    premise: 'Satu grafik penting di presentasi tim berubah menjadi gambar kucing lima menit sebelum rapat. Tidak ada yang mengaku menyentuh file.',
    objective: 'Cocokkan jejak perangkat dengan waktu perubahan.',
    suspects: [
      { id: 'tania', name: 'Tania', emoji: '👩🏻‍💼', role: 'Analis data', alibi: '“Laptopku kubawa ke ruang rapat, tapi aku tidak mengedit slide.”' },
      { id: 'reza', name: 'Reza', emoji: '🧑🏽‍🎤', role: 'Desainer', alibi: '“Aku sedang menulis di whiteboard.”' },
      { id: 'omar', name: 'Omar', emoji: '👨🏾‍💻', role: 'IT support', alibi: '“Aku baru datang setelah file dibuka.”' }
    ], answer: 'tania',
    clues: [
      { id: 'changelog', icon: '🧾', title: 'Riwayat file', teaser: 'File menyimpan waktu perubahan terakhir.', detail: 'Riwayat presentasi mencatat grafik diganti pukul 14.03 melalui perangkat LAPTOP-TANIA. File sebelumnya tidak memiliki gambar kucing.', evidence: 'KUAT' },
      { id: 'wifi', icon: '📶', title: 'Log jaringan', teaser: 'Sebuah perangkat muncul di ruang rapat.', detail: 'LAPTOP-TANIA terhubung ke Wi-Fi ruang rapat pada pukul 14.02, satu menit sebelum perubahan file tercatat.', evidence: 'KUAT' },
      { id: 'board', icon: '🖊️', title: 'Whiteboard', teaser: 'Ada catatan yang dihapus terburu-buru.', detail: 'Tulisan “pakai grafik baru” masih terlihat samar di whiteboard. Tulisan itu mirip tulisan Reza, tetapi tidak ada bukti bahwa Reza membuka atau mengubah file.', evidence: 'KONTEKS' }
    ],
    explanation: 'Riwayat file mengidentifikasi LAPTOP-TANIA sebagai perangkat yang mengganti grafik, dan log Wi-Fi menempatkan perangkat yang sama di ruang rapat sesaat sebelum edit. Catatan di whiteboard milik Reza bisa terlihat mencurigakan, tetapi tidak menghubungkannya dengan perubahan digital.'
  },
  {
    id: 'tanaman-kantor', number: 'CASE 003', title: 'Kenapa tanaman kantor layu?', shortTitle: 'Tanaman layu', emoji: '🪴', category: 'KEHIDUPAN', difficulty: 'MUDAH', location: 'Sudut jendela kantor', type: 'MISTERI KEHARIAN',
    premise: 'Tanaman yang biasanya segar mendadak layu, padahal semua orang bersikeras sudah merawatnya. Ada terlalu banyak kebaikan yang diberikan.',
    objective: 'Cari tahu tindakan mana yang justru merusak tanaman.',
    suspects: [
      { id: 'galih', name: 'Galih', emoji: '🧑🏻‍🌾', role: 'Penyiram sukarela', alibi: '“Aku menyiramnya sedikit tadi pagi.”' },
      { id: 'fira', name: 'Fira', emoji: '👩🏼‍🔬', role: 'Pencinta tanaman', alibi: '“Aku memindahkannya dekat jendela.”' },
      { id: 'jo', name: 'Jo', emoji: '🧑🏽', role: 'Rekan satu tim', alibi: '“Aku hanya memotret tanamannya.”' }
    ], answer: 'galih',
    clues: [
      { id: 'soil', icon: '💧', title: 'Kondisi tanah', teaser: 'Permukaannya masih basah.', detail: 'Tanah sangat basah sampai ke dasar pot, padahal tanaman ini perlu mengering sedikit di antara penyiraman. Akar mulai kekurangan udara.', evidence: 'KUAT' },
      { id: 'can', icon: '🚿', title: 'Kaleng penyiram', teaser: 'Jumlah airnya tidak wajar.', detail: 'Kaleng penyiram kosong. Catatan pada pot hanya menyarankan sekitar 100 ml, sedangkan kaleng yang dipakai berkapasitas 1 liter dan baru saja terisi penuh.', evidence: 'KUAT' },
      { id: 'photo', icon: '📷', title: 'Foto pagi hari', teaser: 'Tanaman terlihat baik sebelum disiram.', detail: 'Foto Jo pada pukul 08.00 memperlihatkan daun masih tegak. Catatan Galih menyebut ia menyiram setelah foto itu diambil.', evidence: 'KONTEKS' }
    ],
    explanation: 'Tanaman mengalami overwatering. Tanah yang jenuh dan kaleng satu liter yang kosong cocok dengan pengakuan Galih bahwa ia menyiram setelah foto diambil. Memindahkan tanaman dekat jendela atau memotretnya tidak menjelaskan tanah yang terlalu basah.'
  },
  {
    id: 'playlist-bocor', number: 'CASE 004', title: 'Siapa membocorkan playlist rahasia?', shortTitle: 'Playlist bocor', emoji: '🎧', category: 'DIGITAL', difficulty: 'SEDANG', location: 'Grup chat tim', type: 'MISTERI DIGITAL',
    premise: 'Playlist dengan judul memalukan “lagu galau saat pura-pura produktif” tiba-tiba muncul di grup kantor. Pemiliknya ingin identitas pembocor terungkap.',
    objective: 'Telusuri jejak ekspor, bukan siapa yang paling malu.',
    suspects: [
      { id: 'acha', name: 'Acha', emoji: '👩🏻‍🎤', role: 'Kurator musik', alibi: '“Aku yang membuat playlist, bukan yang membagikan.”' },
      { id: 'dewa', name: 'Dewa', emoji: '🧑🏽‍💻', role: 'Admin playlist', alibi: '“Aku tidak membuka fitur ekspor hari ini.”' },
      { id: 'nisa', name: 'Nisa', emoji: '👩🏽', role: 'Teman satu tim', alibi: '“Aku cuma menerima tautannya.”' }
    ], answer: 'dewa',
    clues: [
      { id: 'sharelog', icon: '🔗', title: 'Log berbagi', teaser: 'Tautan dibuat dari satu akun.', detail: 'Sistem mencatat tautan publik dibuat oleh akun dewa_guest pukul 16.42. Tautan yang sama kemudian muncul di grup chat.', evidence: 'KUAT' },
      { id: 'browser', icon: '🧭', title: 'Riwayat browser', teaser: 'Halaman ekspor pernah dibuka.', detail: 'Pada perangkat Dewa terdapat riwayat halaman “Export playlist” tepat pukul 16.41. Ini bertentangan dengan pengakuannya bahwa ia tidak membuka fitur ekspor.', evidence: 'KUAT' },
      { id: 'chat', icon: '💬', title: 'Pesan grup', teaser: 'Nisa adalah orang pertama yang mengirim pesan.', detail: 'Nisa mengirim tautan ke grup, tetapi waktu pesan 16.44—dua menit setelah tautan dibuat oleh akun dewa_guest. Mengirim ulang tidak sama dengan membuat tautan awal.', evidence: 'KONTEKS' }
    ],
    explanation: 'Akun dewa_guest membuat tautan pada 16.42 dan perangkat Dewa membuka halaman ekspor satu menit sebelumnya. Nisa memang mengirim tautan ke grup, tetapi ia bukan pembuat tautan berdasarkan log yang tersedia.'
  },
  {
    id: 'printer-milo', number: 'CASE 005', title: 'Kasus printer yang mati sendiri', shortTitle: 'Printer mati', emoji: '🐈', category: 'ABSURD', difficulty: 'MUDAH', location: 'Sudut ruang kerja', type: 'MISTERI ABSURD',
    premise: 'Printer berhenti bekerja tepat ketika dokumen penting akan dicetak. Semua manusia sedang rapat online. Satu saksi tidak bisa bicara.',
    objective: 'Jangan menganggap pelakunya harus manusia.',
    suspects: [
      { id: 'nisa-p', name: 'Nisa', emoji: '👩🏻‍💻', role: 'Pemilik dokumen', alibi: '“Aku ada di video call dan layar menyala sepanjang waktu.”' },
      { id: 'aldi', name: 'Aldi', emoji: '🧑🏼‍🔧', role: 'Teknisi kantor', alibi: '“Aku sedang presentasi di ruangan lain.”' },
      { id: 'milo', name: 'Milo', emoji: '🐈', role: 'Kucing penghuni kantor', alibi: '“Meong.”' }
    ], answer: 'milo',
    clues: [
      { id: 'paw', icon: '🐾', title: 'Jejak kaki', teaser: 'Ada jejak kecil dekat tombol daya.', detail: 'Jejak kaki berdebu terlihat di atas panel printer. Ukurannya jauh lebih kecil daripada telapak tangan orang dewasa.', evidence: 'KUAT' },
      { id: 'button', icon: '🔴', title: 'Tombol daya', teaser: 'Tombolnya berada sangat rendah.', detail: 'Tombol daya printer terletak dekat lantai dan mudah ditekan oleh hewan yang melompat ke meja rendah. Ada bulu oranye menempel di tepinya.', evidence: 'KUAT' },
      { id: 'meeting', icon: '📹', title: 'Rekaman rapat', teaser: 'Dua orang punya alibi yang bisa dicek.', detail: 'Nisa terlihat di video call sampai printer mati. Presentasi Aldi juga direkam tanpa jeda pada waktu yang sama.', evidence: 'KONTEKS' }
    ],
    explanation: 'Milo adalah pelaku paling masuk akal: jejak kaki kecil, bulu oranye, dan posisi tombol daya cocok dengan kucing kantor. Nisa dan Aldi memiliki rekaman aktivitas yang berlangsung saat printer mati. Kasus ini resmi ditutup—tanpa tuntutan hukum untuk kucing.'
  },
  {
    id: 'wifi-berubah', number: 'CASE 006', title: 'Siapa mengganti password Wi-Fi?', shortTitle: 'Wi-Fi berubah', emoji: '📡', category: 'TEKNOLOGI', difficulty: 'SULIT', location: 'Meja router kantor', type: 'MISTERI JARINGAN',
    premise: 'Semua perangkat mendadak terputus. Password Wi-Fi berubah, dan catatan password lama sudah ditempel dengan stiker “jangan diubah”.',
    objective: 'Bandingkan alibi, log admin, dan perangkat yang benar-benar masuk ke halaman router.',
    suspects: [
      { id: 'sari', name: 'Sari', emoji: '👩🏻‍💼', role: 'Koordinator', alibi: '“Aku tidak ke meja router pagi ini.”' },
      { id: 'nando', name: 'Nando', emoji: '🧑🏽‍💻', role: 'Developer', alibi: '“Aku sedang memperbarui dependency proyek.”' },
      { id: 'putri', name: 'Putri', emoji: '👩🏼‍🔧', role: 'IT support', alibi: '“Aku hanya memeriksa kabel, tidak login ke router.”' }
    ], answer: 'putri',
    clues: [
      { id: 'adminlog', icon: '🛜', title: 'Log administrator', teaser: 'Satu sesi admin mengubah pengaturan.', detail: 'Router mencatat perubahan password pukul 09.12 dari sesi admin yang dibuka melalui terminal dukungan IT.', evidence: 'KUAT' },
      { id: 'ticket', icon: '🎫', title: 'Tiket dukungan', teaser: 'Ada pekerjaan yang dijadwalkan.', detail: 'Tiket IT mencatat Putri sedang menguji koneksi router pada pukul 09.00–09.30. Tugasnya adalah memeriksa kabel, bukan mengganti kredensial.', evidence: 'KUAT' },
      { id: 'laptop', icon: '💻', title: 'Aktivitas perangkat', teaser: 'Developer juga aktif di waktu yang sama.', detail: 'Laptop Nando mengunduh dependency pada pukul 09.12, tetapi tidak ada koneksi ke halaman admin router dari perangkat tersebut.', evidence: 'KONTEKS' }
    ], answerNote: 'putri',
    explanation: 'Log menunjukkan perubahan dilakukan melalui sesi admin di terminal dukungan IT, sementara tiket menempatkan Putri pada pekerjaan router tepat di rentang waktu itu. Aktivitas unduhan Nando hanya menunjukkan ia bekerja, bukan bahwa ia mengakses admin router.'
  }
];

const STORAGE_KEY = 'sebentar-detektif-v1';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function dailyCaseId(date = new Date()) {
  const key = localDateKey(date);
  const seed = Number(key.replaceAll('-', ''));
  return CASES[(seed % CASES.length)].id;
}
function rankFor(xp) {
  if (xp >= 500) return { name: 'Detektif Legendaris', badge: '✧', min: 500, next: 750 };
  if (xp >= 250) return { name: 'Detektif Senior', badge: '✦', min: 250, next: 500 };
  if (xp >= 100) return { name: 'Detektif Andal', badge: '◆', min: 100, next: 250 };
  if (xp >= 30) return { name: 'Detektif Junior', badge: '◈', min: 30, next: 100 };
  return { name: 'Detektif Magang', badge: '✦', min: 0, next: 30 };
}
function safeLoad() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      xp: Number.isFinite(parsed.xp) ? parsed.xp : 0,
      solved: parsed.solved && typeof parsed.solved === 'object' ? parsed.solved : {},
      runs: Number.isFinite(parsed.runs) ? parsed.runs : 0
    };
  } catch {
    return { xp: 0, solved: {}, runs: 0 };
  }
}
function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch { /* Private mode may disable storage. */ }
}
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
}
function getCase(id) { return CASES.find(c => c.id === id) || CASES[0]; }
function escapeText(text) {
  return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

const progress = safeLoad();
let currentCaseId = dailyCaseId();
let revealedClues = new Set();
let selectedSuspectId = '';
let wrongAttempts = 0;
let caseState = 'playing'; // playing | solved | revealed
let earnedThisRun = 0;
let busy = false;

function caseIsSolved(id) { return Boolean(progress.solved[id]?.solved); }
function renderStats() {
  const solvedCount = Object.values(progress.solved).filter(item => item?.solved).length;
  const best = Math.max(0, ...Object.values(progress.solved).map(item => Number(item?.bestScore) || 0));
  const rank = rankFor(progress.xp);
  $('#totalPoints').textContent = progress.xp;
  $('#solvedCount').innerHTML = `${solvedCount} <small>/ ${CASES.length}</small>`;
  $('#bestScore').textContent = best ? best : '—';
  $('#rankLabel').textContent = rank.name;
  $('#rankTitle').textContent = rank.name;
  $('#rankBadge').textContent = rank.badge;
  $('#rankProgressLabel').textContent = `${Math.max(0, progress.xp - rank.min)} / ${rank.next - rank.min} XP`;
  $('#rankProgressBar').style.width = `${Math.min(100, ((progress.xp - rank.min) / (rank.next - rank.min)) * 100)}%`;
  $('#rankFootnote').textContent = solvedCount === CASES.length ? 'Semua kasus berhasil kamu pecahkan. Ada detektif baru di kota ini.' : `${CASES.length - solvedCount} kasus lagi menunggu untuk kamu pecahkan.`;
  $('#archiveCount').textContent = String(CASES.length).padStart(2, '0');
}
function renderArchive() {
  const target = $('#caseArchive');
  target.innerHTML = CASES.map(item => {
    const solved = caseIsSolved(item.id);
    const active = item.id === currentCaseId;
    return `<button class="archive-item ${active ? 'active' : ''}" data-case-id="${item.id}" ${active ? 'aria-current="true"' : ''}>
      <span class="archive-emoji">${item.emoji}</span><span class="archive-meta"><strong>${escapeText(item.shortTitle)}</strong><small>${escapeText(item.category)} · ${solved ? 'Terpecahkan' : item.difficulty.toLowerCase()}</small></span><span class="archive-state ${solved ? 'done' : ''}" aria-label="${solved ? 'Selesai' : 'Belum selesai'}">${solved ? '✓' : '↗'}</span>
    </button>`;
  }).join('');
}
function renderCase() {
  const item = getCase(currentCaseId);
  $('#revealAnswerBtn')?.remove();
  revealedClues = new Set();
  selectedSuspectId = '';
  wrongAttempts = 0;
  caseState = 'playing';
  earnedThisRun = 0;
  busy = false;
  $('#sectionTitle').textContent = item.id === dailyCaseId() ? 'Kasus hari ini' : 'Berkas kasus';
  $('#todayLabel').textContent = item.id === dailyCaseId() ? `HARI INI · ${localDateKey().split('-').reverse().join('/')}` : 'ARSIP KASUS';
  $('#caseNumber').textContent = item.number;
  $('#caseDifficulty').textContent = item.difficulty;
  $('#caseLocation').textContent = item.location;
  $('#caseType').textContent = item.type;
  $('#caseTitle').textContent = item.title;
  $('#casePremise').textContent = item.premise;
  $('#caseObjective').textContent = item.objective;
  $('#caseIllustration').querySelector('.illustration-main').textContent = item.emoji;
  $('#caseSolvedTag').textContent = caseIsSolved(item.id) ? 'PERNAH DIPECAHKAN' : 'BELUM DIPECAHKAN';
  $('#clueCount').textContent = `0/${item.clues.length}`;
  $('#clueGrid').innerHTML = item.clues.map((clue, i) => `<button class="clue-card" data-clue-id="${clue.id}" aria-expanded="false">
      <span class="clue-top"><span class="clue-icon">${clue.icon}</span><span class="clue-status">KETUK UNTUK PERIKSA</span></span>
      <strong>${escapeText(clue.title)}</strong><span class="clue-copy">${escapeText(clue.teaser)}</span>
    </button>`).join('');
  $('#suspectGrid').innerHTML = item.suspects.map(suspect => `<button class="suspect-card" data-suspect-id="${suspect.id}" aria-pressed="false">
      <span class="suspect-selected-mark">✓</span><span class="suspect-avatar">${suspect.emoji}</span><strong>${escapeText(suspect.name)}</strong><p>${escapeText(suspect.role)}<br>${escapeText(suspect.alibi)}</p>
    </button>`).join('');
  $('#selectedSuspectNote').textContent = 'Pilih tersangka setelah memeriksa petunjuk.';
  $('#accuseBtn').disabled = true;
  $('#accuseBtn').innerHTML = 'Ajukan tuduhan <span>↗</span>';
  $('#feedbackPanel').hidden = true;
  $('#feedbackPanel').className = 'feedback-panel';
  $('#resultPanel').hidden = true;
  $('#caseCard').classList.remove('is-closed');
  $('#caseArchive').querySelectorAll('[data-case-id]').forEach(btn => btn.classList.toggle('active', btn.dataset.caseId === currentCaseId));
  $('#browseBtn').textContent = 'Lihat semua kasus ↓';
  $('#caseCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  renderArchive();
  renderStats();
}
function revealClue(clueId) {
  if (busy || caseState !== 'playing') return;
  const item = getCase(currentCaseId);
  const clue = item.clues.find(c => c.id === clueId);
  if (!clue) return;
  const card = $(`[data-clue-id="${clueId}"]`);
  const already = revealedClues.has(clueId);
  if (already) {
    revealedClues.delete(clueId);
    card.classList.remove('is-open');
    card.setAttribute('aria-expanded', 'false');
    card.querySelector('.clue-status').textContent = 'KETUK UNTUK PERIKSA';
    card.querySelector('.clue-copy').textContent = clue.teaser;
  } else {
    revealedClues.add(clueId);
    card.classList.add('is-open');
    card.setAttribute('aria-expanded', 'true');
    card.querySelector('.clue-status').textContent = clue.evidence;
    card.querySelector('.clue-copy').textContent = clue.detail;
  }
  $('#clueCount').textContent = `${revealedClues.size}/${item.clues.length}`;
}
function selectSuspect(suspectId) {
  if (caseState !== 'playing' || busy) return;
  selectedSuspectId = suspectId;
  const item = getCase(currentCaseId);
  const suspect = item.suspects.find(s => s.id === suspectId);
  $$('.suspect-card').forEach(card => {
    const selected = card.dataset.suspectId === suspectId;
    card.classList.toggle('selected', selected);
    card.setAttribute('aria-pressed', String(selected));
  });
  $('#selectedSuspectNote').textContent = `${suspect.name} dipilih. Sudah yakin dengan analisismu?`;
  $('#accuseBtn').disabled = false;
  $('#feedbackPanel').hidden = true;
}
function showFeedback(message, type = '') {
  const el = $('#feedbackPanel');
  el.className = `feedback-panel ${type}`.trim();
  el.textContent = message;
  el.hidden = false;
}
function scoreForRun() {
  return Math.max(20, 100 - revealedClues.size * 12 - wrongAttempts * 18);
}
function accuse() {
  if (caseState !== 'playing' || !selectedSuspectId || busy) return;
  const item = getCase(currentCaseId);
  if (selectedSuspectId !== item.answer) {
    wrongAttempts += 1;
    const selected = item.suspects.find(s => s.id === selectedSuspectId);
    const messages = [
      `${selected.name} memang tampak mencurigakan, tetapi satu hal penting belum cocok. Baca ulang petunjuk dan bandingkan alibinya.`,
      `Belum tepat. Jangan berhenti di petunjuk yang paling mencolok—cari dua bukti yang saling menguatkan.`,
      `Masih meleset. Coba fokus ke urutan waktu dan bukti yang bisa diverifikasi, bukan sekadar dugaan.`
    ];
    showFeedback(messages[Math.min(wrongAttempts - 1, messages.length - 1)], 'error');
    $('#selectedSuspectNote').textContent = `Percobaan ${wrongAttempts}. Kamu masih bisa menyelidiki dan memilih lagi.`;
    if (wrongAttempts >= 3) {
      $('#accuseBtn').innerHTML = 'Coba tuduh lagi <span>↗</span>';
      const reveal = document.createElement('button');
      reveal.className = 'button button-quiet';
      reveal.id = 'revealAnswerBtn';
      reveal.textContent = 'Ungkap solusi';
      if (!$('#revealAnswerBtn')) $('#accuseRow').appendChild(reveal);
    }
    return;
  }
  const alreadySolved = caseIsSolved(item.id);
  const score = alreadySolved ? 0 : scoreForRun();
  earnedThisRun = score;
  caseState = 'solved';
  busy = true;
  if (!alreadySolved) {
    const old = progress.solved[item.id];
    progress.solved[item.id] = { solved: true, bestScore: Math.max(score, Number(old?.bestScore) || 0), date: localDateKey(), attempts: wrongAttempts + 1 };
    progress.xp += score;
    progress.runs += 1;
    saveProgress();
  }
  $('#caseCard').classList.add('is-closed');
  $('#resultIcon').textContent = '✓';
  $('#resultEyebrow').textContent = 'CASE CLOSED';
  $('#resultTitle').textContent = alreadySolved ? 'Kasus terpecahkan lagi!' : 'Tajam sekali, Detektif!';
  $('#resultDescription').textContent = alreadySolved ? 'Kasus ini sudah pernah kamu selesaikan, jadi tidak ada XP tambahan untuk percobaan ulang.' : `Kamu berhasil mengidentifikasi ${item.suspects.find(s => s.id === item.answer).name} dengan menghubungkan bukti.`;
  $('#resultScore').textContent = alreadySolved ? '+0' : `+${score}`;
  $('#solutionText').textContent = item.explanation;
  $('#resultPanel').hidden = false;
  $('#feedbackPanel').hidden = true;
  $('#caseSolvedTag').textContent = 'KASUS TERPECAHKAN';
  $('#resultPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  renderStats(); renderArchive();
}
function revealSolution() {
  if (caseState !== 'playing') return;
  const item = getCase(currentCaseId);
  caseState = 'revealed';
  busy = true;
  $('#caseCard').classList.add('is-closed');
  $('#resultIcon').textContent = '⌕';
  $('#resultEyebrow').textContent = 'FILE DIBUKA';
  $('#resultTitle').textContent = `Jawabannya: ${item.suspects.find(s => s.id === item.answer).name}`;
  $('#resultDescription').textContent = 'Kamu membuka solusi tanpa menyelesaikan tuduhan. Baca rekonstruksi kejadian untuk melihat hubungan antar-bukti.';
  $('#resultScore').textContent = '+0';
  $('#solutionText').textContent = item.explanation;
  $('#resultPanel').hidden = false;
  $('#resultPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function startCase(id) {
  currentCaseId = CASES.some(c => c.id === id) ? id : dailyCaseId();
  renderCase();
}
function shareResult() {
  const item = getCase(currentCaseId);
  const result = caseState === 'solved' ? (caseIsSolved(item.id) ? 'Kasus berhasil dipecahkan' : 'Kasus selesai') : 'Aku sedang menyelidiki';
  const text = `🕵️ Sebentar, Detektif!\n${result}: ${item.title}\nXP: ${earnedThisRun}\nCoba pecahkan misterinya juga di ${location.href}`;
  if (navigator.share) {
    navigator.share({ title: 'Sebentar, Detektif!', text }).catch(() => {});
  } else if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => toast('Hasil berhasil disalin untuk dibagikan.')).catch(() => fallbackCopy(text));
  } else fallbackCopy(text);
}
function fallbackCopy(text) {
  const input = document.createElement('textarea'); input.value = text; input.setAttribute('readonly', '');
  input.style.position = 'fixed'; input.style.opacity = '0'; document.body.appendChild(input); input.select();
  try { document.execCommand('copy'); toast('Hasil disalin untuk dibagikan.'); } catch { toast('Salin teks hasil dari perangkatmu.'); }
  input.remove();
}

$('#clueGrid').addEventListener('click', event => {
  const card = event.target.closest('[data-clue-id]');
  if (card) revealClue(card.dataset.clueId);
});
$('#suspectGrid').addEventListener('click', event => {
  const card = event.target.closest('[data-suspect-id]');
  if (card) selectSuspect(card.dataset.suspectId);
});
$('#caseArchive').addEventListener('click', event => {
  const button = event.target.closest('[data-case-id]');
  if (button) startCase(button.dataset.caseId);
});
$('#accuseBtn').addEventListener('click', accuse);
$('#feedbackPanel').addEventListener('click', event => { if (event.target.id === 'revealAnswerBtn') revealSolution(); });
$('#accuseRow').addEventListener('click', event => { if (event.target.id === 'revealAnswerBtn') revealSolution(); });
$('#dailyBtn').addEventListener('click', () => startCase(dailyCaseId()));
$('#browseBtn').addEventListener('click', () => { $('#archiveSection').scrollIntoView({ behavior: 'smooth', block: 'start' }); toast('Pilih salah satu berkas di Arsip Kasus.'); });
$('#footerNextBtn').addEventListener('click', () => { $('#archiveSection').scrollIntoView({ behavior: 'smooth', block: 'start' }); toast('Pilih misteri berikutnya dari arsip.'); });
$('#nextCaseBtn').addEventListener('click', () => {
  const index = CASES.findIndex(c => c.id === currentCaseId);
  const next = CASES.slice(index + 1).find(c => !caseIsSolved(c.id)) || CASES.find(c => !caseIsSolved(c.id)) || CASES[(index + 1) % CASES.length];
  startCase(next.id);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
$('#replayBtn').addEventListener('click', () => startCase(currentCaseId));
$('#shareResultBtn').addEventListener('click', shareResult);
$('#howToBtn').addEventListener('click', () => $('#howToDialog').showModal());
$('#closeGuideBtn').addEventListener('click', () => $('#howToDialog').close());
$('#howToDialog').addEventListener('click', event => { if (event.target === $('#howToDialog')) $('#howToDialog').close(); });

function init() {
  $('#todayLabel').textContent = `HARI INI · ${localDateKey().split('-').reverse().join('/')}`;
  renderCase();
  renderArchive();
  renderStats();
}
init();

// Expose pure helpers only for lightweight unit tests; the game still runs without a test harness.
if (typeof globalThis !== 'undefined') {
  globalThis.SebentarDetektifTest = { CASES, dailyCaseId, rankFor, scoreForClues: (clueCount, wrongCount) => Math.max(20, 100 - clueCount * 12 - wrongCount * 18) };
}
