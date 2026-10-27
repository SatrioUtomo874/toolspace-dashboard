# Toolspace + YouTube Batch Transcript (Cloudflare-only beta)

This patch adds a Cloudflare Worker API to the existing Toolspace static-asset project. It does not require Render.

## What this beta supports

- Load one direct YouTube video URL, or a public channel URL/feed.
- Channel discovery uses YouTube's public Atom feed, which usually returns only the latest 15 videos.
- Fetch a caption track that is publicly exposed by the video watch page; prefer manual track when available, otherwise generated track. A requested language tries a matching track, or asks YouTube for a translated track.
- Process selected videos sequentially, show progress, and download completed results separately as TXT, JSON, or SRT.
- Uses one HTTP request per video at a time instead of a long-running server job.

## Important limitations

This is an experimental, best-effort integration with YouTube's public web page and caption endpoints, not a guaranteed official YouTube transcript API. YouTube may change the page or block requests from Cloudflare Worker egress. If this happens, the app shows an error and does not fabricate a transcript or bypass private/restricted videos. YouTube's official Data API caption download requires permission to edit the video: https://developers.google.com/youtube/v3/docs/captions/download

The app is public and currently has no login or abuse protection. Keep it in beta until tested and protected before sharing widely. Batch progress/results are held in the current browser session; transcripts are not stored permanently on a server. Only one batch up to 15 videos is supported in this frontend.

## Applying this patch to the existing GitHub repository

Upload/overwrite the contents of this patch at the root of `SatrioUtomo874/toolspace-dashboard`: `wrangler.jsonc`, `.assetsignore`, `scripts/generate-tools.js`, `src/worker.js`, and the files under `Transkripter_Batch_Youtube/`. Do not upload an extra outer folder. Commit to `main`.

The generator explicitly ignores the legacy `TranskripterYt` folder to remove the duplicate card; it keeps `Transkripter_Batch_Youtube`.

## Cloudflare Workers Builds settings

- Repository: `SatrioUtomo874/toolspace-dashboard`
- Production branch: `main`
- Root directory: empty / repository root
- Build command: `node scripts/generate-tools.js`
- Deploy command: `npx wrangler deploy`

The Worker serves assets from the repository root and intercepts `/api/*` requests. `/api/health` checks whether the Worker API is present. After deploy, open `/Transkripter_Batch_Youtube/` and check the API status.

## Test plan

1. Check `https://YOUR-WORKER-DOMAIN/api/health` and expect JSON with `ok: true`.
2. Load a known public channel URL; expect up to 15 recent entries if the public feed is reachable.
3. Choose one video known to have captions; run transcription and inspect TXT/JSON/SRT downloads.
4. Test a video with captions disabled; it must show an error, not fake success.
5. Verify only one YouTube card appears in Toolspace.

No live Cloudflare/YouTube test was run while preparing this patch because the build environment does not have external network access. Treat successful deployment and real YouTube requests as unverified until you run the test plan.
