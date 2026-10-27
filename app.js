'use strict';

const form = document.querySelector('#channel-form');
const input = document.querySelector('#channel-url');
const notice = document.querySelector('#app-notice');

function showNotice(kind, title, message) {
  notice.classList.toggle('notice-error', kind === 'error');
  const strong = notice.querySelector('strong');
  const paragraph = notice.querySelector('p');
  strong.textContent = title;
  paragraph.textContent = message;
}

function isYouTubeUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const validHost = ['youtube.com', 'm.youtube.com', 'youtu.be'].includes(host);
    const channelPath = /^\/(?:@[^/]+|channel\/UC[\w-]+|c\/[^/]+|user\/[^/]+)/i.test(url.pathname);
    const videoLink = host === 'youtu.be'
      ? /^\/[\w-]{11}/.test(url.pathname)
      : host.endsWith('youtube.com') && (url.pathname === '/watch' ? Boolean(url.searchParams.get('v')) : /^\/(?:shorts|live)\/[\w-]{11}/.test(url.pathname));
    return validHost && (channelPath || videoLink);
  } catch {
    return false;
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = input.value.trim();
  if (!value) {
    showNotice('error', 'URL masih kosong', 'Masukkan URL channel atau video YouTube terlebih dahulu.');
    input.focus();
    return;
  }
  if (!isYouTubeUrl(value)) {
    showNotice('error', 'Format URL belum dikenali', 'Gunakan URL channel seperti https://www.youtube.com/@nama-channel atau URL video YouTube yang valid.');
    input.focus();
    return;
  }
  showNotice('info', 'Format URL valid — backend belum terhubung', 'URL sudah terlihat seperti tautan YouTube yang valid. Belum ada permintaan video atau transkrip yang dikirim; fitur pengambilan data baru aktif setelah endpoint Cloudflare Worker/API dibuat.');
});

input.addEventListener('input', () => {
  if (notice.classList.contains('notice-error')) {
    showNotice('info', 'Backend belum terhubung', 'Halaman ini adalah frontend statis. Pengambilan daftar video dan transkrip akan diaktifkan setelah endpoint backend tersedia.');
  }
});
