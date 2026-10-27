/*
  KONFIGURASI TOOLSPACE
  Tambahkan object baru di dalam array di bawah untuk membuat kartu.
  Ubah url menjadi alamat publik aplikasi jika sudah di-hosting.
  status: "ready" atau "building"
  art: "youtube", "trading", "data", "dev", atau "default"
*/
window.TOOLS = [
  {
    id: "youtube-batch-transcript",
    name: "YouTube Batch Transcript",
    category: "AI & Media",
    description: "Ambil transkrip dari banyak video YouTube dalam satu batch, pantau progres, lalu unduh hasilnya.",
    status: "building",
    statusLabel: "Belum online",
    tag: "Python · Flask",
    art: "youtube",
    symbol: "▶",
    url: ""
  },
  {
    id: "crypto-strategy-lab",
    name: "Crypto Strategy Lab",
    category: "Trading & Data",
    description: "Ruang kerja untuk menguji strategi, membaca hasil backtest, dan mengevaluasi performa sistem trading.",
    status: "building",
    statusLabel: "Segera hadir",
    tag: "Python · Analytics",
    art: "trading",
    symbol: "↗",
    url: ""
  },
  {
    id: "data-toolkit",
    name: "Data Toolkit",
    category: "Trading & Data",
    description: "Kumpulan utilitas sederhana untuk merapikan, memeriksa, dan mengolah data CSV dengan lebih cepat.",
    status: "building",
    statusLabel: "Segera hadir",
    tag: "CSV · Utilities",
    art: "data",
    symbol: "▦",
    url: ""
  },
  {
    id: "developer-workbench",
    name: "Developer Workbench",
    category: "Developer Tools",
    description: "Tempat untuk mengumpulkan utilitas pengembangan web, formatter, generator, dan alat bantu coding.",
    status: "building",
    statusLabel: "Segera hadir",
    tag: "Web · Utilities",
    art: "dev",
    symbol: "⌘",
    url: ""
  }
];
