(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FileKitCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function parseCSV(input, delimiter) {
    const text = String(input ?? '').replace(/^\uFEFF/, '');
    const sep = delimiter || detectDelimiter(text);
    const rows = []; let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') quoted = false;
        else cell += ch;
      } else if (ch === '"' && cell === '') quoted = true;
      else if (ch === sep) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); cell = '';
        if (row.some(v => v !== '') || rows.length === 0) rows.push(row);
        row = [];
      } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    while (rows.length && rows[rows.length - 1].every(v => v === '')) rows.pop();
    return rows;
  }
  function detectDelimiter(text) {
    const line = String(text).split(/\r?\n/).find(l => l.trim()) || '';
    const candidates = [',', ';', '\t', '|'];
    return candidates.map(d => ({ d, n: line.split(d).length })).sort((a,b) => b.n-a.n)[0].n > 1 ? candidates.map(d => ({ d, n: line.split(d).length })).sort((a,b) => b.n-a.n)[0].d : ',';
  }
  function csvEscape(value, delimiter) {
    const str = value == null ? '' : String(value);
    return str.includes('"') || str.includes('\n') || str.includes('\r') || str.includes(delimiter)
      ? '"' + str.replace(/"/g, '""') + '"' : str;
  }
  function toCSV(rows, delimiter = ',') { return rows.map(row => row.map(v => csvEscape(v, delimiter)).join(delimiter)).join('\r\n'); }
  function parsePageSelection(input, total) {
    if (!Number.isInteger(total) || total < 1) throw new Error('Jumlah halaman tidak valid.');
    const out = new Set();
    for (const partRaw of String(input).split(/[\s,;]+/).filter(Boolean)) {
      const part = partRaw.trim();
      const range = part.match(/^(\d+)-(\d+)$/);
      if (range) {
        let a = Number(range[1]), b = Number(range[2]);
        if (a > b) [a,b] = [b,a];
        if (a < 1 || b > total) throw new Error(`Rentang ${part} di luar halaman 1–${total}.`);
        for (let n=a; n<=b; n++) out.add(n-1);
      } else if (/^\d+$/.test(part)) {
        const n = Number(part);
        if (n < 1 || n > total) throw new Error(`Halaman ${n} di luar halaman 1–${total}.`);
        out.add(n-1);
      } else throw new Error(`Format halaman tidak valid: ${part}`);
    }
    return [...out].sort((a,b)=>a-b);
  }
  function sanitizeFilename(name) {
    return String(name || 'file').normalize('NFKC').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/[. ]+$/g, '').slice(0,180) || 'file';
  }
  function humanSize(bytes) {
    if (!Number.isFinite(Number(bytes)) || Number(bytes) < 0) return '—';
    const n = Number(bytes); if (n < 1024) return `${n} B`;
    const units = ['KB','MB','GB','TB']; let val=n/1024, i=0;
    while (val >= 1024 && i < units.length-1) { val/=1024; i++; }
    return `${val.toFixed(val < 10 ? 2 : 1)} ${units[i]}`;
  }
  function safeJsonParse(text) { try { return { ok: true, value: JSON.parse(text) }; } catch (e) { return { ok: false, error: e.message }; } }
  function classifySignature(bytes) {
    const b = Array.from(bytes || []).slice(0,16);
    const starts = (...seq) => seq.every((n,i)=>b[i]===n);
    if (starts(0x25,0x50,0x44,0x46,0x2d)) return 'PDF';
    if (starts(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a)) return 'PNG';
    if (starts(0xff,0xd8,0xff)) return 'JPEG';
    if (b[0]===0x47&&b[1]===0x49&&b[2]===0x46&&b[3]===0x38) return 'GIF';
    if (b[0]===0x52&&b[1]===0x49&&b[2]===0x46&&b[3]===0x46&&b[8]===0x57&&b[9]===0x45&&b[10]===0x42&&b[11]===0x50) return 'WEBP';
    if (starts(0x50,0x4b,0x03,0x04)||starts(0x50,0x4b,0x05,0x06)||starts(0x50,0x4b,0x07,0x08)) return 'ZIP / OOXML';
    if (starts(0x1f,0x8b)) return 'GZIP';
    if (starts(0x42,0x4d)) return 'BMP';
    if (starts(0x49,0x44,0x33)||starts(0xff,0xfb)||starts(0xff,0xf3)||starts(0xff,0xf2)) return 'MP3 (kemungkinan)';
    if (starts(0x4f,0x67,0x67,0x53)) return 'OGG';
    if (starts(0x66,0x4c,0x61,0x43)) return 'FLAC';
    return 'Tidak dikenali dari signature sederhana';
  }
  function levenshtein(a,b) {
    a=String(a); b=String(b);
    if (a.length>b.length) [a,b]=[b,a];
    let prev=Array.from({length:a.length+1},(_,i)=>i);
    for(let j=1;j<=b.length;j++){const cur=[j];for(let i=1;i<=a.length;i++)cur[i]=Math.min(cur[i-1]+1,prev[i]+1,prev[i-1]+(a[i-1]===b[j-1]?0:1));prev=cur;}
    return prev[a.length];
  }
  function lineDiff(a,b) {
    const A=String(a).split(/\r?\n/), B=String(b).split(/\r?\n/);
    if ((A.length+1)*(B.length+1)>250000) throw new Error('Teks terlalu panjang untuk diff lokal ini (maksimal sekitar 250.000 sel perbandingan).');
    const dp=Array.from({length:A.length+1},()=>new Uint32Array(B.length+1));
    for(let i=A.length-1;i>=0;i--)for(let j=B.length-1;j>=0;j--)dp[i][j]=A[i]===B[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
    const result=[];let i=0,j=0;
    while(i<A.length&&j<B.length){if(A[i]===B[j]){result.push({type:'same',text:A[i]});i++;j++;}else if(dp[i+1][j]>=dp[i][j+1]){result.push({type:'removed',text:A[i++]});}else{result.push({type:'added',text:B[j++]});}}
    while(i<A.length)result.push({type:'removed',text:A[i++]});while(j<B.length)result.push({type:'added',text:B[j++]});return result;
  }
  function makeRename(name, pattern, index, date = new Date()) {
    const base = name.includes('.') ? name.slice(0,name.lastIndexOf('.')) : name;
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
    const pad=String(index).padStart(2,'0');
    return sanitizeFilename(String(pattern||'{name}').replaceAll('{name}',base).replaceAll('{index}',pad).replaceAll('{date}',date.toISOString().slice(0,10)))+ext;
  }
  function redactText(text) {
    let result=String(text); const findings=[];
    const patterns=[['Email',/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],['Bearer/API token',/\b(?:Bearer\s+)?(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{12,})\b/g],['Nomor telepon (pola umum)',/(?:\+?62|0)\s?8[1-9](?:[\s-]?\d){6,11}\b/g],['Private key header',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g]];
    for(const [label,re] of patterns){const matches=[...result.matchAll(re)];if(matches.length){findings.push({label,count:matches.length});result=result.replace(re,'[REDACTED]');}}
    return {text:result,findings};
  }
  return {parseCSV,detectDelimiter,toCSV,parsePageSelection,sanitizeFilename,humanSize,safeJsonParse,classifySignature,levenshtein,lineDiff,makeRename,redactText};
});
