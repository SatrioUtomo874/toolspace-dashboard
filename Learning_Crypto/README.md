# Learning Crypto — Historical Replay Lab

Learning Crypto is a browser-based educational chart replay and paper-trading tool. The first version is designed as a standalone Toolspace folder: it does not require a separate Render service, Python backend, environment variable, or Binance API key.

## Features in this MVP

- Historical **Binance USDⓈ-M Futures 5m** candlesticks loaded from Binance Public Data monthly ZIP archives (`data.binance.vision`). It does not call the Binance REST market-data API and never substitutes synthetic candles when a real archive cannot be fetched.
- Select archive year (2023–2025), month, one of the curated pair options, and a random or chosen start timestamp.
- **Clear time labels:** chart ticks are formatted for Asia/Jakarta (UTC+7 / WIB); the top chart label shows the candle open time and close time; the replay clock shows the active candle timestamp; crosshair hover shows the exact historical timestamp.
- Manual `Next Candle`, `Next 5`, and `Next 10` controls. No timer/autoplay.
- Candlesticks, EMA 20, EMA 50, Volume, RSI 14.
- Chart drawings: horizontal line, trend line, Fibonacci retracement, and educational Long/Short position drawings. Drawing state is stored locally by replay session and pair. Undo/redo and clear drawings are separate from reset session.
- Virtual paper account: 10,000 USDT starting balance, Long/Short, margin sizing, 1×–50× leverage, optional SL/TP, approximate liquidation, adjustable fee/slippage assumptions, automatic position checks, account/journal metrics, and JSON export.
- A BTCUSDT mini-chart context that is limited to candles at or before the replay time when its archive is available.
- Switching pairs does not clear the account, closed trades, or statistics. A reset requires confirmation and starts a new virtual session. Reset-session and clear-drawings actions are separate.
- Mobile responsive layout, accessible labels, clear loading/error states, and no use of horizontal page scrolling by design.

## Add to the Toolspace GitHub repository

1. Extract `Learning_Crypto.zip`.
2. Upload the **folder `Learning_Crypto/`** into the root of `SatrioUtomo874/toolspace-dashboard`, alongside the root `index.html`, `scripts/`, `src/`, and `wrangler.jsonc`.
3. Commit to `main`.
4. Let the existing Toolspace catalog generator discover `Learning_Crypto/index.html`, then allow Cloudflare to build and deploy the repository.
5. Open the public Toolspace page and click the Learning Crypto card. If the page is reachable by path, the direct route is `/Learning_Crypto/`.

This tool's card metadata is in `index.html`. Do not edit root `tools.json`; the existing generator rewrites it during builds. Do not replace the repository's root Worker or `wrangler.jsonc` just to add this frontend tool.

## External libraries and data

