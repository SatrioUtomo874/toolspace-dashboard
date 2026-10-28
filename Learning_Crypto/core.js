export const TIMEZONE = 'Asia/Jakarta';
export const INTERVAL_MS = 5 * 60 * 1000;

export const TIMEFRAME_MS = Object.freeze({
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
});

/**
 * Aggregate already-available Binance 5m bars into a larger timeframe.
 * Buckets follow UTC epoch boundaries (matching Binance kline boundaries).
 * Input must contain only bars revealed up to the replay cursor; the active HTF
 * candle therefore remains partial and updates without leaking future M5 data.
 */
export function aggregateCandles(bars, timeframe = '5m') {
  const durationMs = TIMEFRAME_MS[timeframe];
  if (!durationMs) throw new Error(`Unsupported timeframe: ${timeframe}`);
  if (!Array.isArray(bars) || bars.length === 0) return [];
  if (timeframe === '5m') return bars.map((bar) => ({ ...bar }));

  const grouped = [];
  let current = null;
  for (const bar of bars) {
    const sourceTimeMs = Number.isFinite(bar.timeMs) ? bar.timeMs : Number(bar.time) * 1000;
    if (!Number.isFinite(sourceTimeMs)) continue;
    const bucketTimeMs = Math.floor(sourceTimeMs / durationMs) * durationMs;
    if (!current || current.timeMs !== bucketTimeMs) {
      current = {
        timeMs: bucketTimeMs,
        time: Math.floor(bucketTimeMs / 1000),
        closeTimeMs: Number.isFinite(bar.closeTimeMs) ? bar.closeTimeMs : sourceTimeMs + INTERVAL_MS - 1,
        open: Number(bar.open),
        high: Number(bar.high),
        low: Number(bar.low),
        close: Number(bar.close),
        volume: Number(bar.volume) || 0,
        sourceBars: 1,
      };
      grouped.push(current);
    } else {
      current.high = Math.max(current.high, Number(bar.high));
      current.low = Math.min(current.low, Number(bar.low));
      current.close = Number(bar.close);
      current.volume += Number(bar.volume) || 0;
      current.closeTimeMs = Number.isFinite(bar.closeTimeMs) ? bar.closeTimeMs : sourceTimeMs + INTERVAL_MS - 1;
      current.sourceBars += 1;
    }
  }
  return grouped;
}
export const DEFAULT_BALANCE = 10_000;
export const DEFAULT_FEE_BPS = 5;
export const DEFAULT_SLIPPAGE_BPS = 2;

