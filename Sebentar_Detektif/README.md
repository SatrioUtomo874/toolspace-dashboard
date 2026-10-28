# Sebentar, Detektif! — Endless Mystery Club

Game misteri mini berbahasa Indonesia dengan kasus prosedural, petunjuk, tersangka, interogasi, skor, dan empat suasana visual. Project ini sengaja dibuat sebagai folder statis untuk katalog Toolspace: tidak membutuhkan server, API key, database, atau dependensi runtime.

## Fitur

- **Endless Mode:** setiap seed merakit kasus melalui kombinasi skenario, lokasi, objek, waktu, nama, peran, motif, bukti, dan nuansa. Variasi kasus sangat besar tanpa perlu menulis setiap level secara manual.
- **Daily Mystery:** seed harian berbasis tanggal UTC sehingga pemain mendapatkan kasus yang sama di hari yang sama.
- **Case Seed & share link:** tautan `?seed=...&difficulty=...&theme=...` akan mereproduksi kasus yang sama, termasuk susunan tersangka dan bukti.
- **Difficulty:** Santai (3 tersangka), Menengah (4), dan Rumit (5). Jumlah petunjuk mengikuti tingkat kesulitan.
- **Evidence board:** klik kartu petunjuk untuk membuka bukti lengkap. Setiap kasus mempunyai minimal dua bukti bertag mendukung tersangka solusi dan satu petunjuk yang menjelaskan akses wajar tersangka lain.
- **Logic validator:** pemeriksaan struktur kasus memastikan ID unik, solusi ada dalam daftar tersangka, jawaban didukung beberapa petunjuk, dan setidaknya satu petunjuk membersihkan tersangka lain.
- **Interrogation:** pilih tersangka dan ajukan pertanyaan tentang alibi, objek, bukti waktu, atau motif. Bahasa tubuh/gaya bicara tidak dianggap bukti mandiri.
- **Hint system:** bantuan bertingkat dengan pengurangan skor akhir, bukan pengurangan XP yang sudah dimiliki.
- **Scoring & ranks:** skor dipengaruhi kesulitan, jumlah bantuan, dan tuduhan yang salah. XP untuk seed/level yang sama hanya diberikan satu kali agar pengulangan tidak bisa dipakai farming.
- **Theme modes:** Otomatis, Fun, Tegang, Cozy, dan Noir. Tema mengubah palet warna, kontras, banner, dan suasana halaman. Pilihan pengguna disimpan lokal.
- **Local progress:** XP, kasus yang selesai, streak harian, dan rak kasus terakhir disimpan di localStorage browser.
- **Responsive:** layout dirancang untuk desktop dan layar ponsel, navigasi keyboard, focus ring, dan dukungan `prefers-reduced-motion`.

## Struktur

```text
Sebentar_Detektif/
├── index.html
├── style.css
├── engine.js
├── app.js
├── assets/
│   ├── icon.svg
│   └── thumbnail.svg
└── tests/
    └── core.test.mjs
```

## Integrasi Toolspace

1. Upload folder `Sebentar_Detektif` langsung ke root repository `toolspace-dashboard`.
2. Metadata kartu diambil dari tag `toolspace:*` pada `<head>` di `index.html`.
3. URL kartu: `/Sebentar_Detektif/`.
4. Generator katalog membaca folder yang memiliki `index.html`; tidak perlu menambah kartu secara manual.
5. Tidak perlu mengubah `wrangler.jsonc`, Worker API, atau generator utama hanya untuk memperbarui game ini.

## Menjalankan lokal

Bisa dibuka langsung dengan browser melalui `index.html`. Untuk hasil paling mirip deployment, jalankan server statis lokal, misalnya:

```bash
python -m http.server 8000
```

Kemudian buka `http://localhost:8000` dari folder project.

## Pengujian

Memerlukan Node.js:

```bash
node --check engine.js
node --check app.js
node --test tests/core.test.mjs
```

Pengujian mencakup determinisme seed, share URL, kasus harian, tingkat kesulitan, validasi petunjuk untuk 500 seed, variasi skenario, penalti skor, dan peringkat.

## Cara kerja generator & batasan

- Generator deterministik berbasis seed. Kasus yang dibuat dengan seed, tingkat kesulitan, dan versi generator sama akan konsisten; link dapat dibagikan.
- Variasi dirakit dari skenario dan fragmen yang telah dipasangkan, bukan LLM generatif. Ini menghindari biaya API dan membuat proses instan di browser.
- Validator adalah validator aturan/struktur. Ia memastikan tag bukti secara internal hanya mendukung satu jawaban, namun **belum merupakan pembuktian semantik bahasa alami yang formal**. Kasus baru tetap layak diperiksa secara manual selama konten skenario dikembangkan.
- Karena seluruh generator berjalan di browser, pengguna teknis dapat memeriksa jawaban di DevTools. Ini game hiburan, bukan kompetisi berhadiah atau platform anti-cheat.
- Progres tersimpan di browser/perangkat yang sama. Tidak ada akun, server, atau leaderboard online.
- Google Fonts bersifat opsional; fallback system fonts digunakan jika font eksternal tidak tersedia.

## Mengembangkan variasi baru

Tambahkan skenario baru ke array `INCIDENTS` pada `engine.js`. Setiap skenario berisi `kind`, `label`, `title`, variasi `thing`, `consequence`, dan variasi `motive`. Generator tetap membangun bukti berdasarkan template fakta yang terhubung dengan waktu kejadian dan tersangka. Setelah menambah skenario, jalankan unit test dan periksa beberapa seed baru di browser.
