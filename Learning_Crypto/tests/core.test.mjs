import test from 'node:test';
import assert from 'node:assert/strict';
import { parseKlineCsv, aggregateCandles, TIMEFRAME_MS, ema, rsi, findIndexAtOrBefore, findIndexAtOrAfter, calcTradeStats, calcPnl, calcPositionMetrics, estimateLiquidation, formatWIB, sanitizePair } from '../core.js';

test('parseKlineCsv skips a header and normalizes timestamps', () => {
  const csv = 'open_time,open,high,low,close,volume,close_time\n1704067200000,100,105,99,103,12,1704067499999\n1704067500000,103,104,101,102,15,1704067799999';
  const bars = parseKlineCsv(csv);
  assert.equal(bars.length, 2);
  assert.equal(bars[0].time, 1704067200);
  assert.equal(bars[1].close, 102);
});

test('parseKlineCsv deduplicates timestamps and sorts bars', () => {
  const csv = '1700000300000,101,103,99,102,10,1700000599999\n1700000000000,100,102,98,101,8,1700000299999\n1700000000000,100,102,98,101,8,1700000299999';
  const bars = parseKlineCsv(csv);
  assert.equal(bars.length, 2);
  assert.ok(bars[0].timeMs < bars[1].timeMs);
});

test('EMA and RSI have expected warmup and range', () => {
  const values = Array.from({ length: 40 }, (_, i) => 100 + i);
  const ema20 = ema(values, 20);
  const rsi14 = rsi(values, 14);
  assert.equal(ema20[18], null);
  assert.equal(ema20[19], 109.5);
  assert.equal(rsi14[13], null);
  assert.equal(rsi14[14], 100);
});

test('timestamp lookup uses binary search', () => {
  const bars = [100, 200, 300].map(time => ({ time }));
  assert.equal(findIndexAtOrBefore(bars, 250), 1);
  assert.equal(findIndexAtOrAfter(bars, 201), 2);
  assert.equal(findIndexAtOrAfter(bars, 301), 3);
});

test('trade stats calculate win rate, PF and drawdown', () => {
  const trades = [
    { status: 'closed', netPnl: 100, initialRiskUSDT: 50 },
    { status: 'closed', netPnl: -40, initialRiskUSDT: 50 },
    { status: 'closed', netPnl: 0, initialRiskUSDT: 50 },
  ];
  const stats = calcTradeStats(trades, [10000, 10100, 10060], 10000);
  assert.ok(Math.abs(stats.winRate - (100 / 3)) < 1e-9);
  assert.equal(stats.profitFactor, 2.5);
  assert.ok(Math.abs(stats.maxDrawdownPct - ((40 / 10100) * 100)) < 1e-9);
});

test('PnL and liquidation estimates follow side direction', () => {
  assert.equal(calcPnl('long', 2, 100, 110), 20);
  assert.equal(calcPnl('short', 2, 100, 90), 20);
  assert.ok(estimateLiquidation('long', 100, 10) < 100);
  assert.ok(estimateLiquidation('short', 100, 10) > 100);
});

test('WIB timestamps and pair validation', () => {
  assert.equal(formatWIB(1704067200), '2024-01-01 07:00 WIB');
  assert.equal(sanitizePair('BTCUSDT'), true);
  assert.equal(sanitizePair('BTC/USDT'), false);
});