/** Parse Binance USDⓈ-M Futures kline CSV rows. Timestamp values are normalized to UTC milliseconds. */
export function parseKlineCsv(csvText) {
  const lines = String(csvText || '').split(/\r?\n/);
  const byTime = new Map();

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split(',');
    if (cols.length < 6) continue;

    let rawOpenTime = Number(String(cols[0]).trim().replace(/^\"|\"$/g, ''));
    const open = Number(cols[1]);
    const high = Number(cols[2]);
    const low = Number(cols[3]);
    const close = Number(cols[4]);
    const volume = Number(cols[5]);
    if (!Number.isFinite(rawOpenTime) || ![open, high, low, close, volume].every(Number.isFinite)) continue;
    if (rawOpenTime <= 0 || open <= 0 || high <= 0 || low <= 0 || close <= 0 || volume < 0) continue;

    // Futures archives currently use milliseconds. This detection also tolerates microsecond data.
    if (rawOpenTime > 100_000_000_000_000) rawOpenTime = Math.floor(rawOpenTime / 1000);
    else if (rawOpenTime < 100_000_000_000) rawOpenTime *= 1000;

    let rawCloseTime = Number(cols[6]);
    if (!Number.isFinite(rawCloseTime) || rawCloseTime <= 0) rawCloseTime = rawOpenTime + INTERVAL_MS - 1;
    else if (rawCloseTime > 100_000_000_000_000) rawCloseTime = Math.floor(rawCloseTime / 1000);
    else if (rawCloseTime < 100_000_000_000) rawCloseTime *= 1000;

    byTime.set(rawOpenTime, {
      timeMs: rawOpenTime,
      time: Math.floor(rawOpenTime / 1000),
      closeTimeMs: rawCloseTime,
      open, high, low, close, volume,
    });
  }

  return [...byTime.values()].sort((a, b) => a.timeMs - b.timeMs);
}

export function ema(values, period) {
  if (!Number.isInteger(period) || period < 1) throw new Error('EMA period must be a positive integer.');
  const result = new Array(values.length).fill(null);
  if (values.length < period) return result;

  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  let prev = seed / period;
  result[period - 1] = prev;
  const multiplier = 2 / (period + 1);

  for (let i = period; i < values.length; i++) {
    prev = (values[i] - prev) * multiplier + prev;
    result[i] = prev;
  }
  return result;
}

/** Wilder RSI. Values before the first complete RSI window remain null. */
export function rsi(values, period = 14) {
  const result = new Array(values.length).fill(null);
  if (values.length <= period || period < 1) return result;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const difference = values[i] - values[i - 1];
    if (difference >= 0) gains += difference;
    else losses -= difference;
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;
  result[period] = rsiFromAverages(averageGain, averageLoss);

  for (let i = period + 1; i < values.length; i++) {
    const difference = values[i] - values[i - 1];
    const gain = Math.max(difference, 0);
    const loss = Math.max(-difference, 0);
    averageGain = ((averageGain * (period - 1)) + gain) / period;
    averageLoss = ((averageLoss * (period - 1)) + loss) / period;
    result[i] = rsiFromAverages(averageGain, averageLoss);
  }
  return result;
}

function rsiFromAverages(averageGain, averageLoss) {
  if (averageGain === 0 && averageLoss === 0) return 50;
  if (averageLoss === 0) return 100;
  if (averageGain === 0) return 0;
  return 100 - (100 / (1 + (averageGain / averageLoss)));
}

export function rollingSlice(bars, endIndex, maxBars = 180) {
  const end = Math.max(0, Math.min(endIndex, bars.length - 1));
  const start = Math.max(0, end - maxBars + 1);
  return { start, end, bars: bars.slice(start, end + 1) };
}

export function findIndexAtOrBefore(bars, timeSeconds) {
  let low = 0;
  let high = bars.length - 1;
  let answer = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (bars[middle].time <= timeSeconds) {
      answer = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return answer;
}

export function findIndexAtOrAfter(bars, timeSeconds) {
  let low = 0;
  let high = bars.length - 1;
  let answer = bars.length;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (bars[middle].time >= timeSeconds) {
      answer = middle;
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }
  return answer;
}

export function formatWIB(timeSeconds, { seconds = false, weekday = false } = {}) {
  if (!Number.isFinite(Number(timeSeconds))) return '—';
  const options = {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  };
  if (seconds) options.second = '2-digit';
  if (weekday) options.weekday = 'short';
  const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(new Date(Number(timeSeconds) * 1000));
  const part = key => parts.find(p => p.type === key)?.value || '';
  const day = `${part('year')}-${part('month')}-${part('day')}`;
  const time = `${part('hour')}:${part('minute')}${seconds ? `:${part('second')}` : ''}`;
  return `${weekday ? `${part('weekday')} ` : ''}${day} ${time} WIB`;
}

export function formatAxisTime(time, tickMarkType) {
  let seconds;
  if (typeof time === 'number') seconds = time;
  else if (time && typeof time === 'object' && 'year' in time) {
    seconds = Date.UTC(time.year, time.month - 1, time.day) / 1000;
  } else {
    seconds = Date.parse(String(time)) / 1000;
  }
  if (!Number.isFinite(seconds)) return '';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE, year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(seconds * 1000));
  const part = key => parts.find(p => p.type === key)?.value || '';
  const typeLabel = String(tickMarkType).toLowerCase();
  if (typeLabel.includes('year') || tickMarkType === 0) return part('year');
  if (typeLabel.includes('month') || tickMarkType === 1) return `${part('month')} '${part('year').slice(-2)}`;
  if (typeLabel.includes('day') || tickMarkType === 2) return `${part('day')} ${part('month')}`;
  return `${part('hour')}:${part('minute')}`;
}

export function calcTradeStats(trades, equityCurve = [], startingBalance = 10_000) {
  const closed = trades.filter(t => t.status === 'closed');
  const wins = closed.filter(t => Number(t.netPnl) > 0);
  const losses = closed.filter(t => Number(t.netPnl) < 0);
  const breakevens = closed.filter(t => Number(t.netPnl) === 0);
  const net = closed.reduce((sum, t) => sum + Number(t.netPnl || 0), 0);
  const grossProfit = wins.reduce((sum, t) => sum + Number(t.netPnl || 0), 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + Number(t.netPnl || 0), 0));

  let peak = startingBalance;
  let maxDrawdown = 0;
  for (const point of equityCurve) {
    const value = typeof point === 'number' ? point : Number(point.equity);
    if (!Number.isFinite(value)) continue;
    peak = Math.max(peak, value);
    if (peak > 0) maxDrawdown = Math.max(maxDrawdown, (peak - value) / peak);
  }

  const rValues = closed.filter(t => Number(t.initialRiskUSDT) > 0).map(t => Number(t.netPnl) / Number(t.initialRiskUSDT));
  return {
    closed: closed.length,
    wins: wins.length,
    losses: losses.length,
    breakevens: breakevens.length,
    winRate: closed.length ? wins.length / closed.length * 100 : 0,
    netPnl: net,
    grossProfit,
    grossLoss,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0),
    averageWin: wins.length ? grossProfit / wins.length : 0,
    averageLoss: losses.length ? -grossLoss / losses.length : 0,
    expectancy: closed.length ? net / closed.length : 0,
    averageR: rValues.length ? rValues.reduce((a, b) => a + b, 0) / rValues.length : 0,
    maxDrawdownPct: maxDrawdown * 100,
  };
}

export function calcPnl(side, quantity, entryPrice, exitPrice) {
  if (side === 'long') return quantity * (exitPrice - entryPrice);
  return quantity * (entryPrice - exitPrice);
}

export function estimateLiquidation(side, entryPrice, leverage, maintenanceMarginRate = 0.005) {
  const leverageValue = Math.max(1, Math.min(50, Number(leverage)));
  const marginFraction = 1 / leverageValue;
  if (side === 'long') return Math.max(0, entryPrice * (1 - marginFraction + maintenanceMarginRate));
  return entryPrice * (1 + marginFraction - maintenanceMarginRate);
}

export function sanitizePair(value) {
  return /^[A-Z0-9]{3,20}USDT$/.test(String(value).toUpperCase());
}
