import {
  TIMEZONE, INTERVAL_MS, TIMEFRAME_MS, DEFAULT_BALANCE, DEFAULT_FEE_BPS, DEFAULT_SLIPPAGE_BPS,
  parseKlineCsv, aggregateCandles, ema, rsi, findIndexAtOrBefore, findIndexAtOrAfter,
  formatWIB, formatAxisTime, calcTradeStats, calcPnl, estimateLiquidation, sanitizePair,
} from './core.js';

const $ = (id) => document.getElementById(id);
const STORE_KEY = 'learning-crypto-replay-v1';
const CHART_CDN = 'https://unpkg.com/lightweight-charts@5.0.8/dist/lightweight-charts.standalone.production.js';
const FFLATE_CDN = 'https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js';
const PAIRS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'LINKUSDT', 'AVAXUSDT', 'TRXUSDT'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const fmtMoney = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPrice = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
const fmtQty = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 });

let state = loadStoredState() || createEmptyState();
let activeTimeframe = state.session?.timeframe || '5m';
let datasets = new Map();
let archiveModulePromise = null;
let activeBars = [];
let activeIndex = -1;
let displayBars = [];
let chartObjects = null;
let activeTool = 'cursor';
let pendingDrawPoint = null;
let previewPoint = null;
let redoStack = [];
let syncLock = false;
let loading = false;
let wasProgrammaticRange = false;
let resizeObservers = [];

function createEmptyState() {
  return {
    version: 1,
    session: null,
    account: {
      startingBalance: DEFAULT_BALANCE,
      balance: DEFAULT_BALANCE,
      positions: [],
      trades: [],
      equityCurve: [],
      feeBps: DEFAULT_FEE_BPS,
      slippageBps: DEFAULT_SLIPPAGE_BPS,
      pairReference: {},
      tradeSequence: 0,
    },
    drawings: {},
  };
}

function loadStoredState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !parsed.account || !Array.isArray(parsed.account.trades)) return null;
    if (!Array.isArray(parsed.account.positions)) parsed.account.positions = [];
    if (!Array.isArray(parsed.account.equityCurve)) parsed.account.equityCurve = [];
    if (!parsed.drawings || typeof parsed.drawings !== 'object') parsed.drawings = {};
    return parsed;
  } catch {
    return null;
  }
}

function persistState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (error) {
    toast('Penyimpanan browser penuh atau tidak tersedia. Export jurnal sebagai JSON untuk backup.', 'error', 6000);
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function month2(month) { return String(month).padStart(2, '0'); }
function localIsoWIB(ms) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms));
  const part = (key) => parts.find((p) => p.type === key)?.value || '';
  const date = `${part('year')}-${part('month')}-${part('day')}`;
  const hms = new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(ms));
  return `${date}T${hms}`;
}
function getStartTimeSeconds() {
  const value = $('setup-start-at').value;
  if (!value) return null;
  // datetime-local is interpreted explicitly as Indonesia Western Time (UTC+7), not the browser's timezone.
  const milliseconds = Date.parse(`${value}:00+07:00`);
  return Number.isFinite(milliseconds) ? Math.floor(milliseconds / 1000) : null;
}
function startTimeValue(year, month, day = 2, hour = '09:00') {
  return `${year}-${month2(month)}-${String(day).padStart(2, '0')}T${hour}`;
}
function selectedArchiveUrl(symbol, year, month) {
  const folder = `data/futures/um/monthly/klines/${symbol}/5m`;
  return `https://data.binance.vision/${folder}/${symbol}-5m-${year}-${month2(month)}.zip`;
}
function dataCacheKey(symbol, year, month) { return `${symbol}:${year}-${month2(month)}`; }

function setStartMessage(message, type = '') {
  const node = $('start-message');
  node.textContent = message;
  node.className = `start-message${type ? ` ${type}` : ''}`;
}
function setOrderMessage(message, type = '') {
  const node = $('order-message');
  node.textContent = message;
  node.className = `inline-message${type ? ` ${type}` : ''}`;
}
function setLoading(value) {
  loading = value;
  $('start-session').disabled = value;
  $('resume-session').disabled = value;
  $('start-session').textContent = value ? 'Memuat data historis…' : 'Mulai latihan →';
  $('next-candle').disabled = value || !state.session;
  $('next-5').disabled = value || !state.session;
  $('next-10').disabled = value || !state.session;
}

async function getArchiveModule() {
  if (!archiveModulePromise) archiveModulePromise = import(FFLATE_CDN);
  return archiveModulePromise;
}

