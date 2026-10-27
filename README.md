# YouTube Batch Transcript — Toolspace project folder

Folder ini disiapkan sebagai project statis yang bisa ditambahkan ke root repository `toolspace-dashboard` agar katalog Toolspace menemukannya otomatis.

## Isi

- `index.html` — halaman frontend dan metadata kartu Toolspace.
- `style.css` — tampilan responsif.
- `app.js` — pemeriksaan dasar format URL YouTube dan pesan status UI.
- `assets/thumbnail.svg` — thumbnail yang dipakai oleh katalog Toolspace.

## Cara menambahkan ke Toolspace

1. Ekstrak ZIP.
2. Upload folder `Transkripter_Batch_Youtube` ke root repository `SatrioUtomo874/toolspace-dashboard`, sejajar dengan `index.html`, `scripts/`, dan `wrangler.jsonc` milik Toolspace.
3. Commit ke branch produksi `main`.
4. Pastikan Workers Builds menjalankan build command `node scripts/generate-tools.js` lalu deploy command `npx wrangler deploy`. Jika project masih manual deploy, lakukan deploy ulang setelah commit.
5. Setelah deployment sukses, katalog mengambil judul, deskripsi, kategori, status, tag, simbol, dan thumbnail dari metadata `index.html` folder ini.
6. Kartu akan mengarah ke `/Transkripter_Batch_Youtube/`.

## Metadata katalog

Metadata Toolspace telah berada di `<head>` `index.html`. Status sengaja `building` karena backend transkripsi belum diimplementasikan.

## Batasan versi ini

Ini adalah **frontend preview**, bukan transkripter yang sudah berfungsi penuh. Form hanya memeriksa format URL di browser. Ia tidak mengambil daftar video atau transkrip dan tidak memalsukan hasil. Agar fitur transkripsi sungguhan berjalan tanpa Render, buat Cloudflare Worker/API yang kompatibel dan hubungkan frontend ke endpoint tersebut. Script Python lama tidak bisa dieksekusi hanya dengan menaruhnya di folder HTML/CSS/JavaScript.
