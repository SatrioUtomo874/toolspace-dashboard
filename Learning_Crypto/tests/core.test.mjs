import test from 'node:test';
import assert from 'node:assert/strict';
import { parseKlineCsv, ema, rsi, findIndexAtOrBefore, findIndexAtOrAfter, calcTradeStats, calcPnl, estimateLiquidation, formatWIB, sanitizePair } from '../core.js';

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
