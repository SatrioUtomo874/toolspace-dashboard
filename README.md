# Toolspace — folder-based tool directory

Toolspace adalah katalog publik untuk tools web statis yang disimpan dalam satu repository dan dipublikasikan pada satu Cloudflare Worker melalui Static Assets.

## Pola folder project

Tambahkan satu folder baru di root repository untuk setiap tool. Folder harus berisi setidaknya `index.html`; umumnya juga `style.css`, `app.js`, serta folder `assets/` bila dibutuhkan.

```text
repository/
├── index.html                 # dashboard Toolspace
├── style.css
├── app.js                     # membaca tools.json
├── tools.json                 # dibuat otomatis saat build
├── scripts/
│   └── generate-tools.js      # membaca metadata semua folder tool
├── wrangler.jsonc             # konfigurasi Cloudflare Static Assets
├── Transkripter_Batch_Youtube/
│   ├── index.html             # metadata kartu ada di sini
│   ├── style.css
│   ├── app.js
│   └── assets/
│       └── thumbnail.svg
└── Nama_Tool_Baru/
    ├── index.html
    ├── style.css
    ├── app.js
    └── assets/
```

## Metadata untuk kartu dashboard

Letakkan metadata di bagian `<head>` pada `index.html` setiap tool. Generator akan membaca data ini saat build; tidak perlu mengedit daftar kartu dashboard.

```html
<title>Nama Tool</title>
<meta name="description" content="Deskripsi singkat untuk kartu dashboard.">
<meta name="toolspace:title" content="Nama Tool">
<meta name="toolspace:category" content="Productivity">
<meta name="toolspace:status" content="building">
<meta name="toolspace:status-label" content="Dalam pengembangan">
<meta name="toolspace:tag" content="HTML · CSS · JavaScript">
<meta name="toolspace:symbol" content="✳">
<meta name="toolspace:thumbnail" content="assets/thumbnail.svg">
```

Aturan:
- `toolspace:title`: judul kartu. Jika kosong, generator memakai `<title>`.
- `description`: deskripsi ringkas kartu.
- `toolspace:category`: kategori untuk filter otomatis.
- `toolspace:status`: `building` atau `ready`. Gunakan `ready` hanya jika tool benar-benar sudah berfungsi.
- `toolspace:status-label`: label publik yang tampil di kartu.
- `toolspace:tag`: teks kecil seperti `HTML · JavaScript`.
- `toolspace:symbol`: simbol dalam thumbnail fallback.
- `toolspace:thumbnail`: path aset relatif dari folder tool; opsional.
- `toolspace:url`: opsional jika tool perlu mengarah ke URL eksternal. Jika dihilangkan, URL kartu adalah `/<Nama_Folder>/`.
- `toolspace:visible` dapat diatur `false` untuk tidak memasukkan folder tersebut ke katalog.

## Cara menambahkan tools

1. Buat folder baru di root repository, misalnya `PDF_Tools`.
2. Tambahkan `index.html`, `style.css`, `app.js`, dan aset jika perlu.
3. Isi metadata Toolspace di `index.html`.
4. Pastikan `toolspace:status` bernilai `building` saat belum siap atau `ready` jika sudah diuji.
5. Commit/push folder ke branch produksi `main`.
6. Cloudflare harus menjalankan build generator lalu deployment. Setelah deployment selesai, folder akan dibuka lewat `https://alamat-worker-kamu.workers.dev/PDF_Tools/` dan kartu akan muncul di dashboard.

## Pengaturan Cloudflare Workers Builds

Project disiapkan untuk deploy dengan Wrangler dan Static Assets:

- **Root directory:** `/` (root repository)
- **Build command:** `node scripts/generate-tools.js`
- **Deploy command:** `npx wrangler deploy`

`wrangler.jsonc` mengatur folder aset statis ke root repository. File konfigurasi, generator, README, dan direktori internal dikecualikan dari pemuatan aset melalui `.assetsignore`.

Pastikan repository GitHub tersambung ke Workers Builds dan automatic deployment diaktifkan. Jika deployment masih ditandai **Manually deployed** atau Git belum tersambung, push baru tidak otomatis memperbarui website; hubungkan Git integration terlebih dahulu atau jalankan deploy secara manual.

Untuk menjalankan generator secara lokal:

```bash
node scripts/generate-tools.js
python -m http.server 8080
```

Buka `http://127.0.0.1:8080`. Jalankan perintah generator setiap kali menambah atau mengubah metadata tool.

## Batasan penting: aplikasi YouTube

Sebuah folder berisi HTML/CSS/JavaScript dapat menjadi frontend statis. Namun, file Python dari downloader awal tidak akan berjalan hanya karena ditaruh atau dijadikan referensi di folder tersebut. Mengambil daftar channel dan transcript otomatis membutuhkan logic yang berjalan di sisi server/Worker atau layanan API yang kompatibel. YouTube Data API resmi juga membatasi pengunduhan caption lewat izin pemilik video. Karena itu, folder `Transkripter_Batch_Youtube` saat ini ditandai `building` secara jujur; frontend-nya belum mengklaim pengambilan transkrip sudah bekerja.

Semua file yang dipublikasikan dalam repository publik maupun static assets dapat dilihat publik. Jangan menyimpan API key, token, password, atau file pribadi di folder ini.
