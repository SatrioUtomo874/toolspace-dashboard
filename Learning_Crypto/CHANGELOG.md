# Changelog

## Replay timeframe steps + resizable Long/Short drawings

- `Next Candle`, `Next 5`, and `Next 10` now follow the currently selected chart timeframe: M5, M15, H1, H4, or D1.
- Higher-timeframe steps advance to the next UTC-aligned candle boundary. The app still processes all underlying M5 bars sequentially between the old and new cursor, preserving paper-position SL/TP/liquidation evaluation.
- Replay button labels and tooltips change automatically with the selected timeframe.
- Long/Short position drawings now expose a `↔` grip on the right edge. Drag it horizontally to widen/narrow the drawing's time span; the chart can pan forward when dragging close to the right edge to provide more space.
- Drawing width is persisted with drawing data. Dragging the ENTRY price/time handle preserves the current width in elapsed time.
- Added unit tests for timeframe-aware replay target boundaries and invalid step values.

## Validation

- `node --check app.js`: passed
- `node --check core.js`: passed
- `npm test`: 15 passed, 0 failed
- No live Binance archive integration or browser pointer-drag test was completed in this environment.
