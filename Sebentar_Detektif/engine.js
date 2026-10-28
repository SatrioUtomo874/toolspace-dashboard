'use strict';

(function attachDetectiveEngine(root) {
  const THEMES = {
    fun: { label: 'Fun & Ceria', emoji: '🎈', tone: 'bright' },
    tense: { label: 'Tegang', emoji: '🕯️', tone: 'dark' },
    cozy: { label: 'Cozy', emoji: '☕', tone: 'soft' },
    noir: { label: 'Noir', emoji: '🌃', tone: 'dark' }
  };

  const NAMES = [
    ['Nara', '👩🏻‍🎨'], ['Bima', '🧢'], ['Kiko', '🧑🏻‍💻'], ['Tania', '👩🏽‍💼'],
    ['Reza', '🧑🏽‍🎤'], ['Omar', '👨🏾‍💻'], ['Acha', '👩🏻‍🎤'], ['Dewa', '🧑🏽‍💻'],
    ['Nisa', '👩🏽'], ['Galih', '🧑🏻‍🌾'], ['Fira', '👩🏼‍🔬'], ['Jo', '🧑🏽'],
    ['Aldi', '🧑🏼‍🔧'], ['Mika', '🧑🏻'], ['Sasha', '👩🏼'], ['Dito', '🧑🏽‍🚀'],
    ['Rumi', '🧑🏻‍🎨'], ['Luna', '👩🏻‍🚀'], ['Tara', '👩🏽‍🔬'], ['Bayu', '🧑🏽‍🍳'],
    ['Kei', '🧑🏻‍🎤'], ['Mori', '🧑🏽'], ['Ari', '🧑🏼‍💼'], ['Seno', '🧑🏾‍💻'],
    ['Caca', '👩🏻‍💻'], ['Damar', '🧑🏻‍🔬'], ['Raka', '🧑🏽‍🎨'], ['Maya', '👩🏽‍💼']
  ];

  const ROLES = [
    'Koordinator acara', 'Tim kreatif', 'Admin sistem', 'Penjaga studio', 'Kurator koleksi',
    'Teknisi', 'Asisten produksi', 'Pengelola arsip', 'Staf operasional', 'Fotografer',
    'Analis data', 'Relawan baru', 'Penanggung jawab inventaris', 'Penulis naskah', 'Petugas keamanan'
  ];

  const SETTINGS = [
    { name: 'studio podcast', mood: 'cozy', emoji: '🎙️' },
    { name: 'kafe kecil dekat stasiun', mood: 'cozy', emoji: '☕' },
    { name: 'ruang arsip lantai tiga', mood: 'noir', emoji: '🗄️' },
    { name: 'galeri seni malam hari', mood: 'noir', emoji: '🖼️' },
    { name: 'kantor kreatif yang ramai', mood: 'fun', emoji: '🪴' },
    { name: 'ruang kontrol festival', mood: 'tense', emoji: '🎛️' },
    { name: 'laboratorium prototipe', mood: 'tense', emoji: '🧪' },
    { name: 'perpustakaan komunitas', mood: 'cozy', emoji: '📚' },
    { name: 'backstage pertunjukan', mood: 'tense', emoji: '🎭' },
    { name: 'toko barang antik', mood: 'noir', emoji: '🕰️' },
    { name: 'markas klub sekolah', mood: 'fun', emoji: '🎒' },
    { name: 'ruang permainan retro', mood: 'fun', emoji: '🕹️' }
  ];

  const INCIDENTS = [
    { kind: 'kehilangan', label: 'MISTERI KEHILANGAN', title: 'Siapa yang membawa pergi {thing}?', thing: ['prototipe mungil', 'kotak kaset langka', 'lencana edisi khusus', 'buku catatan bersegel', 'kunci lemari kaca', 'kamera analog', 'kartu akses emas', 'miniatur kapal'], premise: '{thing} hilang dari tempatnya tepat sebelum acara dimulai', motive: ['ingin meminjam tanpa izin', 'panik karena benda itu akan dipensiunkan', 'ingin menyembunyikan kesalahan kecil', 'ingin membuat kejutan yang kebablasan'], evidence: 'bukti penanganan benda' },
    { kind: 'digital', label: 'MISTERI DIGITAL', title: 'Siapa yang mengubah {thing}?', thing: ['file presentasi', 'playlist rahasia', 'jadwal pertunjukan', 'nama pemenang lomba', 'desain poster final', 'urutan video pembuka'], premise: 'isi {thing} berubah beberapa menit sebelum digunakan', motive: ['ingin menyelamatkan reputasi tim', 'ingin membuat lelucon', 'ingin menutupi kesalahan edit', 'ingin mengubah hasil keputusan'], evidence: 'jejak perangkat' },
    { kind: 'pertukaran', label: 'MISTERI TERTUKAR', title: 'Siapa yang menukar {thing}?', thing: ['dua paket hadiah', 'label karya final', 'amplop pemenang', 'kotak pesanan khusus', 'dua kartu undangan', 'wadah sampel'], premise: '{thing} tertukar dan hampir dikirim ke orang yang salah', motive: ['ingin membetulkan kesalahan diam-diam', 'ingin memenangkan kompetisi', 'terburu-buru dan berharap tidak ketahuan', 'ingin menukar isi untuk lelucon'], evidence: 'jejak label dan waktu' },
    { kind: 'sabotase', label: 'MISTERI SABOTASE', title: 'Kenapa {thing} berhenti tepat waktu?', thing: ['lampu panggung', 'printer utama', 'mesin kopi', 'proyektor ruang rapat', 'speaker pembuka acara', 'papan skor digital'], premise: '{thing} berhenti bekerja tepat sebelum momen penting', motive: ['ingin menunda pengumuman', 'mencoba memperbaiki tanpa izin', 'ingin menghindari tugas', 'ingin membuat kejutan dramatis'], evidence: 'catatan akses dan kondisi alat' },
    { kind: 'kebocoran', label: 'MISTERI KEBOCORAN', title: 'Siapa yang membocorkan {thing}?', thing: ['rencana kejutan', 'draft pengumuman', 'foto di balik layar', 'catatan rapat privat', 'desain yang belum dirilis', 'daftar lagu rahasia'], premise: 'informasi dari {thing} yang seharusnya rahasia muncul di grup umum', motive: ['ingin mendapat perhatian', 'tidak sadar tautannya publik', 'mencoba membalas candaan', 'ingin mengingatkan seseorang'], evidence: 'jejak berbagi' },
    { kind: 'keanehan', label: 'MISTERI ANEH', title: 'Siapa yang membuat {thing} jadi kacau?', thing: ['susunan tanaman mini', 'papan pengumuman', 'galeri foto tim', 'koleksi camilan', 'pajangan maskot', 'perangko koleksi'], premise: 'ada yang mengacak {thing} saat semua orang bersikeras tidak menyentuhnya', motive: ['ingin mengerjai teman', 'mencari benda yang hilang', 'ingin membersihkan tapi salah menata', 'membuat eksperimen kecil'], evidence: 'pola jejak dan urutan waktu' }
  ];

  const OBJECT_TRACES = [
    'serat pita biru dengan pola yang sama seperti tali pada tas',
    'serbuk glitter perak yang sama dengan hiasan di meja kerja',
    'potongan label dengan nomor inventaris yang cocok',
    'sidik noda tinta ungu yang masih basah',
    'bekas perekat berbentuk setengah lingkaran',
    'jejak tanah halus yang sama dengan pot di meja kerja',
    'serpihan kertas dengan tepi sobekan yang cocok',
    'jejak kapur neon dari ruang persiapan'
  ];

  const MOTIVE_PHRASES = [
    'catatan tentang tenggat yang terlewat',
    'pesan yang menunjukkan kepanikan soal hasil acara',
    'draf permintaan maaf yang belum dikirim',
    'pengingat untuk memperbaiki kesalahan sebelum orang lain melihatnya',
    'pesan bercanda yang konteksnya belum jelas',
    'catatan tentang hadiah kejutan untuk rekan'
  ];

  const TIME_SLOTS = [
    { event: '19.42', early: '19.18', before: '19.35', later: '19.51' },
    { event: '14.26', early: '14.03', before: '14.17', later: '14.39' },
    { event: '10.18', early: '09.54', before: '10.07', later: '10.31' },
    { event: '21.07', early: '20.42', before: '20.55', later: '21.19' },
    { event: '16.34', early: '16.10', before: '16.23', later: '16.47' },
    { event: '12.51', early: '12.25', before: '12.39', later: '13.04' },
    { event: '18.13', early: '17.48', before: '18.01', later: '18.27' }
  ];

  const MOTIVES = [
    'ingin mencegah kesalahan itu diketahui saat acara berlangsung',
    'ingin membuat lelucon yang ternyata kelewatan',
    'ingin menyembunyikan keteledoran sendiri',
    'ingin mengubah hasil tanpa melalui prosedur resmi',
    'berniat menolong, tetapi memilih cara yang salah',
    'ingin membuat kejutan tanpa meminta izin'
  ];

  const QUOTES = [
    '“Aku cuma lewat sebentar.”', '“Seingatku, semuanya masih normal.”',
    '“Aku tidak menyentuh bagian itu.”', '“Aku baru tahu setelah semua orang heboh.”',
    '“Mungkin ada yang salah membaca waktunya.”', '“Aku memang ada di sana, tapi bukan untuk itu.”',
    '“Aku kira sudah ada yang mengurusnya.”', '“Aku tidak menyangka hal kecil ini jadi kasus.”'
  ];

  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < String(value).length; i += 1) {
      hash ^= String(value).charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function makeRng(seed) {
    let state = hashString(seed) || 0x9e3779b9;
    return function random() {
      state += 0x6D2B79F5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, list) { return list[Math.floor(rng() * list.length)]; }
  function shuffle(rng, list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function chooseDistinct(rng, list, count) { return shuffle(rng, list).slice(0, count); }
  function slugify(s) { return String(s).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function getDailySeed(date = new Date()) {
    const day = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    return `daily-${day}`;
  }
  function makeRandomSeed() {
    const rand = Math.random().toString(36).slice(2, 8);
    return `case-${Date.now().toString(36)}-${rand}`;
  }

  function validateCase(item) {
    const errors = [];
    if (!item || !Array.isArray(item.suspects) || item.suspects.length < 3) errors.push('suspects-minimum');
    if (!item || !Array.isArray(item.clues) || item.clues.length < 3) errors.push('clues-minimum');
    if (!item || !item.suspects?.some(s => s.id === item.answer)) errors.push('answer-not-in-suspects');
    if (item && new Set(item.suspects.map(s => s.id)).size !== item.suspects.length) errors.push('duplicate-suspect-id');
    if (item && new Set(item.clues.map(c => c.id)).size !== item.clues.length) errors.push('duplicate-clue-id');
    const support = item?.clues?.filter(c => c.supports === item.answer).length || 0;
    if (support < 2) errors.push('not-enough-independent-support');
    if (item?.suspects?.length && item?.clues?.length) {
      const plausible = item.suspects.filter(suspect => item.clues.filter(clue => clue.supports === suspect.id).length >= 2);
      if (plausible.length !== 1 || plausible[0]?.id !== item.answer) errors.push('solution-not-unique-by-evidence-tags');
    }
    if (!item?.clues?.some(c => c.clears && c.clears !== item.answer)) errors.push('no-innocent-clearing-clue');
    if (item?.suspects?.some(s => !s.name || !s.alibi)) errors.push('incomplete-suspect');
    if (item?.clues?.some(c => !c.title || !c.detail)) errors.push('incomplete-clue');
    return { valid: errors.length === 0, errors };
  }

  function generateCase(seed, options = {}) {
    // Difficulty and case details use separate seeded streams so a shared URL
    // reproduces exactly the same case even when difficulty is passed explicitly.
    const rng = makeRng(`${seed}|content`);
    const difficultyRng = makeRng(`${seed}|difficulty`);
    const difficulty = ['easy', 'medium', 'hard'].includes(options.difficulty) ? options.difficulty : pick(difficultyRng, ['easy', 'medium', 'hard']);
    const suspectCount = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5;
    const clueCount = difficulty === 'hard' ? 5 : 4; // Always retain the innocent-clearing clue.
    const incident = pick(rng, INCIDENTS);
    const setting = pick(rng, SETTINGS);
    const time = pick(rng, TIME_SLOTS);
    const thing = pick(rng, incident.thing);
    const names = chooseDistinct(rng, NAMES, suspectCount);
    const roles = chooseDistinct(rng, ROLES, suspectCount);
    const culpritIndex = Math.floor(rng() * suspectCount);
    const culpritName = names[culpritIndex][0];
    const culpritId = `sus-${culpritIndex}-${slugify(culpritName)}`;
    const culpritMotive = pick(rng, incident.motive);
    const trace = pick(rng, OBJECT_TRACES);
    const note = pick(rng, MOTIVE_PHRASES);
    const eventTime = time.event;
    const awayPlace = pick(rng, SETTINGS.filter(s => s.name !== setting.name)).name;

    const suspects = names.map(([name, emoji], i) => {
      const id = `sus-${i}-${slugify(name)}`;
      const isCulprit = i === culpritIndex;
      const role = roles[i];
      const earlierReason = pick(rng, [
        `mengecek persiapan di ${setting.name}`,
        'mengantar minuman untuk tim',
        'mengambil alat kerja yang tertinggal',
        'mengembalikan barang inventaris',
        'mencari kabel pengisi daya'
      ]);
      const alibi = isCulprit
        ? `“Aku berada di ${awayPlace} sekitar ${time.before} sampai ${time.later}. Aku tidak mendekati ${setting.name}.”`
        : i === (culpritIndex + 1) % suspectCount
          ? `“Aku sempat ke ${setting.name} sekitar ${time.early} untuk ${earlierReason}, lalu pergi sebelum ${eventTime}.”`
          : `“Aku ada di ${awayPlace} saat sekitar ${eventTime}. Aku tidak mengurus ${thing}.”`;
      const behavior = pick(rng, ['terlihat gugup', 'menjawab terlalu cepat', 'berusaha mengalihkan pembicaraan', 'berbicara santai', 'terus melihat catatan kecil']);
      return {
        id, name, emoji, role, alibi, isCulprit,
        behavior,
        truth: isCulprit ? 'berada di lokasi ketika kejadian berlangsung' : (i === (culpritIndex + 1) % suspectCount ? `datang lebih awal untuk ${earlierReason}` : `berada di ${awayPlace} saat kejadian`),
        relation: isCulprit ? `mengetahui ${thing} dan sempat berada dekat lokasi` : `punya akses wajar sebagai ${role.toLowerCase()}`,
        responses: null
      };
    });

    const culprit = suspects[culpritIndex];
    const innocentWithAccess = suspects[(culpritIndex + 1) % suspectCount];
    const innocentOther = suspects[(culpritIndex + 2) % suspectCount];
    const allClues = [
      {
        id: 'access-log', icon: '🪪', title: 'Log akses lokasi', teaser: 'Ada catatan masuk di waktu penting.', evidence: 'KUAT', supports: culprit.id,
        detail: `Catatan akses mencatat identitas ${culprit.name} masuk ke ${setting.name} pada ${eventTime}. Catatan ini dibuat otomatis, bukan berdasarkan ingatan saksi.`,
        reasoning: `${culprit.name} tercatat berada di lokasi pada waktu kejadian.`
      },
      {
        id: 'physical-trace', icon: pick(rng, ['🔬', '🧵', '🧾', '📷', '🧤', '🧩']), title: pick(rng, ['Jejak yang tertinggal', 'Temuan di dekat lokasi', 'Pemeriksaan benda']), teaser: 'Ada detail kecil yang cocok dengan satu orang.', evidence: 'KUAT', supports: culprit.id,
        detail: `Pemeriksaan di dekat ${thing} menemukan ${trace}. Catatan inventaris menunjukkan jejak yang sama ditemukan pada barang kerja ${culprit.name}; kecocokan ini dicatat sebelum tersangka diperiksa.`,
        reasoning: `Jejak spesifik menghubungkan ${culprit.name} dengan benda atau lokasi.`
      },
      {
        id: 'timeline', icon: '🕰️', title: 'Potongan timeline', teaser: 'Dua keterangan tidak cocok dengan jam kejadian.', evidence: 'KUAT', supports: culprit.id,
        detail: `Kamera koridor merekam ${culprit.name} keluar dari ${setting.name} pada ${time.later}. Ini bertentangan dengan pengakuannya bahwa ia berada di ${awayPlace} sepanjang ${time.before}–${time.later}. Waktu kamera tersinkron dengan sistem akses.`,
        reasoning: `Alibi ${culprit.name} bertentangan dengan rekaman waktu independen.`
      },
      {
        id: 'early-access', icon: '🚪', title: 'Kunjungan sebelumnya', teaser: 'Orang lain memang masuk, tetapi waktunya berbeda.', evidence: 'KONTEKS', clears: innocentWithAccess.id,
        detail: `${innocentWithAccess.name} masuk ke ${setting.name} pada ${time.early} untuk urusan yang tercatat: ${innocentWithAccess.truth.replace(/^datang lebih awal untuk /, '')}. Ia keluar sebelum ${eventTime}. Akses ini terlihat mencurigakan pada awalnya, tetapi tidak menempatkannya di sana saat kejadian.`,
        reasoning: `Bukti ini menjelaskan akses ${innocentWithAccess.name} dan memisahkannya dari waktu kejadian.`
      },
      {
        id: 'motive-note', icon: '🗒️', title: 'Catatan yang belum dikirim', teaser: 'Sebuah catatan memberi konteks, bukan bukti tunggal.', evidence: 'KONTEKS', supports: culprit.id,
        detail: `Di perangkat yang digunakan ${culprit.name}, ditemukan ${note}. Isinya menyebut ${culpritMotive}. Catatan ini tidak membuktikan tindakan sendirian, tetapi selaras dengan jejak waktu dan temuan fisik.`,
        reasoning: `Motif memberi konteks, sedangkan bukti waktu dan jejak menjadi dasar utama.`
      }
    ].slice(0, clueCount);

    // Hard cases need five clues; all cases include 2+ direct supports and one innocent-clearing clue.
    if (!allClues.some(c => c.clears) || allClues.filter(c => c.supports === culprit.id).length < 2) {
      throw new Error('Generated case failed basic evidence construction');
    }

    const themeOptions = [setting.mood, 'fun', 'tense', 'cozy', 'noir'];
    const theme = pick(rng, themeOptions);
    const id = `generated-${hashString(`${seed}|${difficulty}`).toString(36)}`;
    const caseNumber = `CASE-${hashString(seed).toString(16).slice(0, 5).toUpperCase()}`;
    const headline = incident.title.replace('{thing}', thing);
    const themeText = {
      fun: 'Ada yang bikin suasana mendadak heboh.', tense: 'Ada sesuatu yang tidak beres, dan waktunya semakin sempit.',
      cozy: 'Misteri kecil muncul di tempat yang biasanya terasa aman.', noir: 'Di balik suasana tenang, satu detail tidak pernah berbohong.'
    };
    const item = {
      id, seed: String(seed), number: caseNumber, title: headline, shortTitle: headline, emoji: setting.emoji,
      category: incident.label, difficulty: difficulty === 'easy' ? 'MUDAH' : difficulty === 'medium' ? 'SEDANG' : 'SULIT',
      difficultyKey: difficulty, location: setting.name, type: incident.label, theme,
      time: eventTime,
      premise: `Di ${setting.name}, ${incident.premise.replace('{thing}', thing)}. ${themeText[theme]} ${suspectCount} orang punya cerita yang harus diperiksa.`,
      objective: `Cocokkan waktu, jejak, dan keterangan para tersangka. Jangan menuduh hanya karena seseorang terlihat gugup.`,
      suspects, clues: allClues, answer: culprit.id, culpritName: culprit.name,
      motive: culpritMotive, culpritMotive,
      explanation: `${culprit.name} adalah kesimpulan yang paling didukung oleh berkas ini. Log akses menempatkannya di ${setting.name} pada ${eventTime}; ${trace} menghubungkan ${culprit.name} dengan ${thing}; dan rekaman kamera pada ${time.later} bertentangan dengan alibinya. ${innocentWithAccess.name} memang datang pada ${time.early}, tetapi catatan menunjukkan ia pergi sebelum kejadian. Motif “${culpritMotive}” membantu memberi konteks, tetapi bukan bukti utama.`,
      logic: { answerId: culprit.id, supports: [ 'access-log', 'physical-trace', 'timeline' ], clears: { clueId: 'early-access', suspectId: innocentWithAccess.id } },
      questions: [
        { id: 'where', label: 'Tanya alibi', prompt: `Di mana kamu sekitar ${eventTime}?` },
        { id: 'object', label: 'Tanya benda', prompt: `Apa yang kamu ketahui tentang ${thing}?` },
        { id: 'evidence', label: 'Tunjukkan bukti waktu', prompt: `Bagaimana kamu menjelaskan catatan akses dan rekaman sekitar ${eventTime}?` },
        { id: 'motive', label: 'Tanya motif', prompt: 'Ada alasan pribadi yang membuatmu ingin mengubah keadaan?' }
      ],
      hints: [
        { title: 'Pisahkan akses dan kejadian', text: `Seseorang memang sempat datang lebih awal ke ${setting.name}, tetapi itu belum berarti ia ada di lokasi pada ${eventTime}.` },
        { title: 'Cari dua bukti independen', text: 'Cocokkan log otomatis dengan jejak fisik atau rekaman waktu. Jangan membuat kesimpulan dari motif atau sikap gugup saja.' },
        { title: 'Periksa alibi yang bertentangan', text: `Bandingkan pernyataan ${culprit.name} dengan catatan akses dan rekaman kamera. Dua catatan itu menempatkannya dekat lokasi pada waktu yang sama.` }
      ]
    };

    suspects.forEach((suspect, index) => {
      suspect.responses = {
        where: suspect.isCulprit
          ? `“Aku tadi bilang berada di ${awayPlace}, tapi aku tidak ingat tepatnya jam berapa. Mungkin catatannya perlu dicek lagi.”`
          : index === (culpritIndex + 1) % suspectCount
            ? `“Aku memang sempat di ${setting.name} pukul ${time.early}, untuk ${suspect.truth.replace(/^datang lebih awal untuk /, '')}. Aku sudah pergi sebelum ${eventTime}.”`
            : `“Aku berada di ${awayPlace} sekitar ${eventTime}. Kalau perlu, aktivitas itu bisa dicocokkan dengan catatan waktunya.”`,
        object: suspect.isCulprit
          ? `“Aku tahu ${thing} ada di sana. Aku punya alasan berada di sekitar lokasi, tapi aku tidak mau langsung menyimpulkan apa pun.”`
          : `“Aku tahu ${thing} dari persiapan biasa. Sebagai ${suspect.role.toLowerCase()}, aku bisa saja punya akses tanpa melakukan kejadian itu.”`,
        evidence: suspect.isCulprit
          ? `“Aku tidak bisa menjelaskan kenapa catatan akses dan kamera menunjukkan waktu yang berdekatan. Aku perlu memikirkan jawabanku.”`
          : `“Coba cocokkan waktu bukti itu. Catatan yang menempatkanku di lokasi harus sesuai dengan jam kejadian, bukan sekadar kunjungan sebelumnya.”`,
        motive: suspect.isCulprit
          ? `“Aku sedang khawatir soal sesuatu yang bisa memperburuk keadaan. Tapi kekhawatiran saja bukan bukti bahwa aku melakukan semuanya.”`
          : `“Mungkin aku punya alasan untuk kesal atau bercanda, tetapi tidak ada bukti waktuku cocok dengan kejadian itu.”`
      };
    });

    const validation = validateCase(item);
    if (!validation.valid) throw new Error(`Invalid generated case: ${validation.errors.join(', ')}`);
    return item;
  }

  function scoreCase({ difficulty = 'easy', revealedHints = 0, wrongAttempts = 0, daily = false } = {}) {
    const base = difficulty === 'hard' ? 120 : difficulty === 'medium' ? 100 : 80;
    const raw = Math.max(15, base - Math.max(0, revealedHints) * 15 - Math.max(0, wrongAttempts) * 18);
    return daily ? Math.round(raw * 1.15) : raw;
  }

  function rankFor(xp) {
    if (xp >= 700) return { name: 'Legenda Kota', icon: '👑', min: 700, next: 1100 };
    if (xp >= 400) return { name: 'Detektif Legendaris', icon: '🦉', min: 400, next: 700 };
    if (xp >= 220) return { name: 'Detektif Senior', icon: '🕵️', min: 220, next: 400 };
    if (xp >= 100) return { name: 'Detektif Andal', icon: '🔎', min: 100, next: 220 };
    if (xp >= 30) return { name: 'Detektif Junior', icon: '🧩', min: 30, next: 100 };
    return { name: 'Detektif Magang', icon: '🗂️', min: 0, next: 30 };
  }

  const api = { THEMES, generateCase, validateCase, scoreCase, rankFor, getDailySeed, makeRandomSeed, hashString };
  root.DetectiveEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
