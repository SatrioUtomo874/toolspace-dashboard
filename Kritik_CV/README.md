# Kritik CV

**Kritik CV** adalah tool frontend untuk memeriksa CV PDF/JPG/PNG/WEBP dan memberi kritik berbasis checklist yang dapat dijelaskan. Tool ini cocok menjadi folder mandiri di repository Toolspace.

## Fitur

- Upload atau drag-and-drop satu dokumen PDF/JPG/JPEG/PNG/WEBP, maksimum 12 MB.
- Ekstraksi teks PDF menggunakan PDF.js; bila PDF tampaknya hasil scan, halaman awal dirender dan dibaca dengan OCR.
- OCR gambar menggunakan Tesseract.js dengan bahasa Indonesia + Inggris.
- Pilihan target role dan kolom deskripsi lowongan opsional untuk membandingkan istilah yang ditemukan dalam CV.
- Checklist struktur/kontak, keterbacaan teks, bukti kontribusi, kata kerja aktif, angka/cakupan terukur, bagian umum CV, serta indikator privasi.
- Saran tindakan prioritas, kekuatan terdeteksi, kerangka penulisan ulang tanpa mengarang pencapaian, dan laporan TXT.
- Teks hasil ekstraksi dapat diedit dan dianalisis ulang jika OCR keliru.
- Responsive desktop/mobile.

## Privasi dan dependensi

Isi file diproses di browser dan tidak dikirim ke server aplikasi. PDF.js dan Tesseract.js dimuat dari CDN; file CV tetap diproses lokal di browser. Pemrosesan OCR membutuhkan koneksi internet pertama kali untuk mengunduh library dan model bahasa. Jangan menggunakan perangkat bersama jika pengguna tidak ingin hasil CV tetap terlihat di layar.

Batas default: file 12 MB; PDF membaca maksimal 8 halaman; OCR PDF scan maksimal 5 halaman pada versi awal untuk menjaga penggunaan memori browser tetap terkendali. PDF yang diproteksi password atau scan berkualitas rendah mungkin tidak terbaca.

## Prinsip penilaian

Skor merupakan **heuristik checklist transparan**, bukan standar universal, prediksi peluang diterima, atau skor ATS resmi. Setiap dimensi dihitung dari indikator yang disebutkan pada laporan:

- **Kelengkapan & struktur**: email, telepon, heading pengalaman, pendidikan, keahlian, bagian pendukung, dan panjang teks yang terbaca.
- **Keterbacaan teks**: jumlah teks yang diekstrak, jalur ekstraksi (PDF text/OCR), karakter rusak, dan pemisahan baris.
- **Bukti kontribusi**: kata kerja aktif, baris dengan angka/cakupan, penggunaan bullet, serta frasa generik yang terdeteksi.
- **Kecocokan target** (opsional): tumpang-tindih istilah CV dengan istilah dari role atau deskripsi lowongan yang dipilih.

Tidak ada penalti otomatis hanya karena CV memiliki foto, warna, atau lebih dari satu halaman. Tool tidak bisa memastikan layout visual hanya dari hasil ekstraksi teks, memverifikasi kebenaran pengalaman, mengukur kompetensi sebenarnya, atau menjamin bagaimana setiap ATS akan membaca CV. Saran untuk angka kuantitatif meminta pengguna hanya memasukkan hasil yang benar-benar terjadi.

## Acuan prinsip

- University of Pennsylvania Career Services, *Write a Resume/CV*: resume harus ringkas, relevan dengan peluang, menggunakan format yang konsisten, serta menekankan aksi dan capaian yang bisa dibuktikan. https://careerservices.upenn.edu/channels/resume/
- University of Iowa Human Resources, *Resume Critique Checklist*: section yang jelas, urutan pengalaman, pencapaian kuantitatif bila mungkin, dan pengecekan bahasa. https://hr.uiowa.edu/development/career-development-advising-services/job-search-tools/resume-critique-checklist
- Greenhouse Support, *Unsuccessful resume parse*: layout kompleks, kolom, gambar, header/footer, dan CV gambar dapat menyebabkan parsing tidak sempurna dalam sistem tertentu. Ini adalah peringatan parsing, bukan bukti bahwa semua ATS berperilaku sama. https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse

Acuan tersebut digunakan sebagai prinsip umum; kebutuhan CV berbeda menurut negara, industri, posisi, dan pemberi kerja.

## Menjalankan lokal

Buka `index.html` melalui server lokal (disarankan, bukan `file://` langsung) karena beberapa browser membatasi fitur worker/CDN pada file lokal. Contoh jika Python tersedia:

```bash
python -m http.server 8000
```

Lalu buka `http://localhost:8000/Kritik_CV/` dari root yang memuat folder `Kritik_CV`, atau jalankan server dari folder project dan buka `http://localhost:8000/`.

## Menambahkan ke Toolspace

Upload folder `Kritik_CV` ke root repository `SatrioUtomo874/toolspace-dashboard`, sejajar dengan folder tools lain. `index.html` memuat metadata `toolspace:*` dan URL katalog `/Kritik_CV/`. Jangan mengedit `tools.json` manual; generator katalog seharusnya membuatnya saat build.

## Pengujian

Jalankan unit test murni JavaScript:

```bash
node tests/analyzer.test.cjs
```

`analyzer.js` mencakup logika skor dan temuan yang bisa diuji dengan Node.js. Pengujian browser langsung untuk PDF.js/Tesseract OCR tetap perlu dilakukan di deployment.
