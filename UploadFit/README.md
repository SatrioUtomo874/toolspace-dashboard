# UploadFit

UploadFit adalah tool persiapan dokumen yang fleksibel: unggah beberapa PDF dan gambar, tentukan aturan untuk setiap file, proses yang bisa diperbaiki, lalu unduh hasil satu per satu atau sebagai ZIP lengkap dengan laporan.

## Fitur

- Batch upload PDF, JPG/JPEG, PNG, dan WEBP.
- Validasi signature file awal supaya ekstensi palsu lebih mudah terdeteksi.
- Aturan per file: nama hasil, format output, batas ukuran (KB), batas lebar/tinggi gambar, dan kualitas encoding.
- Mengubah gambar ke JPG/PNG/WEBP atau PDF satu halaman.
- Memproses gambar agar sesuai batas ukuran: mencoba kualitas encoding terlebih dulu untuk JPG/WEBP, lalu mengecilkan dimensi jika dibutuhkan.
- PDF dipertahankan apa adanya, bisa dicoba simpan ulang/optimasi ringan, atau dirasterisasi secara eksplisit untuk mengecilkan file scan.
- Preset contoh yang bisa diedit: gambar untuk upload, semua menjadi PDF, dan batas 2 MB.
- Ringkasan kesiapan, status per file, output individual, ZIP, dan `UploadFit-report.txt`.
- Responsif untuk HP; pemrosesan file dilakukan lokal di browser.

## Pasang ke Toolspace

1. Ekstrak project ini.
2. Upload folder `UploadFit/` langsung ke root repository `SatrioUtomo874/toolspace-dashboard`, sejajar dengan tools lain.
3. Commit ke branch `main` dan deploy seperti biasa.
4. `index.html` berisi metadata katalog otomatis. Jangan edit `tools.json` secara manual. Status awal kartu sengaja `building` sampai uji browser untuk pemrosesan file selesai. Setelah uji berhasil, ubah `toolspace:status` menjadi `ready` dan `toolspace:status-label` menjadi `Siap digunakan`, lalu commit lagi.

## Cara menggunakan

1. Pilih atau jatuhkan beberapa file.
2. (Opsional) terapkan preset sebagai titik awal. Preset **hanya contoh**, bukan ketentuan resmi instansi.
3. Klik **Atur file** untuk setiap dokumen dan tentukan output format, batas ukuran, dimensi, serta kualitas yang diperlukan.
4. Klik **Siapkan semua berkas**. Tool menampilkan hasil aktual dan menyatakan bila ukuran hasil masih melebihi batas.
5. Unduh file individu atau ZIP beserta laporan.

## Batasan dan catatan teknis

- File didesain untuk diproses di browser dan tidak dikirim ke server aplikasi. PDF.js, pdf-lib, dan JSZip dimuat dari CDN; halaman membutuhkan internet untuk mengambil library tersebut. Isi dokumen tidak dikirim ke CDN oleh kode aplikasi.
- Batas aplikasi: maksimal 25 file, 40 MB per file, dan 120 MB total dalam satu batch untuk menjaga penggunaan memori browser tetap wajar. Sesuaikan `core.js` bila perlu.
- Gambar: browser dapat mengubah JPG/PNG/WEBP. Hasil tergantung implementasi canvas browser. Untuk JPG/WEBP, target ukuran dicapai dengan mencoba kualitas lalu mengurangi dimensi; jika masih gagal, hasil tetap diberi status `Belum memenuhi`.
- PNG tidak mendukung kontrol kualitas lossy standar. Untuk menurunkan ukuran PNG, aplikasi mengecilkan dimensinya bila batas ukuran aktif.
- PDF **Optimasi ringan** memakai pdf-lib untuk menyimpan ulang dokumen. Itu tidak menjamin ukuran turun; bila output lebih besar, PDF asli dipertahankan.
- PDF **Kompres PDF (rasterisasi)** merender halaman menjadi gambar dan menyusun PDF baru. Ini bisa mengurangi ukuran scanned PDF, namun teks tak lagi bisa dipilih/dicari; hyperlink, form, bookmark, metadata khusus, dan aksesibilitas juga mungkin hilang. Maksimal 20 halaman untuk mode ini; pengguna harus memberi persetujuan eksplisit.
- Konversi gambar ke PDF membuat PDF satu halaman. Menggabungkan beberapa PDF atau gambar menjadi satu PDF multi-halaman belum termasuk versi ini.
- Tool tidak mengambil/mengasumsikan persyaratan resmi dari situs tujuan dan tidak menjamin berkas pasti diterima. Pengguna memasukkan batas yang benar; status `Siap` berarti hanya memenuhi aturan lokal yang dipilih.
- PDF terenkripsi atau format rusak mungkin tidak bisa diproses. File asli yang bermasalah tidak dilaporkan sebagai sukses.

## Dependency

- PDF.js `6.4.299` — membaca jumlah halaman dan merender PDF bila dipilih.
- pdf-lib `1.17.1` — menyimpan ulang PDF dan membuat PDF dari gambar.
- JSZip `3.10.2` — membuat arsip ZIP.

PDF.js dimuat dinamis dari jsDelivr saat sebuah PDF diperiksa; pdf-lib dimuat saat optimasi/konversi PDF dibutuhkan dan JSZip baru dimuat ketika ZIP diminta. Versi library dipatok agar perilaku tidak berubah tiba-tiba. File dokumen tetap diproses di browser dan tidak dikirim ke CDN oleh kode aplikasi.

## Pengujian lokal

Gunakan Node.js 18+:

```bash
node --check app.js
node --check core.js
node --test tests/core.test.cjs
```

Unit test menguji validasi, nama file, aturan, preset, signature dasar, dimensi, dan status kesiapan. Unit test bukan pengganti uji browser untuk PDF/canvas/ZIP; setelah deploy, coba beberapa sample PDF/JPG kecil dan besar.