async function readResponseWithProgress(response, progressCallback) {
  const contentLength = Number(response.headers.get('content-length')) || 0;
  if (!response.body || !response.body.getReader) {
    const buffer = await response.arrayBuffer();
    progressCallback?.(buffer.byteLength, contentLength || buffer.byteLength);
    return new Uint8Array(buffer);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
    progressCallback?.(total, contentLength);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

async function loadArchive(symbol, year, month, progressCallback = null) {
  const key = dataCacheKey(symbol, year, month);
  if (datasets.has(key)) return datasets.get(key);
  if (!sanitizePair(symbol)) throw new Error('Format pair tidak valid.');

  const url = selectedArchiveUrl(symbol, year, month);
  progressCallback?.(`Menghubungkan ke arsip Binance: ${symbol} · ${year}-${month2(month)}…`);
  let response;
  try {
    response = await fetch(url, { method: 'GET', mode: 'cors', cache: 'force-cache' });
  } catch (error) {
    throw new Error(`Tidak bisa mengakses arsip Binance dari browser. Periksa koneksi atau pemblokir jaringan. Tidak ada candle buatan yang ditampilkan. (${error.message || 'network error'})`);
  }
  if (!response.ok) {
    if (response.status === 404) throw new Error(`Arsip ${symbol} 5m untuk ${year}-${month2(month)} tidak ditemukan (HTTP 404). Pair mungkin belum tersedia pada periode itu. Pilih bulan/pair lain.`);
    throw new Error(`Arsip Binance gagal dimuat (HTTP ${response.status}). Coba lagi atau pilih periode lain.`);
  }

  const bytes = await readResponseWithProgress(response, (loaded, total) => {
    if (total > 0) progressCallback?.(`Mengunduh ${symbol} ${year}-${month2(month)}: ${(loaded / 1024).toFixed(0)} KB / ${(total / 1024).toFixed(0)} KB…`);
    else progressCallback?.(`Mengunduh arsip ${symbol}… ${(loaded / 1024).toFixed(0)} KB`);
  });
  progressCallback?.(`Membuka ZIP arsip ${symbol}…`);

  let fflate;
  try { fflate = await getArchiveModule(); }
  catch (error) { throw new Error(`Library pembaca ZIP gagal dimuat dari CDN. Periksa apakah jaringan memblokir jsDelivr. (${error.message || 'import error'})`); }

  let files;
  try { files = fflate.unzipSync(bytes); }
  catch (error) { throw new Error(`File arsip diterima tetapi tidak dapat dibuka sebagai ZIP. (${error.message || 'invalid zip'})`); }
  const csvName = Object.keys(files).find((name) => name.toLowerCase().endsWith('.csv'));
  if (!csvName) throw new Error('Arsip ZIP tidak memiliki file CSV klines.');
  const csvText = fflate.strFromU8(files[csvName]);
  const bars = parseKlineCsv(csvText);
  if (bars.length < 100) throw new Error(`Data ${symbol} hanya berisi ${bars.length} candle valid. Dataset terlalu pendek untuk latihan EMA/RSI.`);

  const item = { key, symbol, year: Number(year), month: Number(month), bars, url, loadedAt: Date.now() };
  datasets.set(key, item);
  progressCallback?.(`${bars.length.toLocaleString('id-ID')} candle 5m valid berhasil dimuat.`);
  return item;
}

function populateActivePairs() {
  $('active-pair').innerHTML = PAIRS.map((pair) => `<option value="${pair}">${pair}</option>`).join('');
  $('setup-pair').innerHTML = PAIRS.map((pair) => `<option value="${pair}">${pair}</option>`).join('');
}

function updateSetupDateBounds() {
  const year = Number($('setup-year').value);
  const month = Number($('setup-month').value);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  $('setup-start-at').min = startTimeValue(year, month, 1, '00:00');
  $('setup-start-at').max = startTimeValue(year, month, lastDay, '23:55');
  const current = $('setup-start-at').value;
  if (!current || current.slice(0, 7) !== `${year}-${month2(month)}`) $('setup-start-at').value = startTimeValue(year, month, Math.min(2, lastDay), '09:00');
}

function timestampToSeconds(time) {
  if (typeof time === 'number') return time;
  if (time && typeof time === 'object' && 'year' in time) return Math.floor(Date.UTC(time.year, time.month - 1, time.day) / 1000);
  if (typeof time === 'string') return Math.floor(Date.parse(time) / 1000);
  return NaN;
}

function updateTimeAxisVisibility() {
  if (!chartObjects) return;
  const rsiVisible = $('toggle-rsi').checked;
  const volumeVisible = $('toggle-volume').checked;
  chartObjects.priceChart.timeScale().applyOptions({ visible: !rsiVisible && !volumeVisible });
  chartObjects.volumeChart.timeScale().applyOptions({ visible: !rsiVisible && volumeVisible });
  chartObjects.rsiChart.timeScale().applyOptions({ visible: rsiVisible });
}

function makeChartOptions(container, height, showTimeScale = false) {
  return {
    width: Math.max(220, container.clientWidth || 600),
    height: Math.max(70, height || container.clientHeight || 260),
    autoSize: true,
    layout: { background: { type: 'solid', color: '#0e141c' }, textColor: '#8190a4', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10 },
    grid: { vertLines: { color: '#19232f' }, horzLines: { color: '#19232f' } },
    crosshair: { mode: window.LightweightCharts?.CrosshairMode?.Normal ?? 0, vertLine: { color: '#60758c', width: 1, style: 2, labelBackgroundColor: '#283b4a' }, horzLine: { color: '#60758c', width: 1, style: 2, labelBackgroundColor: '#283b4a' } },
    rightPriceScale: { borderColor: '#293644', scaleMargins: { top: 0.12, bottom: 0.1 }, minimumWidth: 64 },
    timeScale: {
      visible: showTimeScale,
      timeVisible: true,
      secondsVisible: false,
      borderColor: '#293644',
      rightOffset: 5,
      barSpacing: 7,
      minBarSpacing: 2,
      tickMarkFormatter: (time, tickMarkType) => formatAxisTime(time, tickMarkType),
    },
    localization: {
      locale: 'id-ID',
      timeFormatter: (time) => formatWIB(timestampToSeconds(time)),
      priceFormatter: (price) => fmtPrice.format(price),
    },
    handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
    handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true, axisDoubleClickReset: true },
  };
}

function ensureCharts() {
  if (chartObjects) return;
  if (!window.LightweightCharts?.createChart) throw new Error('Chart library gagal dimuat. Muat ulang halaman dan pastikan unpkg.com tidak diblokir.');
  const L = window.LightweightCharts;
  const priceHost = $('price-chart');
  const volumeHost = $('volume-chart');
  const rsiHost = $('rsi-chart');
  const priceChart = L.createChart(priceHost, makeChartOptions(priceHost, 430, false));
  const volumeChart = L.createChart(volumeHost, makeChartOptions(volumeHost, 94, false));
  const rsiChart = L.createChart(rsiHost, makeChartOptions(rsiHost, 117, true));
  const candleSeries = priceChart.addSeries(L.CandlestickSeries, {
    upColor: '#35c995', downColor: '#ef6874', borderUpColor: '#35c995', borderDownColor: '#ef6874',
    wickUpColor: '#35c995', wickDownColor: '#ef6874',
    priceLineColor: '#d7e0ea', priceLineStyle: 2,
  });
  const ema20Series = priceChart.addSeries(L.LineSeries, { color: '#e7bf64', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, title: 'EMA 20' });
  const ema50Series = priceChart.addSeries(L.LineSeries, { color: '#aa96ff', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, title: 'EMA 50' });
  const volumeSeries = volumeChart.addSeries(L.HistogramSeries, { priceFormat: { type: 'volume' }, priceLineVisible: false, lastValueVisible: false });
  const rsiSeries = rsiChart.addSeries(L.LineSeries, { color: '#a88aff', lineWidth: 2, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false, priceFormat: { type: 'price', precision: 1, minMove: 0.1 }, title: 'RSI 14' });
  const rsi30 = rsiChart.addSeries(L.LineSeries, { color: 'rgba(241,113,124,.55)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
  const rsi50 = rsiChart.addSeries(L.LineSeries, { color: 'rgba(133,149,169,.45)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
  const rsi70 = rsiChart.addSeries(L.LineSeries, { color: 'rgba(73,215,164,.55)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });

  chartObjects = { priceChart, volumeChart, rsiChart, candleSeries, ema20Series, ema50Series, volumeSeries, rsiSeries, rsi30, rsi50, rsi70 };
  updateTimeAxisVisibility();

  const sync = (source) => source.timeScale().subscribeVisibleLogicalRangeChange((range) => {
    if (!range || syncLock || !chartObjects) return;
    syncLock = true;
    for (const chart of [priceChart, volumeChart, rsiChart]) {
      if (chart !== source) {
        try { chart.timeScale().setVisibleLogicalRange(range); } catch { /* Ignore transient range mismatch during first paint. */ }
      }
    }
    syncLock = false;
    renderDrawings();
  });
  sync(priceChart); sync(volumeChart); sync(rsiChart);

  priceChart.subscribeCrosshairMove((param) => {
    if (param?.time == null) return;
    const when = timestampToSeconds(param.time);
    if (Number.isFinite(when)) $('crosshair-time').textContent = `Crosshair: ${formatWIB(when)}`;
    const bar = param.seriesData?.get(candleSeries);
    if (bar) $('ohlc-line').textContent = `O ${fmtPrice.format(bar.open)} · H ${fmtPrice.format(bar.high)} · L ${fmtPrice.format(bar.low)} · C ${fmtPrice.format(bar.close)}`;
  });
  priceChart.timeScale().subscribeVisibleLogicalRangeChange(() => renderDrawings());

  for (const [host, chart] of [[priceHost, priceChart], [volumeHost, volumeChart], [rsiHost, rsiChart]]) {
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver((entries) => {
        const rect = entries[0]?.contentRect;
        if (!rect || rect.width <= 0 || rect.height <= 0) return;
        chart.applyOptions({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
        renderDrawings();
      });
      observer.observe(host);
      resizeObservers.push(observer);
    } else {
      window.addEventListener('resize', () => chart.applyOptions({ width: host.clientWidth, height: host.clientHeight }));
    }
  }

  $('toggle-ema20').addEventListener('change', (event) => ema20Series.applyOptions({ visible: event.target.checked }));
  $('toggle-ema50').addEventListener('change', (event) => ema50Series.applyOptions({ visible: event.target.checked }));
  $('toggle-volume').addEventListener('change', (event) => {
    document.querySelector('.volume-card')?.classList.toggle('is-hidden', !event.target.checked);
    setTimeout(() => { if (volumeHost.clientHeight > 0) volumeChart.applyOptions({ width: volumeHost.clientWidth, height: volumeHost.clientHeight }); updateTimeAxisVisibility(); }, 25);
  });
  $('toggle-rsi').addEventListener('change', (event) => {
    document.querySelector('.rsi-card')?.classList.toggle('is-hidden', !event.target.checked);
    setTimeout(() => { if (rsiHost.clientHeight > 0) rsiChart.applyOptions({ width: rsiHost.clientWidth, height: rsiHost.clientHeight }); updateTimeAxisVisibility(); }, 25);
  });

  $('price-plot').addEventListener('pointerdown', handlePlotPointerDown, true);
  $('price-plot').addEventListener('pointermove', handlePlotPointerMove, true);
  $('price-plot').addEventListener('pointerleave', () => { previewPoint = null; renderDrawings(); });
}

function getCurrentBar() {
  if (!activeBars.length || activeIndex < 0 || activeIndex >= activeBars.length) return null;
  return activeBars[activeIndex];
}

function buildLineData(times, value, title = '') {
  return times.map((bar) => ({ time: bar.time, value })).filter((point) => Number.isFinite(point.value));
}

function updateChartData({ fit = false } = {}) {
  if (!chartObjects || !activeBars.length || activeIndex < 0) return;
  const revealedM5 = activeBars.slice(0, activeIndex + 1);
  // Derive the selected timeframe from revealed M5 bars only. The final HTF candle is
  // intentionally partial and changes as the user presses Next Candle; no future M5 is used.
  displayBars = aggregateCandles(revealedM5, activeTimeframe);
  if (!displayBars.length) return;
  const closes = displayBars.map((bar) => bar.close);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const rsi14 = rsi(closes, 14);
  const visibleStart = 0;

  const candleData = displayBars.map((bar) => ({ time: bar.time, open: bar.open, high: bar.high, low: bar.low, close: bar.close }));
  const ema20Data = ema20.slice(visibleStart).map((value, i) => value == null ? null : ({ time: displayBars[i].time, value })).filter(Boolean);
  const ema50Data = ema50.slice(visibleStart).map((value, i) => value == null ? null : ({ time: displayBars[i].time, value })).filter(Boolean);
  const volumeData = displayBars.map((bar) => ({ time: bar.time, value: bar.volume, color: bar.close >= bar.open ? 'rgba(53,201,149,.58)' : 'rgba(239,104,116,.58)' }));
  const rsiData = rsi14.slice(visibleStart).map((value, i) => value == null ? null : ({ time: displayBars[i].time, value })).filter(Boolean);
  const rsiLines = [30, 50, 70].map((level) => displayBars.map((bar) => ({ time: bar.time, value: level })));

  chartObjects.candleSeries.setData(candleData);
  chartObjects.ema20Series.setData(ema20Data);
  chartObjects.ema50Series.setData(ema50Data);
  chartObjects.ema20Series.applyOptions({ visible: $('toggle-ema20').checked });
  chartObjects.ema50Series.applyOptions({ visible: $('toggle-ema50').checked });
  chartObjects.volumeSeries.setData(volumeData);
  chartObjects.rsiSeries.setData(rsiData);
  chartObjects.rsi30.setData(rsiLines[0]);
  chartObjects.rsi50.setData(rsiLines[1]);
  chartObjects.rsi70.setData(rsiLines[2]);
  const showRsi = $('toggle-rsi').checked;
  chartObjects.rsiSeries.applyOptions({ visible: showRsi });
  chartObjects.rsi30.applyOptions({ visible: showRsi });
  chartObjects.rsi50.applyOptions({ visible: showRsi });
  chartObjects.rsi70.applyOptions({ visible: showRsi });

  if (fit || !wasProgrammaticRange) {
    try {
      chartObjects.priceChart.timeScale().setVisibleLogicalRange({ from: Math.max(0, candleData.length - Math.min(110, candleData.length)), to: candleData.length + 7 });
      wasProgrammaticRange = true;
    } catch {
      chartObjects.priceChart.timeScale().fitContent();
    }
  } else {
    try { chartObjects.priceChart.timeScale().setVisibleLogicalRange({ from: Math.max(0, candleData.length - 110), to: candleData.length + 7 }); } catch { /* chart will autoscale when its range next changes */ }
  }
  const bar = getCurrentBar();
  if (bar) updateHeaderForBar(bar, displayBars, rsi14);
  renderDrawings();
  updateContextCards();
  renderAccount();
  updateOrderPreview();
}

function timeframeLabel(timeframe = activeTimeframe) {
  return ({ '5m': 'M5', '15m': 'M15', '1h': 'H1', '4h': 'H4', '1d': 'D1' })[timeframe] || timeframe.toUpperCase();
}

function updateTimeframeButtons() {
  document.querySelectorAll('[data-timeframe]').forEach((button) => {
    const selected = button.dataset.timeframe === activeTimeframe;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  if (state.session) state.session.timeframe = activeTimeframe;
  persistState();
}

function setTimeframe(timeframe) {
  if (!Object.hasOwn(TIMEFRAME_MS, timeframe) || timeframe === activeTimeframe) return;
  activeTimeframe = timeframe;
  updateTimeframeButtons();
  if (state.session && activeBars.length && activeIndex >= 0) {
    updateChartData({ fit: true });
    toast(`Chart berubah ke ${timeframeLabel()}. Replay tetap maju per candle M5.`, 'success', 3200);
  } else {
    $('chart-symbol-title').nextElementSibling.textContent = `Binance USDⓈ-M · Candlestick · ${timeframeLabel()}`;
  }
}

function updateHeaderForBar(bar, timeframeBars, rsiValues) {
  const chartBar = timeframeBars[timeframeBars.length - 1];
  $('chart-symbol-title').textContent = state.session.activeSymbol;
  $('symbol-avatar').textContent = state.session.activeSymbol.replace('USDT', '').slice(0, 1);
  $('chart-symbol-title').nextElementSibling.textContent = `Binance USDⓈ-M · Candlestick · ${timeframeLabel()}`;
  $('last-price').textContent = fmtPrice.format(bar.close);
  const initial = state.account.pairReference[state.session.activeSymbol];
  const change = Number.isFinite(initial) && initial !== 0 ? ((bar.close / initial) - 1) * 100 : 0;
  $('last-change').textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}% sejak pair dipilih`;
  $('last-change').className = change >= 0 ? 'positive' : 'negative';

  const timeframeMs = TIMEFRAME_MS[activeTimeframe];
  const periodEndSec = Math.floor((chartBar.timeMs + timeframeMs) / 1000);
  const dataUntilSec = Math.floor((bar.timeMs + INTERVAL_MS) / 1000);
  const complete = dataUntilSec >= periodEndSec;
  if (activeTimeframe === '5m') {
    $('main-time-label').textContent = `M5 · ${formatWIB(chartBar.time)} → ${formatWIB(periodEndSec)}`;
  } else if (complete) {
    $('main-time-label').textContent = `${timeframeLabel()} · ${formatWIB(chartBar.time)} → ${formatWIB(periodEndSec)} · selesai`;
  } else {
    $('main-time-label').textContent = `${timeframeLabel()} · mulai ${formatWIB(chartBar.time)} · data sampai ${formatWIB(dataUntilSec)}`;
  }
  $('replay-time').textContent = formatWIB(bar.time);
  const startingIndex = state.session.startIndexBySymbol?.[state.session.activeSymbol] ?? activeIndex;
  const count = Math.max(1, activeIndex - startingIndex + 1);
  $('replay-progress').textContent = `${count.toLocaleString('id-ID')} candle M5 dilangkahkan · ${timeframeBars.length.toLocaleString('id-ID')} candle ${timeframeLabel()} terlihat`;
  $('replay-progress').title = 'Replay berjalan berdasarkan M5. Candle timeframe lebih tinggi dibangun hanya dari M5 yang sudah dibuka.';
  $('session-year-chip').textContent = `${state.session.year} · ${MONTHS[state.session.month - 1]}`;
  $('active-pair').value = state.session.activeSymbol;
  $('ohlc-line').textContent = `O ${fmtPrice.format(chartBar.open)} · H ${fmtPrice.format(chartBar.high)} · L ${fmtPrice.format(chartBar.low)} · C ${fmtPrice.format(chartBar.close)} · Vol ${fmtQty.format(chartBar.volume)}`;
  const lastRsi = rsiValues[rsiValues.length - 1];
  $('rsi-value').textContent = lastRsi == null ? `RSI 14 · perlu lebih banyak ${timeframeLabel()}` : `RSI 14 · ${lastRsi.toFixed(1)}`;
  $('volume-time-label').textContent = `${state.session.activeSymbol} · ${timeframeLabel()}`;
  $('replay-progress').setAttribute('aria-label', `${count} candle M5 dilangkahkan dari awal sesi`);
  $('chart-empty').hidden = true;
  $('next-candle').disabled = loading || findIndexAtOrAfter(activeBars, state.session.cursorTime + 1) >= activeBars.length;
  $('next-5').disabled = $('next-candle').disabled;
  $('next-10').disabled = $('next-candle').disabled;
  updateTimeframeButtons();
}

function getDrawings() {
  if (!state.session) return [];
  const key = `${state.session.sessionId}:${state.session.activeSymbol}`;
  if (!Array.isArray(state.drawings[key])) state.drawings[key] = [];
  return state.drawings[key];
}
function saveDrawings() { persistState(); }
function svgLine(x1, y1, x2, y2, stroke, width = 1.5, dash = '') {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''} vector-effect="non-scaling-stroke"/>`;
}
function svgText(x, y, text, color = '#d8e2ed', align = 'start') {
  return `<text x="${x}" y="${y}" fill="${color}" font-family="Inter,system-ui,sans-serif" font-size="10" font-weight="700" text-anchor="${align}" paint-order="stroke" stroke="#0e141c" stroke-width="3" stroke-linejoin="round">${escapeHtml(text)}</text>`;
}
function coordForPoint(point) {
  if (!point || !chartObjects) return null;
  const mappedIndex = findIndexAtOrBefore(displayBars, point.time);
  const mappedTime = mappedIndex >= 0 ? displayBars[mappedIndex].time : point.time;
  const x = chartObjects.priceChart.timeScale().timeToCoordinate(mappedTime);
  const y = chartObjects.candleSeries.priceToCoordinate(point.price);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}
function redrawOneDrawing(drawing, width, height) {
  const p1 = coordForPoint(drawing.points?.[0]);
  if (drawing.type === 'horizontal') {
    const y = chartObjects.candleSeries.priceToCoordinate(drawing.points[0].price);
    if (!Number.isFinite(y)) return '';
    return `${svgLine(0, y, Math.max(0, width - 70), y, '#e6bd65', 1.4, '5 4')}${svgText(8, y - 5, `H · ${fmtPrice.format(drawing.points[0].price)}`, '#e6bd65')}`;
  }
  if (!p1) return '';
  const point2 = drawing.points?.[1] || (drawing === previewPoint ? null : null);
  const p2 = coordForPoint(point2);
  if (!p2) return '';

  if (drawing.type === 'trend') {
    return `${svgLine(p1.x, p1.y, p2.x, p2.y, '#84aaff', 1.8)}<circle cx="${p1.x}" cy="${p1.y}" r="3" fill="#84aaff"/><circle cx="${p2.x}" cy="${p2.y}" r="3" fill="#84aaff"/>`;
  }

  if (drawing.type === 'fib') {
    const x1 = Math.min(p1.x, p2.x);
    const x2 = Math.max(p1.x, p2.x);
    const delta = p2.y - p1.y;
    const deltaPrice = point2.price - drawing.points[0].price;
    return FIB_LEVELS.map((level) => {
      const y = p1.y + delta * level;
      const price = drawing.points[0].price + deltaPrice * level;
      return `${svgLine(x1, y, x2, y, level === 0.5 ? '#e6bd65' : '#7d91a8', level === 0.5 ? 1.4 : 1, '4 3')}${svgText(x2 + 5, y - 3, `${(level * 100).toFixed(1)}% · ${fmtPrice.format(price)}`, level === 0.5 ? '#f0d28a' : '#b1c0d0')}`;
    }).join('');
  }

  if (drawing.type === 'long' || drawing.type === 'short') {
    const entry = drawing.points[0].price;
    const rawSecond = point2.price;
    const isLong = drawing.type === 'long';
    const stop = isLong ? Math.min(rawSecond, entry * 0.999999) : Math.max(rawSecond, entry * 1.000001);
    const risk = Math.abs(entry - stop);
    const target = isLong ? entry + risk * 2 : entry - risk * 2;
    const yEntry = chartObjects.candleSeries.priceToCoordinate(entry);
    const yStop = chartObjects.candleSeries.priceToCoordinate(stop);
    const yTarget = chartObjects.candleSeries.priceToCoordinate(target);
    if (![yEntry, yStop, yTarget].every(Number.isFinite)) return '';
    const x1 = Math.min(p1.x, p2.x);
    const x2 = Math.max(x1 + 50, p2.x);
    const targetTop = Math.min(yEntry, yTarget);
    const targetHeight = Math.max(1, Math.abs(yEntry - yTarget));
    const stopTop = Math.min(yEntry, yStop);
    const stopHeight = Math.max(1, Math.abs(yEntry - yStop));
    const positive = '#42d3a0';
    const negative = '#ec6e79';
    return `<rect x="${x1}" y="${targetTop}" width="${x2 - x1}" height="${targetHeight}" fill="${positive}" fill-opacity=".13" stroke="${positive}" stroke-opacity=".4"/><rect x="${x1}" y="${stopTop}" width="${x2 - x1}" height="${stopHeight}" fill="${negative}" fill-opacity=".13" stroke="${negative}" stroke-opacity=".45"/>${svgLine(x1, yEntry, x2, yEntry, '#edf3fa', 1, '3 3')}${svgText(x1 + 5, targetTop + 13, `${isLong ? 'LONG' : 'SHORT'} · target ${fmtPrice.format(target)}`, positive)}${svgText(x1 + 5, stopTop + stopHeight - 4, `stop ${fmtPrice.format(stop)} · R:R 1:2`, negative)}`;
  }
  return '';
}
function renderDrawings() {
  if (!chartObjects) return;
  const layer = $('drawing-layer');
  const width = $('price-plot').clientWidth;
  const height = $('price-plot').clientHeight;
  if (!width || !height) return;
  layer.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const drawings = [...getDrawings()];
  if (previewPoint) drawings.push(previewPoint);
  layer.innerHTML = drawings.map((drawing) => redrawOneDrawing(drawing, width, height)).join('');
}
function pointAtPointer(event) {
  if (!chartObjects || !displayBars.length) return null;
  const box = $('price-plot').getBoundingClientRect();
  const x = event.clientX - box.left;
  const y = event.clientY - box.top;
  if (x < 0 || x > box.width - 64 || y < 3 || y > box.height - 18) return null;
  const logical = chartObjects.priceChart.timeScale().coordinateToLogical(x);
  const price = chartObjects.candleSeries.coordinateToPrice(y);
  if (!Number.isFinite(logical) || !Number.isFinite(price)) return null;
  const idx = Math.max(0, Math.min(displayBars.length - 1, Math.round(logical)));
  const bar = displayBars[idx];
  return bar ? { time: bar.time, price } : null;
}
function handlePlotPointerDown(event) {
  if (activeTool === 'cursor' || !state.session || loading) return;
  const point = pointAtPointer(event);
  if (!point) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (activeTool === 'horizontal') {
    getDrawings().push({ id: crypto.randomUUID?.() || String(Date.now()), type: 'horizontal', points: [point] });
    finishDrawing();
    return;
  }
  if (!pendingDrawPoint) {
    pendingDrawPoint = point;
    previewPoint = { id: 'preview', type: activeTool, points: [point, point] };
    $('drawing-hint').textContent = activeTool === 'fib' ? 'Klik titik kedua untuk rentang Fibonacci.' : 'Klik titik kedua untuk menyelesaikan gambar.';
    renderDrawings();
    return;
  }
  const drawing = { id: crypto.randomUUID?.() || String(Date.now()), type: activeTool, points: [pendingDrawPoint, point] };
  getDrawings().push(drawing);
  redoStack = [];
  finishDrawing();
  saveDrawings();
}
function handlePlotPointerMove(event) {
  if (!pendingDrawPoint || activeTool === 'cursor' || !state.session) return;
  const point = pointAtPointer(event);
  if (!point) return;
  previewPoint = { id: 'preview', type: activeTool, points: [pendingDrawPoint, point] };
  renderDrawings();
}
function finishDrawing() {
  pendingDrawPoint = null;
  previewPoint = null;
  activeTool = 'cursor';
  document.querySelectorAll('[data-tool]').forEach((button) => button.classList.toggle('active', button.dataset.tool === activeTool));
  $('drawing-hint').textContent = 'Pilih alat gambar untuk mulai.';
  renderDrawings();
  saveDrawings();
}
function chooseDrawingTool(tool) {
  activeTool = tool;
  pendingDrawPoint = null;
  previewPoint = null;
  document.querySelectorAll('[data-tool]').forEach((button) => button.classList.toggle('active', button.dataset.tool === tool));
  const hints = { cursor: 'Pilih alat gambar untuk mulai.', horizontal: 'Klik chart untuk menaruh garis horizontal.', trend: 'Klik dua titik untuk menggambar trend line.', fib: 'Klik swing pertama lalu swing kedua untuk Fibonacci.', long: 'Klik entry lalu titik stop untuk menggambar Long Position (target default 2R).', short: 'Klik entry lalu titik stop untuk menggambar Short Position (target default 2R).' };
  $('drawing-hint').textContent = hints[tool] || '';
  renderDrawings();
}

function setSessionUI(active) {
  $('welcome-overlay').hidden = active;
  $('chart-empty').hidden = active;
  $('next-candle').disabled = !active || loading;
  $('next-5').disabled = !active || loading;
  $('next-10').disabled = !active || loading;
  $('place-order').disabled = !active || loading;
  $('active-pair').disabled = !active || loading;
  $('reset-session').disabled = !active || loading;
  if (active) {
    document.body.classList.add('session-active');
    $('start-session').disabled = false;
  }
}

function chooseStartIndex(bars, mode, specificTime) {
  if (mode === 'specific') {
    const target = Number(specificTime);
    if (!Number.isFinite(target)) throw new Error('Pilih tanggal dan waktu mulai yang valid.');
    const index = findIndexAtOrAfter(bars, target);
    if (index >= bars.length) throw new Error('Waktu mulai berada setelah candle terakhir dalam arsip bulan ini. Pilih waktu yang lebih awal.');
    return index;
  }
  const min = Math.min(180, Math.max(0, bars.length - 2));
  const max = Math.max(min, bars.length - 700);
  return Math.floor(min + Math.random() * (max - min + 1));
}

async function startNewSession(config) {
  if (loading) return;
  setLoading(true);
  setStartMessage('Menyiapkan arsip historis Binance…');
  try {
    ensureCharts();
    const { year, month, symbol, mode, startAt } = config;
    const mainData = await loadArchive(symbol, year, month, (message) => setStartMessage(message));
    let btcData = null;
    if (symbol !== 'BTCUSDT') {
      try { btcData = await loadArchive('BTCUSDT', year, month, (message) => setStartMessage(`Konteks BTC: ${message}`)); }
      catch (error) { setStartMessage(`Pair utama siap; konteks BTC gagal dimuat: ${error.message}`, 'error'); }
    } else btcData = mainData;

    const startIndex = chooseStartIndex(mainData.bars, mode, startAt);
    const bar = mainData.bars[startIndex];
    state.session = {
      year: Number(year), month: Number(month), activeSymbol: symbol,
      cursorTime: bar.time, startingTime: bar.time, sessionId: (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
      startMode: mode, requestedStartTime: startAt || null, timeframe: activeTimeframe,
      startIndexBySymbol: { [symbol]: startIndex }, pairReference: {},
    };
    state.account = {
      startingBalance: DEFAULT_BALANCE, balance: DEFAULT_BALANCE, positions: [], trades: [],
      equityCurve: [{ time: bar.time, equity: DEFAULT_BALANCE }], feeBps: clampNumber($('fee-bps').value, 0, 100, DEFAULT_FEE_BPS),
      slippageBps: clampNumber($('slippage-bps').value, 0, 100, DEFAULT_SLIPPAGE_BPS),
      pairReference: { [symbol]: bar.close }, tradeSequence: 0,
    };
    activeBars = mainData.bars;
    activeIndex = startIndex;
    state.session.startIndexBySymbol[symbol] = startIndex;
    if (btcData && symbol === 'BTCUSDT') state.account.pairReference.BTCUSDT = bar.close;
    persistState();
    setSessionUI(true);
    updateChartData({ fit: true });
    setOrderMessage('Entry simulasi memakai close candle yang sedang terlihat. Tidak ada order sungguhan.', 'success');
    setStartMessage(`Berhasil memuat ${mainData.bars.length.toLocaleString('id-ID')} candle riil.`, 'success');
    toast(`Replay dimulai pada ${formatWIB(bar.time)}.`, 'success');
  } catch (error) {
    setStartMessage(error.message || 'Sesi gagal dimulai.', 'error');
    $('chart-empty').hidden = false;
    toast(error.message || 'Sesi gagal dimulai.', 'error', 6500);
  } finally {
    setLoading(false);
    if (state.session) updateChartData({ fit: false });
  }
}

async function resumePreviousSession() {
  if (!state.session || loading) return;
  setLoading(true);
  setStartMessage('Memuat sesi terakhir dari penyimpanan browser…');
  try {
    ensureCharts();
    const s = state.session;
    activeTimeframe = Object.hasOwn(TIMEFRAME_MS, s.timeframe) ? s.timeframe : '5m';
    updateTimeframeButtons();
    const mainData = await loadArchive(s.activeSymbol, s.year, s.month, (message) => setStartMessage(message));
    activeBars = mainData.bars;
    activeIndex = findIndexAtOrBefore(activeBars, s.cursorTime);
    if (activeIndex < 0) throw new Error('Sesi tersimpan berada di luar rentang data yang tersedia. Mulai sesi baru.');

    const symbolsToLoad = new Set(['BTCUSDT', ...state.account.positions.map((position) => position.symbol)]);
    symbolsToLoad.delete(s.activeSymbol);
    for (const symbol of symbolsToLoad) {
      try { await loadArchive(symbol, s.year, s.month, (message) => setStartMessage(`Memulihkan ${symbol}: ${message}`)); }
      catch (error) { toast(`Data ${symbol} untuk posisi/sesi tersimpan tidak dapat dimuat: ${error.message}`, 'error', 7000); }
    }
    if (!state.account.pairReference || typeof state.account.pairReference !== 'object') state.account.pairReference = {};
    if (!state.session.pairReference || typeof state.session.pairReference !== 'object') state.session.pairReference = {};
    state.account.feeBps = clampNumber($('fee-bps').value, 0, 100, state.account.feeBps || DEFAULT_FEE_BPS);
    state.account.slippageBps = clampNumber($('slippage-bps').value, 0, 100, state.account.slippageBps || DEFAULT_SLIPPAGE_BPS);
    $('fee-bps').value = state.account.feeBps;
    $('slippage-bps').value = state.account.slippageBps;
    setSessionUI(true);
    updateChartData({ fit: true });
    setOrderMessage('Sesi terakhir berhasil dipulihkan dari browser ini.', 'success');
    toast('Sesi sebelumnya berhasil dilanjutkan.', 'success');
  } catch (error) {
    setStartMessage(error.message || 'Sesi tidak bisa dipulihkan.', 'error');
    toast(error.message || 'Sesi tidak bisa dipulihkan.', 'error');
  } finally {
    setLoading(false);
    if (state.session) updateChartData({ fit: false });
  }
}

async function switchPair(symbol) {
  if (!state.session || loading || symbol === state.session.activeSymbol) return;
  if (!sanitizePair(symbol) || !PAIRS.includes(symbol)) return;
  const oldSymbol = state.session.activeSymbol;
  const oldIndex = activeIndex;
  const oldBars = activeBars;
  loading = true;
  $('active-pair').disabled = true;
  $('next-candle').disabled = true;
  $('next-5').disabled = true;
  $('next-10').disabled = true;
  $('chart-empty').hidden = false;
  $('chart-empty').innerHTML = `<span class="empty-icon">◌</span><strong>Memuat ${escapeHtml(symbol)}</strong><span>Arsip candle historis bulan yang sama sedang dibuka.</span>`;
  try {
    const item = await loadArchive(symbol, state.session.year, state.session.month, (message) => {
      $('chart-empty').innerHTML = `<span class="empty-icon">◌</span><strong>Memuat ${escapeHtml(symbol)}</strong><span>${escapeHtml(message)}</span>`;
    });
    const newIndex = findIndexAtOrBefore(item.bars, state.session.cursorTime);
    if (newIndex < 0) throw new Error(`${symbol} belum memiliki candle sampai waktu replay ${formatWIB(state.session.cursorTime)}. Coba bulan/periode lain.`);
    state.session.activeSymbol = symbol;
    activeBars = item.bars;
    activeIndex = newIndex;
    if (!Number.isFinite(state.account.pairReference[symbol])) state.account.pairReference[symbol] = item.bars[newIndex].close;
    state.session.startIndexBySymbol ||= {};
    if (!Number.isFinite(state.session.startIndexBySymbol[symbol])) state.session.startIndexBySymbol[symbol] = newIndex;
    if (symbol !== 'BTCUSDT') {
      try { await loadArchive('BTCUSDT', state.session.year, state.session.month); }
      catch (error) { $('btc-context-message').textContent = `Konteks BTC tidak tersedia: ${error.message}`; }
    }
    $('chart-empty').hidden = true;
    updateChartData({ fit: true });
    persistState();
    setOrderMessage(`Pair berganti ke ${symbol}. Saldo, jurnal, dan statistik sesi tetap dipertahankan.`, 'success');
    toast(`${symbol} dibuka pada waktu replay yang sama. Statistik tidak di-reset.`, 'success');
  } catch (error) {
    state.session.activeSymbol = oldSymbol;
    activeBars = oldBars;
    activeIndex = oldIndex;
    $('active-pair').value = oldSymbol;
    $('chart-empty').hidden = true;
    toast(error.message || `Gagal memuat ${symbol}.`, 'error', 7000);
  } finally {
    loading = false;
    $('active-pair').disabled = false;
    updateChartData({ fit: false });
  }
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function currentMarkPrice(symbol, atTime = state.session?.cursorTime) {
  const key = state.session ? dataCacheKey(symbol, state.session.year, state.session.month) : null;
  const data = key ? datasets.get(key) : null;
  if (!data?.bars?.length || !Number.isFinite(atTime)) return null;
  const idx = findIndexAtOrBefore(data.bars, atTime);
  return idx >= 0 ? data.bars[idx].close : null;
}

function unrealizedForPosition(position, atTime = state.session?.cursorTime) {
  const mark = currentMarkPrice(position.symbol, atTime) ?? position.lastMarkPrice ?? position.entryPrice;
  return calcPnl(position.side, position.quantity, position.entryPrice, mark);
}
function calculateAccountSnapshot() {
  const account = state.account;
  const unrealized = account.positions.reduce((total, position) => total + unrealizedForPosition(position), 0);
  const usedMargin = account.positions.reduce((total, position) => total + position.margin, 0);
  const equity = account.balance + unrealized;
  return { balance: account.balance, unrealized, equity, usedMargin, freeMargin: equity - usedMargin };
}
function updateEquityPoint(time) {
  const snapshot = calculateAccountSnapshot();
  const curve = state.account.equityCurve;
  const point = { time, equity: snapshot.equity };
  if (curve.length && curve[curve.length - 1].time === time) curve[curve.length - 1] = point;
  else curve.push(point);
  // The selected dataset is one month; cap stored history to prevent localStorage from growing without limit.
  if (curve.length > 12000) curve.splice(1, curve.length - 12000);
}

function updatePositionOnBar(position, bar) {
  if (bar.time <= position.entryTime) return false;
  const long = position.side === 'long';
  const liqHit = long ? bar.low <= position.liquidationPrice : bar.high >= position.liquidationPrice;
  const stopHit = position.stopLoss != null && (long ? bar.low <= position.stopLoss : bar.high >= position.stopLoss);
  const targetHit = position.takeProfit != null && (long ? bar.high >= position.takeProfit : bar.low <= position.takeProfit);

  // Conservative intrabar rule: if liquidation is crossed, treat it as worst case; if SL and TP
  // are both crossed inside one 5m candle, assume the stop happened first because order is unknown.
  if (liqHit) {
    closePosition(position.id, position.liquidationPrice, 'LIQ', bar.time, true);
    return true;
  }
  if (stopHit && targetHit) {
    closePosition(position.id, position.stopLoss, 'SL · candle ambigu', bar.time, false);
    return true;
  }
  if (stopHit) {
    closePosition(position.id, position.stopLoss, 'SL', bar.time, false);
    return true;
  }
  if (targetHit) {
    closePosition(position.id, position.takeProfit, 'TP', bar.time, false);
    return true;
  }
  position.lastMarkPrice = bar.close;
  return false;
}

function processPositionsThrough(targetTime) {
  const positions = [...state.account.positions];
  for (const position of positions) {
    const data = datasets.get(dataCacheKey(position.symbol, state.session.year, state.session.month));
    if (!data?.bars?.length) continue;
    let checkedTo = position.lastCheckedTime ?? position.entryTime;
    const firstIndex = findIndexAtOrAfter(data.bars, checkedTo + 1);
    for (let barIndex = firstIndex; barIndex < data.bars.length; barIndex++) {
      const bar = data.bars[barIndex];
      if (bar.time > targetTime) break;
      if (bar.time <= position.entryTime) { checkedTo = Math.max(checkedTo, bar.time); continue; }
      const closed = updatePositionOnBar(position, bar);
      checkedTo = bar.time;
      if (closed) break;
    }
    const stillOpen = state.account.positions.find((p) => p.id === position.id);
    if (stillOpen) {
      stillOpen.lastCheckedTime = targetTime;
      const mark = currentMarkPrice(stillOpen.symbol, targetTime);
      if (Number.isFinite(mark)) stillOpen.lastMarkPrice = mark;
    }
  }
}

function advanceOne() {
  if (!state.session || !activeBars.length || activeIndex < 0) return false;
  const nextIndex = findIndexAtOrAfter(activeBars, state.session.cursorTime + 1);
  if (nextIndex >= activeBars.length) return false;
  const nextBar = activeBars[nextIndex];
  processPositionsThrough(nextBar.time);
  state.session.cursorTime = nextBar.time;
  activeIndex = nextIndex;
  updateEquityPoint(nextBar.time);
  return true;
}
function stepForward(count = 1) {
  if (!state.session || loading) return;
  let advanced = 0;
  for (let i = 0; i < count; i++) {
    if (!advanceOne()) break;
    advanced++;
  }
  if (!advanced) {
    toast('Arsip bulan ini sudah mencapai candle terakhir. Pilih sesi/bulan baru untuk melanjutkan.', 'error', 5000);
    return;
  }
  updateChartData({ fit: false });
  persistState();
  if (state.session.cursorTime) $('crosshair-time').textContent = `Waktu candle aktif: ${formatWIB(getCurrentBar()?.time ?? state.session.cursorTime)}`;
}

function getOrderPreview() {
  const bar = getCurrentBar();
  const side = $('side-long').classList.contains('selected') ? 'long' : 'short';
  if (!bar) return null;
  const margin = clampNumber($('order-margin').value, 0, 1e12, 0);
  const leverage = clampNumber($('order-leverage').value, 1, 50, 1);
  const feeBps = clampNumber($('fee-bps').value, 0, 100, DEFAULT_FEE_BPS);
  const slipBps = clampNumber($('slippage-bps').value, 0, 100, DEFAULT_SLIPPAGE_BPS);
  const factor = slipBps / 10000;
  const entry = side === 'long' ? bar.close * (1 + factor) : bar.close * (1 - factor);
  const notional = margin * leverage;
  const qty = entry > 0 ? notional / entry : 0;
  const stop = Number($('order-sl').value);
  const target = Number($('order-tp').value);
  const hasStop = $('order-sl').value.trim() !== '' && Number.isFinite(stop) && stop > 0;
  const hasTarget = $('order-tp').value.trim() !== '' && Number.isFinite(target) && target > 0;
  const risk = hasStop ? Math.abs(entry - stop) * qty : null;
  const reward = hasTarget ? Math.abs(target - entry) * qty : null;
  return { side, margin, leverage, feeBps, slipBps, entry, notional, qty, stop: hasStop ? stop : null, target: hasTarget ? target : null, risk, reward, rr: risk > 0 && reward != null ? reward / risk : null, entryFee: notional * feeBps / 10000 };
}
function updateOrderPreview() {
  const preview = getOrderPreview();
  if (!preview) {
    ['preview-entry', 'preview-notional', 'preview-qty', 'preview-rr'].forEach((id) => $(id).textContent = '—');
    $('place-order').disabled = true;
    return;
  }
  $('preview-entry').textContent = fmtPrice.format(preview.entry);
  $('preview-notional').textContent = `${fmtMoney.format(preview.notional)} USDT`;
  $('preview-qty').textContent = fmtQty.format(preview.qty);
  $('preview-rr').textContent = preview.rr != null ? `1 : ${preview.rr.toFixed(2)}` : (preview.risk == null ? 'Set SL & TP' : '—');
  const snapshot = calculateAccountSnapshot();
  const alreadyOpen = state.account.positions.some((p) => p.symbol === state.session?.activeSymbol);
  const valid = Boolean(state.session && preview.margin > 0 && preview.margin <= snapshot.freeMargin && preview.leverage >= 1 && preview.leverage <= 50 && !alreadyOpen);
  $('place-order').disabled = !valid || loading;
}

function placeOrder(event) {
  event.preventDefault();
  if (!state.session) return;
  const preview = getOrderPreview();
  if (!preview || preview.margin <= 0) { setOrderMessage('Margin harus lebih besar dari nol.', 'error'); return; }
  if (preview.leverage < 1 || preview.leverage > 50) { setOrderMessage('Leverage harus berada di antara 1× dan 50×.', 'error'); return; }
  if (state.account.positions.some((position) => position.symbol === state.session.activeSymbol)) {
    setOrderMessage('Sudah ada posisi terbuka untuk pair ini. Tutup posisi tersebut lebih dulu.', 'error'); return;
  }
  const snapshot = calculateAccountSnapshot();
  if (preview.margin > snapshot.freeMargin) { setOrderMessage('Margin melebihi free margin yang tersedia.', 'error'); return; }
  if (preview.stop != null && (preview.side === 'long' ? preview.stop >= preview.entry : preview.stop <= preview.entry)) {
    setOrderMessage(preview.side === 'long' ? 'Stop Loss Long harus di bawah harga entry.' : 'Stop Loss Short harus di atas harga entry.', 'error'); return;
  }
  if (preview.target != null && (preview.side === 'long' ? preview.target <= preview.entry : preview.target >= preview.entry)) {
    setOrderMessage(preview.side === 'long' ? 'Take Profit Long harus di atas harga entry.' : 'Take Profit Short harus di bawah harga entry.', 'error'); return;
  }
  if (preview.entryFee >= preview.margin) { setOrderMessage('Fee entry melebihi margin posisi. Kurangi margin/leverage atau ubah asumsi fee.', 'error'); return; }
  const bar = getCurrentBar();
  const rawEntry = bar.close;
  const sideEntry = preview.side === 'long' ? rawEntry * (1 + preview.slipBps / 10000) : rawEntry * (1 - preview.slipBps / 10000);
  const initialRiskUSDT = preview.stop == null ? 0 : Math.abs(sideEntry - preview.stop) * preview.qty;
  const position = {
    id: `P${++state.account.tradeSequence}`,
    symbol: state.session.activeSymbol,
    side: preview.side,
    entryTime: bar.time,
    entryTimeLabel: formatWIB(bar.time),
    rawEntryPrice: rawEntry,
    entryPrice: sideEntry,
    margin: preview.margin,
    leverage: preview.leverage,
    notional: preview.notional,
    quantity: preview.qty,
    stopLoss: preview.stop,
    takeProfit: preview.target,
    liquidationPrice: estimateLiquidation(preview.side, sideEntry, preview.leverage),
    entryFee: preview.notional * preview.feeBps / 10000,
    feeBps: preview.feeBps,
    slippageBps: preview.slipBps,
    initialRiskUSDT,
    lastCheckedTime: bar.time,
    lastMarkPrice: bar.close,
  };
  state.account.balance -= position.entryFee;
  state.account.feeBps = preview.feeBps;
  state.account.slippageBps = preview.slipBps;
  state.account.positions.push(position);
  updateEquityPoint(bar.time);
  persistState();
  renderAccount();
  setOrderMessage(`${preview.side === 'long' ? 'Long' : 'Short'} ${position.symbol} dibuka pada ${formatWIB(bar.time)}. Ini posisi virtual, bukan order Binance.`, 'success');
  toast(`Posisi ${preview.side.toUpperCase()} ${position.symbol} dibuka.`, 'success');
  updateOrderPreview();
}

function closePosition(positionId, referencePrice, reason, time = state.session?.cursorTime, liquidation = false) {
  const index = state.account.positions.findIndex((position) => position.id === positionId);
  if (index < 0) return;
  const position = state.account.positions[index];
  const slip = position.slippageBps / 10000;
  const exitPrice = position.side === 'long' ? referencePrice * (1 - slip) : referencePrice * (1 + slip);
  const grossPnl = calcPnl(position.side, position.quantity, position.entryPrice, exitPrice);
  const exitNotional = position.quantity * exitPrice;
  const exitFee = exitNotional * position.feeBps / 10000 + (liquidation ? position.notional * 0.005 : 0);
  const netPnl = grossPnl - position.entryFee - exitFee;
  const slippageCost = Math.abs(position.rawEntryPrice - position.entryPrice) * position.quantity + Math.abs(referencePrice - exitPrice) * position.quantity;
  state.account.balance += grossPnl - exitFee;
  state.account.positions.splice(index, 1);
  state.account.trades.push({
    id: `T${position.id.slice(1)}`, status: 'closed', symbol: position.symbol, side: position.side,
    entryTime: position.entryTime, exitTime: time, entryTimeLabel: position.entryTimeLabel,
    exitTimeLabel: formatWIB(time), entryPrice: position.entryPrice, rawEntryPrice: position.rawEntryPrice,
    exitPrice, quantity: position.quantity, notional: position.notional, margin: position.margin,
    leverage: position.leverage, stopLoss: position.stopLoss, takeProfit: position.takeProfit,
    liquidationPrice: position.liquidationPrice, grossPnl, entryFee: position.entryFee, exitFee,
    fees: position.entryFee + exitFee, slippageCost, netPnl, initialRiskUSDT: position.initialRiskUSDT,
    exitReason: reason, liquidation,
  });
  if (state.account.trades.length > 2000) state.account.trades.splice(0, state.account.trades.length - 2000);
  toast(`${position.symbol} ${reason}: ${netPnl >= 0 ? '+' : ''}${fmtMoney.format(netPnl)} USDT`, liquidation ? 'error' : (netPnl >= 0 ? 'success' : 'error'), 5200);
}

function manualClosePosition(positionId) {
  const position = state.account.positions.find((item) => item.id === positionId);
  if (!position) return;
  const reference = currentMarkPrice(position.symbol) ?? position.lastMarkPrice ?? position.entryPrice;
  closePosition(positionId, reference, 'MANUAL', state.session.cursorTime, false);
  updateEquityPoint(state.session.cursorTime);
  persistState();
  renderAccount();
  updateOrderPreview();
}

function renderAccount() {
  const account = state.account;
  const snapshot = calculateAccountSnapshot();
  const realized = account.balance - account.startingBalance;
  $('balance-value').textContent = fmtMoney.format(snapshot.balance);
  $('equity-value').innerHTML = `${fmtMoney.format(snapshot.equity)} <small>USDT</small>`;
  $('unrealized-value').textContent = `${snapshot.unrealized >= 0 ? '+' : ''}${fmtMoney.format(snapshot.unrealized)}`;
  $('unrealized-value').className = snapshot.unrealized >= 0 ? 'positive' : 'negative';
  $('used-margin-value').textContent = fmtMoney.format(snapshot.usedMargin);
  $('free-margin-value').textContent = fmtMoney.format(snapshot.freeMargin);
  $('realized-value').textContent = `${realized >= 0 ? '+' : ''}${fmtMoney.format(realized)} USDT`;
  $('realized-value').className = realized >= 0 ? 'positive' : 'negative';
  const stats = calcTradeStats(account.trades, account.equityCurve, account.startingBalance);
  $('stat-trades').textContent = String(stats.closed);
  $('stat-winrate').textContent = stats.closed ? `${stats.winRate.toFixed(1)}%` : '—';
  $('stat-pf').textContent = stats.closed ? (Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞') : '—';
  $('stat-dd').textContent = `${stats.maxDrawdownPct.toFixed(2)}%`;
  $('stat-avgwin').textContent = stats.wins ? `+${fmtMoney.format(stats.averageWin)}` : '—';
  $('stat-avgloss').textContent = stats.losses ? fmtMoney.format(stats.averageLoss) : '—';
  $('stat-expectancy').textContent = stats.closed ? `${stats.expectancy >= 0 ? '+' : ''}${fmtMoney.format(stats.expectancy)}` : '—';
  $('stat-avgr').textContent = stats.closed ? `${stats.averageR >= 0 ? '+' : ''}${stats.averageR.toFixed(2)}R` : '—';
  $('journal-count').textContent = `${account.trades.length.toLocaleString('id-ID')} catatan`;

  const positionsContainer = $('open-positions');
  if (!account.positions.length) positionsContainer.innerHTML = '<div class="empty-list">Belum ada posisi aktif.</div>';
  else positionsContainer.innerHTML = [...account.positions].reverse().map((position) => {
    const mark = currentMarkPrice(position.symbol) ?? position.lastMarkPrice ?? position.entryPrice;
    const upnl = calcPnl(position.side, position.quantity, position.entryPrice, mark);
    return `<article class="position-row"><div class="position-row-header"><span>${escapeHtml(position.symbol)} <span class="${position.side === 'long' ? 'positive' : 'negative'}">${position.side.toUpperCase()}</span></span><strong class="${upnl >= 0 ? 'positive' : 'negative'}">${upnl >= 0 ? '+' : ''}${fmtMoney.format(upnl)}</strong></div><div class="position-row-meta"><div>Entry<strong>${fmtPrice.format(position.entryPrice)}</strong></div><div>Mark<strong>${fmtPrice.format(mark)}</strong></div><div>Qty / lev<strong>${fmtQty.format(position.quantity)} · ${position.leverage}×</strong></div><div>SL / TP<strong>${position.stopLoss == null ? '—' : fmtPrice.format(position.stopLoss)} / ${position.takeProfit == null ? '—' : fmtPrice.format(position.takeProfit)}</strong></div><div>Liq. estimasi<strong>${fmtPrice.format(position.liquidationPrice)}</strong></div><div>Margin<strong>${fmtMoney.format(position.margin)} USDT</strong></div></div><button type="button" class="position-close" data-close-position="${escapeHtml(position.id)}">Tutup posisi pada mark sekarang</button></article>`;
  }).join('');

  const journal = $('trade-journal');
  const latest = [...account.trades].reverse().slice(0, 8);
  if (!latest.length) journal.innerHTML = '<div class="empty-list">Hasil trade akan tercatat otomatis di sini.</div>';
  else journal.innerHTML = latest.map((trade) => `<article class="trade-row"><div class="trade-row-header"><span>${escapeHtml(trade.symbol)} · <span class="${trade.side === 'long' ? 'positive' : 'negative'}">${trade.side.toUpperCase()}</span> · ${escapeHtml(trade.exitReason)}</span><strong class="${trade.netPnl >= 0 ? 'positive' : 'negative'}">${trade.netPnl >= 0 ? '+' : ''}${fmtMoney.format(trade.netPnl)}</strong></div><div class="trade-row-meta"><div>Entry<strong>${fmtPrice.format(trade.entryPrice)}</strong><span>${escapeHtml(trade.entryTimeLabel)}</span></div><div>Exit<strong>${fmtPrice.format(trade.exitPrice)}</strong><span>${escapeHtml(trade.exitTimeLabel)}</span></div><div>Leverage<strong>${trade.leverage}×</strong></div><div>Fees + slippage<strong>${fmtMoney.format(trade.fees + trade.slippageCost)}</strong></div></div></article>`).join('');
}

function updateContextCards() {
  if (!state.session) return;
  const time = state.session.cursorTime;
  const symbol = state.session.activeSymbol;
  const current = getCurrentBar();
  const item = datasets.get(dataCacheKey('BTCUSDT', state.session.year, state.session.month));
  $('selected-context-symbol').textContent = symbol;
  $('selected-context-price').textContent = current ? fmtPrice.format(current.close) : '—';
  const ref = state.account.pairReference[symbol];
  const activePct = current && Number.isFinite(ref) && ref ? (current.close / ref - 1) * 100 : 0;
  $('selected-context-change').textContent = current ? `${activePct >= 0 ? '+' : ''}${activePct.toFixed(2)}% sejak dipilih` : '—';
  $('selected-context-change').className = current ? (activePct >= 0 ? 'positive' : 'negative') : '';

  if (!item?.bars?.length) {
    $('btc-context-time').textContent = 'Waktu sinkron: —';
    $('btc-context-price').textContent = '—';
    $('btc-context-change').textContent = 'BTC archive belum dimuat';
    $('btc-context-message').textContent = 'Konteks BTC dimuat dari arsip bulan yang sama bila tersedia.';
    $('btc-sparkline').innerHTML = '';
    return;
  }
  const idx = findIndexAtOrBefore(item.bars, time);
  if (idx < 0) {
    $('btc-context-time').textContent = 'Belum ada candle BTC pada waktu ini';
    $('btc-context-price').textContent = '—';
    $('btc-context-change').textContent = '—';
    $('btc-sparkline').innerHTML = '';
    return;
  }
  const bars = item.bars.slice(Math.max(0, idx - 59), idx + 1);
  const last = item.bars[idx];
  const initial = state.account.pairReference.BTCUSDT ?? item.bars[Math.max(0, findIndexAtOrBefore(item.bars, state.session.startingTime))]?.close;
  const change = Number.isFinite(initial) && initial ? (last.close / initial - 1) * 100 : 0;
  $('btc-context-time').textContent = `Sampai ${formatWIB(last.time)}`;
  $('btc-context-price').textContent = fmtPrice.format(last.close);
  $('btc-context-change').textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}% sejak awal`;
  $('btc-context-change').className = change >= 0 ? 'positive' : 'negative';
  const min = Math.min(...bars.map((bar) => bar.close));
  const max = Math.max(...bars.map((bar) => bar.close));
  const range = Math.max(1e-10, max - min);
  const points = bars.map((bar, i) => `${(i / Math.max(1, bars.length - 1)) * 300},${45 - ((bar.close - min) / range) * 38}`).join(' ');
  const color = bars[bars.length - 1].close >= bars[0].close ? '#49d7a4' : '#f1717c';
  $('btc-sparkline').innerHTML = `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
  $('btc-context-message').textContent = 'Mini-chart hanya menampilkan candle BTC sampai waktu replay, bukan data masa depan pada tampilan.';
}

function exportSession() {
  if (!state.session) { toast('Mulai sesi terlebih dahulu.', 'error'); return; }
  const payload = {
    exportedAt: new Date().toISOString(),
    timezone: TIMEZONE,
    session: state.session,
    account: state.account,
    drawings: state.drawings,
    note: 'Educational paper-trading replay. Liquidation is approximate; funding is not included. Dataset archive is one month at a time.',
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Learning_Crypto_${state.session.activeSymbol}_${state.session.year}-${month2(state.session.month)}.json`;
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  toast('Sesi berhasil diekspor ke JSON.', 'success');
}

async function resetSession() {
  if (!state.session) return;
  const confirmed = window.confirm('Reset sesi akan menghapus saldo berjalan, posisi, trade journal, dan statistik sesi. Gambar chart disimpan terpisah. Lanjutkan?');
  if (!confirmed) return;
  const s = state.session;
  await startNewSession({ year: s.year, month: s.month, symbol: s.activeSymbol, mode: s.startMode || 'random', startAt: s.requestedStartTime });
}

function toggleWelcome() {
  if (state.session) {
    $('setup-year').value = String(state.session.year);
    $('setup-month').value = String(state.session.month);
    $('setup-pair').value = state.session.activeSymbol;
    $('setup-mode').value = state.session.startMode || 'random';
    if (state.session.requestedStartTime) {
      const value = new Date(state.session.requestedStartTime * 1000);
      $('setup-start-at').value = localIsoWIB(value.getTime());
    }
  }
  updateSetupDateBounds();
  $('start-at-wrap').hidden = $('setup-mode').value !== 'specific';
  $('welcome-overlay').hidden = false;
}

function toast(message, type = '', duration = 3600) {
  const region = $('toast-region');
  const item = document.createElement('div');
  item.className = `toast${type ? ` ${type}` : ''}`;
  item.textContent = message;
  region.appendChild(item);
  window.setTimeout(() => item.remove(), duration);
}

function initializeUI() {
  populateActivePairs();
  if (!Object.hasOwn(TIMEFRAME_MS, activeTimeframe)) activeTimeframe = '5m';
  updateTimeframeButtons();
  document.querySelectorAll('[data-timeframe]').forEach((button) => button.addEventListener('click', () => setTimeframe(button.dataset.timeframe)));
  $('setup-year').value = String(state.session?.year || 2024);
  $('setup-month').value = String(state.session?.month || 1);
  $('setup-pair').value = state.session?.activeSymbol || 'BTCUSDT';
  updateSetupDateBounds();
  $('setup-mode').addEventListener('change', () => { $('start-at-wrap').hidden = $('setup-mode').value !== 'specific'; });
  $('setup-year').addEventListener('change', updateSetupDateBounds);
  $('setup-month').addEventListener('change', updateSetupDateBounds);
  $('start-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.session && !$('welcome-overlay').hidden) {
      const confirmed = window.confirm('Memulai sesi baru akan mereset saldo, posisi, jurnal, dan statistik saat ini. Lanjutkan?');
      if (!confirmed) return;
    }
    const year = Number($('setup-year').value);
    const month = Number($('setup-month').value);
    const symbol = $('setup-pair').value;
    const mode = $('setup-mode').value;
    const startAt = mode === 'specific' ? getStartTimeSeconds() : null;
    await startNewSession({ year, month, symbol, mode, startAt });
  });
  $('resume-session').hidden = !state.session;
  if (state.session) $('resume-session').textContent = `Lanjutkan ${state.session.activeSymbol} · ${state.session.year}-${month2(state.session.month)}`;
  $('resume-session').addEventListener('click', resumePreviousSession);
  $('active-pair').addEventListener('change', (event) => switchPair(event.target.value));
  $('next-candle').addEventListener('click', () => stepForward(1));
  $('next-5').addEventListener('click', () => stepForward(5));
  $('next-10').addEventListener('click', () => stepForward(10));
  $('reset-session').addEventListener('click', resetSession);
  $('open-settings').addEventListener('click', toggleWelcome);
  $('place-order').addEventListener('click', () => {});
  $('order-form').addEventListener('submit', placeOrder);
  ['order-margin', 'order-leverage', 'order-sl', 'order-tp', 'fee-bps', 'slippage-bps'].forEach((id) => $(id).addEventListener('input', updateOrderPreview));
  $('fee-bps').addEventListener('change', () => { state.account.feeBps = clampNumber($('fee-bps').value, 0, 100, DEFAULT_FEE_BPS); persistState(); });
  $('slippage-bps').addEventListener('change', () => { state.account.slippageBps = clampNumber($('slippage-bps').value, 0, 100, DEFAULT_SLIPPAGE_BPS); persistState(); });
  $('side-long').addEventListener('click', () => setTradeSide('long'));
  $('side-short').addEventListener('click', () => setTradeSide('short'));
  $('open-positions').addEventListener('click', (event) => {
    const button = event.target.closest('[data-close-position]');
    if (button) manualClosePosition(button.dataset.closePosition);
  });
  $('export-session').addEventListener('click', exportSession);
  document.querySelectorAll('[data-tool]').forEach((button) => button.addEventListener('click', () => chooseDrawingTool(button.dataset.tool)));
  $('undo-drawing').addEventListener('click', () => {
    const drawings = getDrawings();
    if (drawings.length) { redoStack.push(drawings.pop()); saveDrawings(); renderDrawings(); }
  });
  $('redo-drawing').addEventListener('click', () => {
    if (redoStack.length) { getDrawings().push(redoStack.pop()); saveDrawings(); renderDrawings(); }
  });
  $('clear-drawings').addEventListener('click', () => {
    if (!state.session) return;
    if (!window.confirm(`Hapus semua gambar untuk ${state.session.activeSymbol} pada sesi ini? Saldo dan jurnal tidak akan berubah.`)) return;
    state.drawings[`${state.session.sessionId}:${state.session.activeSymbol}`] = [];
    redoStack = [];
    saveDrawings(); renderDrawings(); toast('Gambar chart dihapus. Statistik tidak berubah.', 'success');
  });
  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const editing = target && (target.matches('input, select, textarea') || target.isContentEditable);
    if (!editing && event.key.toLowerCase() === 'n' && !event.ctrlKey && !event.metaKey) { event.preventDefault(); stepForward(1); }
    if (event.key === 'Escape') chooseDrawingTool('cursor');
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); $('undo-drawing').click(); }
  });

  if (state.session) {
    $('welcome-overlay').hidden = false;
    $('chart-empty').hidden = false;
    $('chart-empty').innerHTML = '<span class="empty-icon">◌</span><strong>Sesi tersimpan</strong><span>Klik “Lanjutkan sesi sebelumnya” untuk memuat arsip lagi dan memulihkan replay.</span>';
    $('session-year-chip').textContent = `${state.session.year} · ${MONTHS[state.session.month - 1]}`;
    $('active-pair').value = state.session.activeSymbol;
    $('fee-bps').value = state.account.feeBps ?? DEFAULT_FEE_BPS;
    $('slippage-bps').value = state.account.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    renderAccount();
  } else {
    $('welcome-overlay').hidden = false;
    $('chart-empty').hidden = false;
  }
  renderAccount();
}

function setTradeSide(side) {
  $('side-long').classList.toggle('selected', side === 'long');
  $('side-short').classList.toggle('selected', side === 'short');
  $('side-long').setAttribute('aria-pressed', String(side === 'long'));
  $('side-short').setAttribute('aria-pressed', String(side === 'short'));
  updateOrderPreview();
}

initializeUI();
