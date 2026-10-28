# Sebentar, Detektif!

Mini game misteri berbahasa Indonesia untuk katalog Toolspace. Pengguna membaca cerita singkat, membuka bukti, memilih tersangka, dan menerima rekonstruksi kejadian serta skor.

## Struktur

```text
Sebentar_Detektif/
├── index.html
├── style.css
├── app.js
├── assets/
│   ├── icon.svg
│   └── thumbnail.svg
└── tests/
    └── core.test.mjs
```

## Integrasi Toolspace

- Upload folder `Sebentar_Detektif` ke root repository `toolspace-dashboard`, sejajar dengan folder tools lain.
- Metadata katalog berada pada `<head>` di `index.html` dengan prefix `toolspace:`.
- Katalog otomatis harus membaca `toolspace:title`, `toolspace:category`, `toolspace:status`, `toolspace:status-label`, `toolspace:tag`, `toolspace:symbol`, dan `toolspace:thumbnail`.
- URL yang ditetapkan: `/Sebentar_Detektif/`.
- Tidak memerlukan backend, API key, build command tambahan, atau dependensi runtime.

## Cara bermain

1. Pilih kasus hari ini atau salah satu berkas di Arsip Kasus.
2. Ketuk kartu petunjuk untuk membuka rinciannya.
3. Pilih tersangka dan tekan **Ajukan tuduhan**.
4. Jawaban salah masih dapat dicoba lagi. Setelah tiga kesalahan tersedia pilihan **Ungkap solusi**.
5. Skor satu kali penyelesaian ditambahkan ke XP. Mengulang kasus yang telah diselesaikan tidak memberi XP kedua kali.
6. Progres lokal disimpan dalam `localStorage` browser. Tidak ada data pengguna yang dikirim ke server.

## Testing

Syntax: `node --check app.js`

Unit test sederhana: `node --test tests/core.test.mjs`

## Batasan

- Seluruh kasus ditulis sebelumnya dan jawabannya deterministik; tidak ada AI/API eksternal.
- Progres hanya ada di browser/perangkat yang digunakan.
- Streak lintas perangkat, leaderboard online, dan sistem editor kasus belum tersedia.
- Kasus ini adalah hiburan, bukan alat investigasi nyata.