test('aggregateCandles combines M5 bars into M15 with correct OHLCV and UTC boundary', () => {
  const start = Date.UTC(2024, 0, 1, 0, 0, 0);
  const bars = [
    { timeMs: start, time: start / 1000, closeTimeMs: start + 299999, open: 100, high: 103, low: 99, close: 102, volume: 10 },
    { timeMs: start + 300000, time: (start + 300000) / 1000, closeTimeMs: start + 599999, open: 102, high: 106, low: 101, close: 105, volume: 11 },
    { timeMs: start + 600000, time: (start + 600000) / 1000, closeTimeMs: start + 899999, open: 105, high: 107, low: 104, close: 106, volume: 12 },
    { timeMs: start + 900000, time: (start + 900000) / 1000, closeTimeMs: start + 1199999, open: 106, high: 108, low: 105, close: 107, volume: 13 },
  ];
  const result = aggregateCandles(bars, '15m');
  assert.equal(result.length, 2);
  assert.equal(result[0].timeMs, start);
  assert.equal(result[0].open, 100);
  assert.equal(result[0].high, 107);
  assert.equal(result[0].low, 99);
  assert.equal(result[0].close, 106);
  assert.equal(result[0].volume, 33);
  assert.equal(result[0].sourceBars, 3);
  assert.equal(result[1].open, 106);
  assert.equal(result[1].close, 107);
});

test('higher timeframe aggregation only contains provided replay bars and keeps active bar partial', () => {
  const start = Date.UTC(2024, 2, 1, 0, 0, 0);
  const bars = Array.from({ length: 7 }, (_, i) => ({
    timeMs: start + i * TIMEFRAME_MS['5m'],
    time: (start + i * TIMEFRAME_MS['5m']) / 1000,
    closeTimeMs: start + (i + 1) * TIMEFRAME_MS['5m'] - 1,
    open: 100 + i,
    high: 101 + i,
    low: 99 + i,
    close: 100.5 + i,
    volume: 1,
  }));
  const h1 = aggregateCandles(bars, '1h');
  assert.equal(h1.length, 1);
  assert.equal(h1[0].sourceBars, 7);
  assert.equal(h1[0].close, bars[6].close);
  assert.equal(h1[0].closeTimeMs, bars[6].closeTimeMs);
  assert.ok(h1[0].closeTimeMs < h1[0].timeMs + TIMEFRAME_MS['1h'] - 1);
});

test('daily aggregation follows UTC boundaries while display timezone remains WIB', () => {
  const t0 = Date.UTC(2024, 0, 1, 23, 55, 0);
  const bars = [0, 1, 2].map((i) => ({
    timeMs: t0 + i * TIMEFRAME_MS['5m'], time: (t0 + i * TIMEFRAME_MS['5m']) / 1000,
    closeTimeMs: t0 + (i + 1) * TIMEFRAME_MS['5m'] - 1,
    open: 10 + i, high: 12 + i, low: 9 + i, close: 11 + i, volume: 1,
  }));
  const d1 = aggregateCandles(bars, '1d');
  assert.equal(d1.length, 2);
  assert.equal(d1[0].timeMs, Date.UTC(2024, 0, 1));
  assert.equal(d1[1].timeMs, Date.UTC(2024, 0, 2));
});

test('aggregateCandles rejects unsupported timeframe', () => {
  assert.throws(() => aggregateCandles([], '2h'), /Unsupported timeframe/);
});


test('position drawing calculates user-defined Long and Short risk/reward, not a fixed 1:2', () => {
  const long = calcPositionMetrics('long', 100, 95, 115);
  assert.equal(long.valid, true);
  assert.equal(long.riskPerUnit, 5);
  assert.equal(long.rewardPerUnit, 15);
  assert.equal(long.rr, 3);

  const short = calcPositionMetrics('short', 100, 108, 96);
  assert.equal(short.valid, true);
  assert.equal(short.riskPerUnit, 8);
  assert.equal(short.rewardPerUnit, 4);
  assert.equal(short.rr, 0.5);
});

test('position drawing rejects SL/TP on the wrong side of entry', () => {
  assert.equal(calcPositionMetrics('long', 100, 101, 110).valid, false);
  assert.equal(calcPositionMetrics('long', 100, 95, 99).valid, false);
  assert.equal(calcPositionMetrics('short', 100, 99, 90).valid, false);
  assert.equal(calcPositionMetrics('short', 100, 105, 101).valid, false);
});
