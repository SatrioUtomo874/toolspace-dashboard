# Applying this patch to the existing Toolspace repository

Extract the ZIP. Its paths are relative to the root of `SatrioUtomo874/toolspace-dashboard`; do not create an extra outer folder. Upload/overwrite these paths, keeping the folders exactly as shown:

- `.assetsignore` (overwrite)
- `wrangler.jsonc` (overwrite)
- `scripts/generate-tools.js` (overwrite)
- `src/worker.js` (new file)
- `tools.json` (temporary generated manifest; the build regenerates it)
- `Transkripter_Batch_Youtube/index.html` (overwrite)
- `Transkripter_Batch_Youtube/app.js` (overwrite)
- `Transkripter_Batch_Youtube/style.css` (overwrite)
- `Transkripter_Batch_Youtube/assets/thumbnail.svg` (same file, safe to overwrite)

Commit all changes to `main`. Ensure Cloudflare Workers Builds uses root directory empty, build command `node scripts/generate-tools.js`, and deploy command `npx wrangler deploy`.

The generator excludes the old `TranskripterYt` folder so the duplicate card disappears after rebuilding.

The Worker API is an experimental best-effort feature. Test `/api/health`, then try a single known public video with captions. Live YouTube/Cloudflare access has not been verified from the build environment.