- Chart renderer: [TradingView Lightweight Charts](https://github.com/tradingview/lightweight-charts), loaded from a pinned CDN version. The page includes the required project attribution link. Follow the library's current license/attribution requirements if redistributing or modifying it.
- ZIP decompression: [fflate](https://github.com/101arrowz/fflate), loaded as an ES module from jsDelivr when a session starts.
- Historical data source: [Binance Public Data](https://data.binance.vision/) and [the official `binance-public-data` repository](https://github.com/binance/binance-public-data). USD-M futures kline timestamps in the archive are millisecond timestamps and are normalized internally to Unix seconds for chart display.

## Data loading and selection

The user chooses both a year and a **month**. The frontend downloads only that pair's monthly 5m archive, not the entire year. A monthly archive has approximately 8,000–9,000 5m candles, depending on month/market history. This keeps requests and browser memory bounded. A pair/month can legitimately return 404 if the symbol had no market data in that period; the app shows an error and does not fabricate data. BTC context loads the BTCUSDT archive for the same year/month when the selected pair is not BTCUSDT.

The first replay candle is chosen randomly with sufficient candle context remaining in the month, or from the explicitly selected date/time. A selected date/time is interpreted as **WIB (UTC+7)** regardless of the computer's configured timezone. Chart data uses UTC epoch timestamps internally; only the display is formatted to WIB, avoiding artificial timestamp shifts.

## Important limitations — be transparent with users

1. **This is an experimental MVP.** The coding environment used to assemble it had no DNS/network access for a live Binance archive request, so the real archive download could not be verified from this environment. Test with one pair/month in the deployed browser. Network, CDN, CORS, missing archive, or symbol availability failures are reported rather than filled with fake candles.
2. The page downloads the selected month's ZIP into the browser to decompress and process it. The normal chart UI only reveals candles up to the current replay cursor, and indicators are computed from revealed candles only. However, a technically advanced user could inspect the downloaded ZIP and see future data. For a truly blind/public competition replay, move dataset storage to Cloudflare R2 (or another data store) and implement a server-controlled session/cursor endpoint in the shared Worker. Do not claim server-enforced anti-lookahead in this browser-only MVP.
3. This is a **paper-trading educational model**, not an exact Binance futures simulator. Fee and slippage defaults are configurable assumptions, liquidation is approximate, and historical funding is not included. The UI explains that these are assumptions. There are no real orders, and the app never asks for an API key.
4. Browser `localStorage` keeps session/account/drawings on that browser and device only. It is not user-account cloud sync; use JSON export for backups.
5. The selected pair and BTC context share the same replay cursor/time window. Open positions for symbols whose historical archive has been loaded can be evaluated as the timeline advances. There is no server-side multi-user session storage in this MVP.
6. This is a month-by-month replay, not yet a complete year-wide download/index. Selecting another month means starting a new session; the current session and trade record remain local until reset/overwrite, export them first when needed.

## Paper-trading assumptions

- Starting balance: 10,000 USDT (virtual).
- Notional = margin × leverage; quantity = notional / entry fill price.
- Long gross PnL = quantity × (exit − entry); short gross PnL = quantity × (entry − exit).
- Entry fees are debited when opening, exit fees when closing. Fee bps and slippage bps can be configured; the defaults are examples, not current published Binance fee claims.
- SL/TP start being evaluated on candles after the entry candle. If SL and TP are both touched in one 5m candle, SL wins as the conservative rule. If the approximate liquidation level is crossed, liquidation takes priority.
- Funding and exact exchange maintenance-margin brackets are not modelled. The liquidation level is explicitly an approximate educational estimate.
- Drawings are analysis annotations and never submit orders.

## Keyboard and basic usage

- `N`: reveal the next candle.
- `Esc`: cancel the active drawing tool.
- `Ctrl+Z` / `Cmd+Z`: undo the latest drawing.
- The primary replay control is `Next Candle`; no hidden timer reveals bars automatically.
- Changing the active pair keeps closed trade history, balance, and stats; it does not reset the session.
- `Reset sesi` asks for confirmation and resets virtual balance, positions, journal, and session statistics.
- `Clear` under the drawing toolbar removes drawings only; it does not touch balance or journal.
- Use `Export JSON` to back up the current session, statistics, trades, and drawings.

## Local tests

With Node.js installed, run from this folder:

```bash
npm test
```

These tests cover CSV parsing, timestamp normalization, indicators, time lookup, PnL, liquidation estimate direction, and summary metrics. They do not prove that the browser can retrieve Binance's live public archive from every network or that the Cloudflare deployment is fully integrated; those require browser testing after deployment.

## Next steps for a hardened version

- Move monthly datasets to R2 and build a Worker-controlled replay endpoint so future candles are not sent to the browser until revealed.
- Add a prepared dataset manifest so only symbols with complete datasets for the selected month are offered.
- Add session import and resume recovery for open positions if an archive is no longer available.
- Verify paper-trade math against independent fixtures and add integration/browser tests at 320, 360, 390, 768, and 1024 px.
- Use lower-timeframe data to improve SL/TP ordering and liquidation/funding realism only after a clear source and storage plan is available.
