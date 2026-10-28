(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CVAnalyzer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SECTION_PATTERNS = {
    experience: /(?:pengalaman\s+(?:kerja|profesional|organisasi)|riwayat\s+pekerjaan|work\s+experience|professional\s+experience|employment\s+history|experience\s*&\s*leadership)/i,
    education: /(?:pendidikan|riwayat\s+pendidikan|education|academic\s+background|education\s*&\s*training)/i,
    skills: /(?:keahlian|keterampilan|skills|kompetensi|technical\s+skills|core\s+skills|kemampuan)/i,
    projects: /(?:proyek|projek|projects|portofolio|portfolio|selected\s+work)/i,
    certifications: /(?:sertifikasi|sertifikat|certifications?|licenses?|lisensi|pelatihan|training)/i,
    summary: /(?:profil\s+(?:singkat|profesional)?|tentang\s+saya|ringkasan|summary|professional\s+profile|objective|career\s+objective)/i
  };
  const ROLE_KEYWORDS = {
    general: [],
    admin: ['administrasi','administratif','excel','microsoft office','word','arsip','data entry','laporan','dokumen','penginputan','surat menyurat','rekapitulasi','spreadsheet','database'],
    electrical: ['maintenance','electrical','listrik','plc','troubleshooting','preventive maintenance','wiring','mesin','multimeter','panel listrik','diagram listrik','instalasi','perawatan','perbaikan'],
    it: ['python','javascript','html','css','api','git','sql','database','iot','arduino','esp32','debugging','programming','pengembangan aplikasi','web development','testing'],
    customer: ['customer service','pelanggan','penjualan','sales','target','negosiasi','crm','retensi','komplain','komunikasi','pelayanan','follow up'],
    design: ['figma','photoshop','illustrator','ui/ux','desain','branding','video editing','editing','canva','prototyping','visual','portofolio'],
    fresh: ['proyek','organisasi','magang','praktik kerja','sertifikasi','pelatihan','portofolio','kompetensi','prestasi','volunteer']
  };
  const ROLE_LABELS = { general:'Umum', admin:'Admin / Administrasi', electrical:'Teknisi / Maintenance Electrical', it:'IT / Programmer', customer:'Customer Service / Sales', design:'Desain / Konten Kreatif', fresh:'Fresh Graduate / Entry Level' };
  const ACTION_VERBS = ['mengelola','menyusun','menganalisis','menganalisa','mengembangkan','membangun','meningkatkan','mengurangi','memperbaiki','memimpin','mengkoordinasikan','mengkoordinasi','mengoperasikan','melakukan','memastikan','menerapkan','merancang','mengimplementasikan','mengoptimalkan','menangani','melayani','mencatat','memverifikasi','memproses','menyelesaikan','memelihara','memasang','menguji','memantau','membuat','menyediakan','merapikan','mengarsipkan','menginput','menyelesaikan','implemented','developed','managed','created','improved','increased','reduced','led','designed','built','analyzed','maintained','operated','coordinated','delivered','resolved','processed','achieved','organized','supported'];
  const WEAK_PHRASES = ['bertanggung jawab atas','bertanggungjawab atas','membantu dalam','membantu pekerjaan','melakukan tugas','bekerja sebagai','responsible for','duties included','tasked with','hard worker','pekerja keras','mampu bekerja dalam tim','mampu berkomunikasi dengan baik','good communication skills','fast learner'];
  const STOPWORDS = new Set(('yang dan atau untuk dari dengan pada dalam sebagai oleh karena saat agar akan dapat bisa merupakan adalah serta suatu para sebuah setiap terhadap antara juga telah sudah lebih sangat pekerjaan posisi kandidat perusahaan lowongan persyaratan pengalaman minimal memiliki mampu melakukan bertanggung jawab dibutuhkan required preferred skills skill ability abilities years year using use including role team candidate job work working responsibility responsibilities good strong excellent knowledge must should ideal basic advanced required qualification qualification qualifications').split(/\s+/));

  function cleanText(input) {
    return String(input || '').replace(/\r/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }
  function countMatches(text, re) { const m = String(text || '').match(re); return m ? m.length : 0; }
  function findSections(text) { const out = {}; Object.keys(SECTION_PATTERNS).forEach(k => out[k] = SECTION_PATTERNS[k].test(text)); return out; }
  function hasEmail(text) { return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text); }
  function hasPhone(text) { return /(?:\+?62|0)\s?\d(?:[\s().-]?\d){7,13}/.test(text); }
  function keywordTokens(text) {
    const tokens = (String(text || '').toLowerCase().match(/[a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ0-9+#./-]{2,}/g) || [])
      .map(s => s.replace(/^[^a-z]+|[^a-z0-9+#]+$/gi, ''))
      .filter(s => s.length >= 3 && !STOPWORDS.has(s) && !/^\d+$/.test(s));
    const freq = new Map();
    tokens.forEach(t => freq.set(t, (freq.get(t) || 0) + 1));
    return Array.from(freq.entries()).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])).map(x => x[0]);
  }
  function jobKeywords(jobDescription) {
    const tokens = keywordTokens(jobDescription);
    return tokens.filter(t => !['microsoft','google','office','company'].includes(t)).slice(0, 16);
  }
  function containsWholeOrPhrase(text, keyword) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    try { return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'iu').test(text); }
    catch (_) { return new RegExp(`(^|\\W)${escaped}($|\\W)`, 'i').test(text); }
  }
  function matchKeywords(cvText, keywords) {
    const lower = cvText.toLowerCase();
    const matched = keywords.filter(k => containsWholeOrPhrase(lower, k.toLowerCase()));
    return { matched, missing: keywords.filter(k => !matched.includes(k)), percent: keywords.length ? Math.round(matched.length / keywords.length * 100) : null };
  }
  function linesOf(text) { return cleanText(text).split('\n').map(s => s.trim()).filter(Boolean); }
  function actionVerbLineCount(lines) {
    return lines.filter(line => ACTION_VERBS.some(v => new RegExp('(?:^|[^a-z])' + v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:$|[^a-z])', 'i').test(line))).length;
  }
  function quantifiableLineCount(lines) {
    // Count numeric scope/outcomes; a bare year/date should not be mistaken for a measurable achievement.
    const metricPattern = /\b\d+(?:[.,]\d+)?\s*(?:%|persen|orang|unit|produk|pelanggan|transaksi|dokumen|laporan|mesin|proyek|project|data|pesanan|bulan|tahun|hari|jam|menit|kali|usdt|idr|rp|rupiah|karyawan|client|customer)(?=\W|$)/i;
    const outcomeThenNumber = /\b(?:meningkat|mengurangi|menurunkan|menaikkan|menghemat|hemat|mencapai|menyelesaikan|menangani|improved|increased|reduced|saved|delivered|processed)\b.{0,45}\b\d+(?:[.,]\d+)?\s*(?:%|persen|unit|data|produk|pelanggan|transaksi|dokumen|laporan|mesin|proyek|project|jam|hari|bulan|kali|rupiah|rp)(?=\W|$)/i;
    return lines.filter(line => metricPattern.test(line) || outcomeThenNumber.test(line)).length;
  }
  function listBulletLines(text) { return cleanText(text).split('\n').filter(line => /^\s*(?:[-*•▪◦‣]|\d+[.)])\s+\S/.test(line)); }
  function weakLines(text) {
    const candidates = cleanText(text).split(/\n|(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length >= 18);
    return candidates.filter(line => WEAK_PHRASES.some(p => line.toLowerCase().includes(p))).slice(0, 5);
  }
  function inferRoleKeywords(role) { return ROLE_KEYWORDS[role] || ROLE_KEYWORDS.general; }
  function scoreCategory(name, points, max, details) {
    return { name, points: Math.max(0, Math.min(max, points)), max, percent: max ? Math.round(Math.max(0, Math.min(max, points)) / max * 100) : null, details: details || [] };
  }
  function analyze(textInput, options) {
    const opts = options || {};
    const text = cleanText(textInput);
    const lower = text.toLowerCase();
    const lines = linesOf(text);
    const words = text.match(/[\p{L}\p{N}+#./-]+/gu) || [];
    const wordCount = words.length;
    const role = ROLE_KEYWORDS[opts.role] ? opts.role : 'general';
    const sections = findSections(text);
    const email = hasEmail(text);
    const phone = hasPhone(text);
    const hasPortfolio = /(?:linkedin\.com|github\.com|behance\.net|dribbble\.com|portfolio|portofolio|https?:\/\/)/i.test(text);
    const bulletLines = listBulletLines(text);
    const activeLines = actionVerbLineCount(lines);
    const quantifiedLines = quantifiableLineCount(lines);
    const weak = weakLines(text);
    const dates = countMatches(text, /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|januari|februari|maret|mei|juni|juli|agustus|september|oktober|november|desember)\s+20\d{2}\b|\b(?:0?[1-9]|1[0-2])[/-]20\d{2}\b|\b20\d{2}\s*[-–—]\s*(?:20\d{2}|sekarang|present|current)\b/gi);
    const extractedVia = opts.extractionMethod || 'manual';
    const pageCount = Number(opts.pageCount) || null;
    const jobDescription = cleanText(opts.jobDescription || '');
    const jobKeys = jobKeywords(jobDescription);
    const roleKeys = inferRoleKeywords(role);
    const targetKeys = jobKeys.length ? jobKeys : roleKeys;
    const keywordMatch = targetKeys.length ? matchKeywords(text, targetKeys) : {matched:[], missing:[], percent:null};
    const relevanceAssessed = targetKeys.length > 0;

    // Score structure/completeness from observable markers only.
    let structurePoints = 0; const structureDetails = [];
    if (email) { structurePoints += 5; structureDetails.push('Alamat email terdeteksi.'); }
    else structureDetails.push('Email belum terdeteksi dari teks yang terbaca.');
    if (phone) { structurePoints += 5; structureDetails.push('Nomor telepon terdeteksi.'); }
    else structureDetails.push('Nomor telepon belum terdeteksi dari teks yang terbaca.');
    if (sections.experience) { structurePoints += 5; structureDetails.push('Bagian pengalaman terdeteksi.'); }
    else structureDetails.push('Bagian pengalaman kerja belum terdeteksi. Jika belum punya pengalaman formal, gunakan proyek, magang, praktik, atau organisasi yang relevan.');
    if (sections.education) { structurePoints += 4; structureDetails.push('Bagian pendidikan terdeteksi.'); }
    else structureDetails.push('Bagian pendidikan belum terdeteksi.');
    if (sections.skills) { structurePoints += 4; structureDetails.push('Bagian keahlian terdeteksi.'); }
    else structureDetails.push('Bagian keahlian belum terdeteksi.');
    if (sections.projects || sections.certifications || sections.summary) { structurePoints += 2; structureDetails.push('Ada bagian pendukung tambahan yang terdeteksi.'); }
    if (wordCount >= 100 && wordCount <= 1100) { structurePoints += 5; structureDetails.push('Panjang isi berada dalam rentang yang cukup untuk dianalisis.'); }
    else if (wordCount >= 50 && wordCount < 100) { structurePoints += 3; structureDetails.push('Isi relatif singkat; pastikan informasi yang relevan tidak terlewat.'); }
    else if (wordCount > 1100 && wordCount <= 1600) { structurePoints += 3; structureDetails.push('Dokumen cukup panjang; periksa apakah semua bagian relevan dengan posisi.'); }
    else if (wordCount < 50) structureDetails.push('Teks yang terbaca sangat sedikit; periksa hasil ekstraksi/OCR sebelum mempercayai skor.');
    else structureDetails.push('Teks cukup panjang; prioritaskan informasi relevan dan kurangi pengulangan.');

    // Readability is about machine-readable extracted text, not an ATS pass prediction.
    let readabilityPoints = 0; const readabilityDetails = [];
    if (text.length >= 300) { readabilityPoints += 8; readabilityDetails.push('Teks berhasil diekstrak dalam jumlah memadai.'); }
    else if (text.length >= 100) { readabilityPoints += 5; readabilityDetails.push('Sebagian teks terbaca, tetapi hasil ekstraksi perlu dicek.'); }
    else readabilityDetails.push('Teks yang dapat dibaca sangat sedikit. Dokumen scan atau OCR mungkin belum terbaca dengan baik.');
    if (extractedVia === 'pdf-text') { readabilityPoints += 8; readabilityDetails.push('Teks diambil langsung dari PDF, bukan hanya OCR gambar.'); }
    else if (extractedVia === 'ocr-pdf') { readabilityPoints += 5; readabilityDetails.push('Teks PDF memerlukan OCR; periksa kembali nama, angka, dan tanggal.'); }
    else if (extractedVia === 'ocr-image') { readabilityPoints += 4; readabilityDetails.push('Teks berasal dari OCR gambar; hasil dapat mengandung salah baca.'); }
    else { readabilityPoints += 5; readabilityDetails.push('Teks dianalisis dari input yang telah disediakan.'); }
    const weirdChars = countMatches(text, /[�□■]{1,}/g);
    const alphaNum = countMatches(text, /[\p{L}\p{N}]/gu);
    if (weirdChars === 0 && alphaNum / Math.max(text.length,1) > 0.35) { readabilityPoints += 5; readabilityDetails.push('Tidak tampak banyak karakter pengganti atau simbol rusak dalam teks ekstraksi.'); }
    else readabilityDetails.push('Ada karakter yang mungkin rusak saat ekstraksi; periksa teks yang terbaca.');
    if (lines.length >= 5) { readabilityPoints += 4; readabilityDetails.push('Pemisahan baris terdeteksi.'); }
    else readabilityDetails.push('Struktur baris terbatas; bisa jadi format PDF sulit diparsing.');

    // Impact score focuses on action and evidence, not invented achievements.
    let impactPoints = 0; const impactDetails = [];
    if (activeLines >= 5) { impactPoints += 8; impactDetails.push(`${activeLines} baris mengandung kata kerja aktif yang terdeteksi.`); }
    else if (activeLines >= 2) { impactPoints += 5; impactDetails.push(`${activeLines} baris mengandung kata kerja aktif yang terdeteksi.`); }
    else impactDetails.push('Kata kerja aktif belum banyak terdeteksi di awal atau isi pengalaman.');
    if (quantifiedLines >= 3) { impactPoints += 7; impactDetails.push(`${quantifiedLines} baris memuat angka/tanggal/ukuran yang bisa menjadi konteks pencapaian; pastikan angka tersebut benar-benar menunjukkan hasil.`); }
    else if (quantifiedLines >= 1) { impactPoints += 4; impactDetails.push('Ada beberapa angka terdeteksi, tetapi belum banyak bukti pencapaian yang terukur.'); }
    else impactDetails.push('Belum terdeteksi angka yang memberi konteks skala atau hasil. Tambahkan hanya jika ada data nyata.');
    if (bulletLines.length >= 3) { impactPoints += 5; impactDetails.push('Poin-poin berbentuk bullet terdeteksi sehingga pengalaman lebih mudah dipindai.'); }
    else if (lines.length >= 8) { impactPoints += 3; impactDetails.push('Isi memiliki pemisahan baris, tetapi bullet untuk kontribusi/pencapaian belum banyak terdeteksi.'); }
    else impactDetails.push('Format bullet pengalaman belum terdeteksi dengan jelas.');
    if (weak.length === 0) { impactPoints += 5; impactDetails.push('Tidak ada frasa pasif/generik dari daftar pemeriksaan sederhana yang terdeteksi. Ini bukan pemeriksaan tata bahasa menyeluruh.'); }
    else { impactPoints += Math.max(0, 5 - weak.length * 2); impactDetails.push(`${weak.length} frasa generik terdeteksi; ubah menjadi aksi dan hasil yang lebih spesifik.`); }

    // Role relevance is optional and clearly labelled as keyword overlap, never ATS score.
    let relevancePoints = null; const relevanceDetails = [];
    if (relevanceAssessed) {
      relevancePoints = Math.round(keywordMatch.percent * 0.25);
      if (jobKeys.length) relevanceDetails.push(`Kecocokan kata kunci sederhana: ${keywordMatch.matched.length} dari ${jobKeys.length} istilah yang dipilih dari deskripsi lowongan ditemukan pada CV.`);
      else relevanceDetails.push(`Istilah contoh untuk target ${ROLE_LABELS[role]} dibandingkan dengan teks CV.`);
      relevanceDetails.push('Pencocokan kata kunci tidak menilai kedalaman kemampuan, dan istilah yang tidak muncul tidak otomatis berarti kamu tidak memilikinya.');
    }

    const categoryScores = [
      scoreCategory('Kelengkapan & struktur', structurePoints, 30, structureDetails),
      scoreCategory('Keterbacaan teks', readabilityPoints, 25, readabilityDetails),
      scoreCategory('Bukti kontribusi', impactPoints, 25, impactDetails)
    ];
    if (relevanceAssessed) categoryScores.push(scoreCategory('Kecocokan target', relevancePoints, 25, relevanceDetails));
    const availableMax = categoryScores.reduce((a,c)=>a+c.max,0);
    const earned = categoryScores.reduce((a,c)=>a+c.points,0);
    const overallScore = availableMax ? Math.round(earned / availableMax * 100) : 0;

    const findings = [];
    function addFinding(severity,title,description,evidence) { findings.push({severity,title,description,evidence:evidence||''}); }
    if (!email) addFinding('high','Email belum ditemukan','Pastikan email profesional terlihat jelas di area kontak dan ikut terbaca saat teks diekstrak.','Kontak');
    if (!phone) addFinding('medium','Nomor telepon belum ditemukan','Tambahkan nomor aktif dengan kode negara bila relevan, atau periksa apakah OCR melewatkan angka.','Kontak');
    if (!sections.experience) addFinding('high','Bagian pengalaman belum terbaca','Jika punya pengalaman kerja, gunakan heading yang jelas. Jika belum, tampilkan magang, praktik, proyek, atau pengalaman organisasi yang relevan.','Pengalaman');
    if (!sections.education) addFinding('medium','Bagian pendidikan belum terbaca','Tambahkan bagian Pendidikan dengan nama institusi, program/jurusan, dan tahun yang sesuai.','Pendidikan');
    if (!sections.skills) addFinding('medium','Bagian keahlian belum terbaca','Cantumkan skill spesifik yang benar-benar dikuasai, terutama yang relevan dengan posisi target.','Keahlian');
    if (weak.length) weak.forEach(line=>addFinding('medium','Deskripsi terdengar generik','Ubah frasa tugas umum menjadi aksi spesifik, alat/metode yang digunakan, dan dampak nyata bila tersedia.',line));
    if (quantifiedLines === 0) addFinding('medium','Pencapaian terukur belum terlihat','Jika memang ada datanya, tambahkan cakupan atau hasil yang nyata—misalnya volume dokumen, jumlah proyek, waktu, error yang dikurangi, atau target yang tercapai. Jangan mengarang angka.','Pengalaman / Proyek');
    if (extractedVia !== 'pdf-text') addFinding('medium','Periksa hasil OCR/ekstraksi','Dokumen ini dibaca melalui OCR atau input non-PDF-text. Periksa nama, email, nomor, tanggal, dan istilah teknis pada kotak teks hasil ekstraksi.',extractedVia === 'ocr-image' ? 'Gambar' : 'PDF scan');
    if (pageCount && pageCount > 2) addFinding('low','CV lebih dari dua halaman','Ini bukan aturan mutlak. Untuk pengalaman awal, periksa apakah halaman tambahan berisi informasi relevan dan tidak mengulang isi.',`${pageCount} halaman`);
    if (jobKeys.length && keywordMatch.missing.length) addFinding('medium','Ada istilah lowongan yang belum ditemukan','Periksa istilah berikut dan tambahkan hanya bila memang sesuai dengan pengalaman/keahlianmu.',keywordMatch.missing.slice(0,8).join(', '));
    if (/\b(?:ttl|tempat.{0,5}tanggal.{0,5}lahir|agama|status\s+pernikahan|marital\s+status|full\s+address|alamat\s+lengkap)\b/i.test(text)) addFinding('low','Terdapat informasi pribadi','Pertimbangkan relevansi dan kebutuhan lowongan sebelum membagikan tanggal lahir lengkap, agama, status pernikahan, atau alamat lengkap. Kebiasaan tiap perusahaan/negara dapat berbeda.','Privasi');
    if (!findings.length) addFinding('low','Tidak ada masalah mayor dari checklist dasar','Tetap periksa relevansi dengan lowongan dan minta orang lain membaca CV. Checklist otomatis tidak dapat menilai seluruh kualitas CV.','Review akhir');
    const priorities = findings.slice().sort((a,b)=>({high:0,medium:1,low:2}[a.severity]-({high:0,medium:1,low:2}[b.severity]))).slice(0,6);
    const strengths = [];
    if (email && phone) strengths.push({title:'Kontak utama terlihat',description:'Email dan nomor telepon terdeteksi pada teks yang terbaca.'});
    if (sections.education && sections.skills) strengths.push({title:'Pendidikan dan skill terbaca',description:'Dua bagian penting dapat dikenali dengan heading yang umum.'});
    if (activeLines >= 3) strengths.push({title:'Ada kata kerja aktif',description:`Setidaknya ${activeLines} baris mengandung kata kerja aksi dari daftar pemeriksaan.`});
    if (quantifiedLines >= 2) strengths.push({title:'Beberapa konteks angka terdeteksi',description:`Ada ${quantifiedLines} baris dengan angka/tanggal/ukuran. Pastikan angka tersebut membantu menjelaskan skala atau hasil, bukan hanya tanggal.`});
    if (bulletLines.length >= 3) strengths.push({title:'Isi berbentuk poin',description:'Poin-poin berbentuk bullet membantu pembaca memindai isi dengan lebih cepat.'});
    if (hasPortfolio) strengths.push({title:'Tautan atau portfolio terdeteksi',description:'Tinjau apakah tautan dapat dibuka dan relevan dengan target posisi.'});
    if (!strengths.length) strengths.push({title:'Teks sudah berhasil dibaca',description:'Ini memberi dasar untuk mulai memperbaiki isi; pastikan semua bagian CV terambil dengan benar.'});

    const rewriteSuggestions = [];
    weak.slice(0,3).forEach(line=>rewriteSuggestions.push({kind:'REVISI DARI TEKS CV',original:line,suggested:'[Kata kerja aktif] + [aksi spesifik] + [alat/metode atau cakupan] + [dampak yang benar-benar terjadi].',note:'Isi bagian dalam tanda kurung dengan fakta milikmu; jangan menambahkan hasil yang tidak bisa dibuktikan.'}));
    if (rewriteSuggestions.length < 3) {
      const missing = [];
      if (!sections.experience) missing.push('pengalaman/proyek');
      if (!sections.skills) missing.push('skill spesifik');
      if (!sections.education) missing.push('pendidikan');
      if (!quantifiedLines) missing.push('cakupan atau hasil terukur');
      const templates = [
        {kind:'KERANGKA PENCAPAIAN',original:'Deskripsi tugas yang hanya menyebut tanggung jawab.',suggested:'"Mengelola [proses/aktivitas] menggunakan [alat/metode], dengan hasil [dampak terukur yang benar]."',note:'Gunakan hanya jika sesuai dengan pekerjaan yang benar-benar kamu lakukan.'},
        {kind:'KERANGKA PROYEK',original:'Proyek, magang, praktik, atau organisasi.',suggested:'"Membangun/menjalankan [proyek] untuk [tujuan], menggunakan [tools], dan menghasilkan [hasil yang dapat ditunjukkan]."',note:'Bagi fresh graduate, proyek dan praktik bisa menjadi bukti kompetensi.'},
        {kind:'KERANGKA SKILL',original:'Daftar skill terlalu umum.',suggested:'Kelompokkan skill nyata: [Software/Tools], [Teknis], [Bahasa]. Cantumkan tingkat kemampuan hanya jika bisa dijelaskan lewat contoh.',note:'Hapus skill yang belum kamu kuasai atau tidak relevan dengan target.'}
      ];
      templates.forEach(t=>{if(rewriteSuggestions.length<3)rewriteSuggestions.push(t);});
    }
    const missingSections = Object.keys(sections).filter(k=>!sections[k]);
    return {
      role, roleLabel:ROLE_LABELS[role], wordCount, lineCount:lines.length, pageCount,
      extractionMethod:extractedVia, sections, contact:{email,phone,portfolio:hasPortfolio},
      metrics:{activeLines,quantifiedLines,bulletLines:bulletLines.length,weakPhraseCount:weak.length,dates},
      keywordMatch, targetKeywords:targetKeys, relevanceAssessed,
      score:{overall:overallScore,availableMax,earned,categories:categoryScores},
      findings, priorities, strengths, rewriteSuggestions,
      summary: overallScore >= 80 ? 'Fondasi CV terlihat cukup kuat menurut checklist ini. Fokus pada penyesuaian untuk lowongan dan pemeriksaan akhir.' : overallScore >= 60 ? 'Ada fondasi yang bisa dipakai, tetapi beberapa bagian penting masih bisa dibuat lebih jelas atau lebih kuat.' : 'Mulai dari kontak, struktur bagian, dan bukti kontribusi. Periksa hasil ekstraksi terlebih dahulu bila dokumen berupa scan.',
      limitations:['Skor checklist ini bukan prediksi penerimaan kerja dan bukan skor resmi ATS.','Sistem tidak dapat memastikan layout visual, kebenaran pengalaman, kualitas desain, atau seberapa dalam skill yang dimiliki.','Pencocokan kata kunci hanya menunjukkan istilah yang ditemukan pada teks; istilah yang hilang tidak otomatis berarti kamu tidak memiliki kemampuan tersebut.']
    };
  }
  return { analyze, cleanText, findSections, hasEmail, hasPhone, jobKeywords, matchKeywords, ROLE_KEYWORDS, ROLE_LABELS, SECTION_PATTERNS };
});
