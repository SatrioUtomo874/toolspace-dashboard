# Toolspace — Personal Tools Directory

Dashboard statis untuk mengumpulkan thumbnail dan tautan ke tools web yang kamu buat. Tidak perlu database, build tools, framework frontend, atau biaya server untuk dashboard ini.

## Preview lokal

Cara termudah: buka `index.html` langsung di browser. Agar pengalaman lebih mirip server, jalankan dari folder ini:

```powershell
py -m http.server 8080
```

Lalu buka `http://127.0.0.1:8080`.

## Cara menambahkan tools

1. Buka `tools.js`.
2. Tambahkan object baru di dalam array `window.TOOLS` (pisahkan object antar-kartu dengan koma).
3. Isi `id`, `name`, `category`, `description`, `status`, `statusLabel`, `tag`, `art`, `symbol`, dan `url`.
4. Untuk `art`, gunakan `youtube`, `trading`, `data`, `dev`, atau `default`.
5. Selagi aplikasi belum online, pakai `status: "building"` dan `url: ""`.
6. Setelah aplikasi punya URL publik HTTPS, isi URL tersebut dan ubah ke `status: "ready"`, lalu gunakan `statusLabel: "Siap digunakan"`.

Contoh object:

```js
{
  id: "my-new-tool",
  name: "Nama Tool Baru",
  category: "Developer Tools",
  description: "Deskripsi singkat tentang fungsi tool.",
  status: "ready",
  statusLabel: "Siap digunakan",
  tag: "HTML · JavaScript",
  art: "dev",
  symbol: "⌘",
  url: "https://alamat-tool-kamu.example"
}
```

`url` harus URL lengkap yang dimulai dengan `https://` atau `http://`. Link hanya aktif bila `status` bernilai `ready` dan URL valid. Nama kategori otomatis muncul pada filter.

## Hosting gratis yang disarankan: Cloudflare Pages

Dashboard ini hanya berisi HTML, CSS, dan JavaScript sehingga cocok untuk hosting static. Domain default Cloudflare Pages berbentuk `nama-project.pages.dev`; itu subdomain gratis dari platform, bukan domain `.com` milik pribadi.

### Opsi A — upload langsung (paling cepat)

1. Buat akun di [Cloudflare](https://dash.cloudflare.com/sign-up).
2. Buka menu **Workers & Pages**.
3. Pilih **Create application** lalu **Pages** dan opsi **Direct Upload** (label antarmuka bisa sedikit berubah).
4. Beri nama project, misalnya `toolspace-rio` atau nama yang masih tersedia.
5. Pakai file terpisah `tool_hub_cloudflare_upload.zip` yang disediakan bersama project (file-file situs berada langsung di root ZIP), atau upload folder hasil ekstrak yang berisi `index.html`, `style.css`, `app.js`, `tools.js`, `favicon.svg`, `assets/`, dan `robots.txt`.
6. Tekan **Deploy site**. Tunggu hingga deployment selesai.
7. Cloudflare akan memberikan URL `https://nama-project.pages.dev`. Buka URL tersebut untuk memeriksa hasilnya.

Catatan: dokumentasi Cloudflare menyebut project Direct Upload tidak bisa diubah menjadi project Git integration nantinya. Bila ingin update otomatis dari Git, pilih Opsi B sejak awal.

### Opsi B — GitHub + Cloudflare Pages (lebih mudah untuk update rutin)

1. Buat akun atau masuk ke [GitHub](https://github.com/).
2. Buat repository baru, misalnya `toolspace-dashboard`.
3. Upload semua file project ini ke **root** repository (pastikan `index.html` ada di root, bukan terbungkus di dalam folder tambahan).
4. Pada Cloudflare, buka **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
5. Hubungkan GitHub dan pilih repository `toolspace-dashboard`.
6. Untuk project HTML biasa, pilih preset **None** bila diminta; gunakan build command `exit 0` dan output directory `.` (karena `index.html` berada di root repository).
7. Klik **Save and Deploy**.
8. Setelah aktif, buka URL `pages.dev` dari Cloudflare.
9. Pada update berikutnya, edit file di GitHub dan commit perubahan; Cloudflare akan membuat deployment baru dari repository.

Dokumentasi: https://developers.cloudflare.com/pages/get-started/ dan https://developers.cloudflare.com/pages/framework-guides/deploy-anything/

### Alternatif hosting

- [GitHub Pages](https://pages.github.com/) — pilihan bagus untuk website statis yang disimpan di repository GitHub. URL default biasanya `username.github.io` atau `username.github.io/nama-repo`.
- [Netlify](https://app.netlify.com/) — paket gratis tersedia; subdomain default berbentuk `nama-project.netlify.app`.

Batasan harga, kuota, dan fitur bisa berubah. Periksa halaman resmi sebelum deploy.

## Tentang domain gratis

Domain `.com` standar umumnya harus didaftarkan melalui registrar berbayar; hosting gratis biasanya hanya menyertakan subdomain milik platform seperti `.pages.dev`, `.github.io`, atau `.netlify.app`. Untuk memulai tanpa biaya, gunakan subdomain hosting terlebih dahulu. Jangan percaya layanan yang menjanjikan `.com` gratis tanpa membaca aturan perpanjangan dan kepemilikan domain.

## Membuat website mudah ditemukan orang

1. **Pilih nama yang mudah diingat.** Setelah deploy, gunakan satu URL utama dan konsisten bagikan URL yang sama.
2. **Isi judul dan deskripsi yang spesifik.** Tag `<title>` dan meta description sekarang sudah disiapkan di `index.html`; sesuaikan kata-katanya dengan tools yang benar-benar kamu publikasikan.
3. **Jangan publikasikan kartu kosong sebagai aplikasi aktif.** Kartu yang belum punya URL tetap berstatus “Segera hadir”. Tes setiap link sebelum mengaktifkannya.
4. **Bagikan URL di kanal yang relevan.** Misalnya profil GitHub, LinkedIn, CV/portofolio, bio sosial, atau komunitas yang memang tertarik dengan fungsi tools tersebut.
5. **Tambahkan Google Search Console setelah domain aktif.** Verifikasi kepemilikan properti, cek URL lewat URL Inspection, dan kirim sitemap jika kamu membuat `sitemap.xml`. Indexing tidak instan dan tidak dijamin.
6. **Buat halaman yang memberi konteks.** Saat nanti dibutuhkan, tambahkan halaman detail untuk setiap tool berisi fungsi, contoh pemakaian, batasan, dan petunjuk penggunaan.
7. **Pastikan HTTPS dan tampilan mobile berfungsi.** Uji dari HP dan browser incognito setelah publish.

### Catatan penting untuk aplikasi Python

Dashboard Toolspace sendiri bisa di-host sebagai static site gratis. Aplikasi `YouTube Batch Transcript` yang memakai Flask/Python tidak bisa dijalankan hanya dengan meng-host file dashboard ini. Aplikasi tersebut perlu di-deploy terpisah pada layanan yang menjalankan backend Python. Setelah backend dan frontend tool itu benar-benar tersedia secara publik, salin URL publiknya ke `url` di `tools.js`.
