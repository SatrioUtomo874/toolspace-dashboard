# FileKit — All-in-One File Tools

## Bug fix — PDF to JPG / PDF to PNG

The PDF page rendering ZIP export now creates a JSZip instance before adding page images. This fixes `zip.file is not a function` in the PDF to JPG/PNG tools. The same path still renders one image per PDF page and packages the results into a ZIP. Regression coverage was added in `tests/catalog.test.cjs`.

A browser-first toolbox for everyday file and media tasks. This folder is designed to be added directly to the root of the Toolspace GitHub repository and discovered by `scripts/generate-tools.js` through metadata in `index.html`.

## Highlights

- Minimal dark dashboard with search, category filters, favorites, recent activity, responsive cards, and a shared tool workspace.
- 70 tool entries across PDF & Documents, Image Tools, Word & Data, Audio & Video, File Utilities, and Privacy & Security.
- Most workflows process the selected files locally in the browser. The project does not have its own application backend.
- Results can be downloaded individually; multi-result operations use ZIP where appropriate.
- Batch image operations, ZIP creation, duplicate detection, checksums, CSV, and text utilities are available without a paid API.
- Metadata is embedded in this folder's `index.html`; don't manually edit Toolspace's generated `tools.json` when adding this folder.

## Add it to Toolspace

1. Extract `FileKit.zip`.
2. Upload the **contents of the `FileKit` folder** as a folder named `FileKit` to the root of `SatrioUtomo874/toolspace-dashboard`, alongside the other tool folders.
3. Commit to the production branch (`main`).
4. Wait for Cloudflare's build/deploy. The catalog generator should discover `FileKit/index.html` and create the catalog record.
5. Open `https://YOUR-TOOLSPACE-HOST/FileKit/` to test it. The catalog status is intentionally `ready` / `Beta · siap dicoba`, so its card remains clickable while being tested.

Do not put this folder inside another `FileKit` folder. Correct paths are `/FileKit/index.html`, `/FileKit/style.css`, `/FileKit/app.js`, `/FileKit/core.js`, and `/FileKit/assets/thumbnail.svg`.

## Included tools

### PDF & Documents
- Merge PDF
- Split PDF by page ranges (one PDF per range, in ZIP)
- Compress PDF (resave/optimize where possible; not guaranteed to shrink)
- Rotate PDF
- Extract PDF pages
- Delete PDF pages
- Reorder PDF pages
- Add page numbers
- Watermark PDF
- Crop PDF page area (crop box, not secure redaction)
- Add PDF note
- Visual PDF signature stamp (not a certificate-based digital signature)
- PDF to JPG / PNG
- PDF to Text
- PDF to Word (text-first DOCX, not layout-faithful)
- Word to PDF (DOCX text-first PDF, not layout-faithful)
- Excel to PDF (first worksheet, basic text/table rendering)
- PowerPoint to PDF (extracts slide text into a simple outline)
- Fill PDF Text Field (fillable AcroForm text fields)
- Compare PDF text
- PDF metadata viewer
- Remove common PDF metadata fields
- OCR PDF (first five pages; downloads Tesseract language data)

### Image Tools
- Compress Image (best effort to target KB; can reduce dimensions)
- Resize Image
- Crop Image by percentage coordinates
- Rotate Image
- Flip Image
- Convert Image (JPG, PNG, WebP)
- Image to PDF
- Watermark Image
- Blur Image
- Pixelate Image
- Background Changer (solid background)
- Remove Flat Background (color-key from top-left pixel; **not AI segmentation**)
- Image Upscaler 2×/3× (interpolation, not generative enhancement)
- Image Metadata Viewer (EXIF where available)
- Remove Image Metadata (re-encode)
- Favicon Generator
- Photo Crop Presets (aspect ratios only; does not guarantee government/passport print standards)

### Word & Data
- Excel to CSV (first worksheet)
- CSV to Excel
- CSV Viewer (first 100 rows preview)
- JSON Formatter / Minifier
- JSON to CSV (flat JSON objects)
- CSV to JSON (values stay strings to preserve identifiers)
- Text Diff
- Word Counter
- Text Cleaner
- Basic Markdown Preview and HTML export

### Audio & Video
- Audio Converter
- Audio Compressor
- Audio Trimmer
- Video Converter
- Video Compressor
- Video Trimmer
- Video to GIF (short clips recommended)
- Extract Audio from Video
- Combine Video + Audio (video file first, audio file second)

### File Utilities
- ZIP Creator
- ZIP Extractor
- Bulk File Renamer
- Duplicate File Finder (byte-identical SHA-256 only)
- File Metadata Viewer
- File Signature Checker
- SHA-256 Hash Generator
- File Splitter (parts packaged into ZIP with manifest)
- File Joiner

### Privacy & Security
- Sensitive Text Redactor (common patterns; manual review is still required)
- Protect PDF with Password (AES-256 open password, via a lazily loaded encryption module)
- Unlock PDF with Password for supported encryption types only

## External libraries, network, and privacy

The user-selected files are handled in the browser. Files are not intentionally uploaded to a FileKit application server because this project has no application server. Some tools load code or data from third-party CDNs on demand:

- `pdf-lib` for PDF page operations and creating PDFs
- PDF.js for text extraction and page rendering
- Tesseract.js plus a language model for OCR
- JSZip for archives and batch exports
- SheetJS for XLS/XLSX/CSV operations
- Mammoth.js and docx for text-first Word conversions
- exifr for image metadata
- FFmpeg WebAssembly for audio/video conversion (large download, around 31 MB for the core on first use)
- `pdf-lib-encrypt` for AES-256 password protection and supported password-based unlocking

CDN use reveals ordinary connection metadata (such as IP address and requested package paths) to those providers, but the selected file contents are processed locally by the page when the tool supports it. If a CDN is blocked or offline, that tool will show an error instead of claiming success. For highly sensitive files, prefer a known, trusted environment and review the downloaded result.

## Important implementation limits

- **Password protection:** the tool aims to create an AES-256 open-password PDF. Verify the output in an independent PDF reader. Unlocking is limited by the encryption format; some legacy AES-128 and PDFs that use compressed object streams are not supported by the selected browser library.
- **PDF conversion:** Word/PDF, Excel/PDF, and PowerPoint/PDF are text-first converters. They do not reproduce complex formatting, images, columns, formulas, slide layouts, or charts exactly. PDF form filling only supports a named text field in an existing fillable form.
- **PDF compression:** `pdf-lib` re-saving cannot guarantee a smaller file; the app reports when the result grew.
- **PDF crop:** cropping changes the visible crop box. It does not securely remove the underlying content. Do not use crop as redaction.
- **Image background:** the no-model remove-background tool only makes colors similar to the top-left pixel transparent. It is suitable for uniform backgrounds, not arbitrary objects or hair. No paid AI API is used.
- **Image upscaling:** uses browser interpolation and cannot reconstruct real missing detail.
- **OCR:** only the first five PDF pages are processed. Review names, numbers, and technical terminology manually.
- **Media conversion:** FFmpeg WebAssembly may use substantial memory and can fail on large files or low-memory phones. First use downloads around 31 MB of core code. Recommended for short clips and reasonable file sizes.
- **ZIP extraction / join / split:** limits are in place to reduce excessive memory use. Always keep an original copy of important files.
- **Metadata/signature checks:** file magic-byte detection covers common formats only; an unrecognized signature is not proof a file is unsafe.
- **No official guarantee:** FileKit does not certify that a file will be accepted by a particular website, ATS, government office, or document workflow.

## Limits and UI behavior

- Up to 25 files per selection and 120 MB total are accepted in a batch. The app may impose stricter effective limits for specific browser-heavy tools.
- Favorites and recent activity are stored in that browser's `localStorage`. They are not synced across devices; file names can appear in this local history.
- No account or backend is required.
- This is a beta implementation. Run the checks below and test each tool in the actual deployment before presenting it as production-grade.

## Local checks

```bash
node --check app.js
node --check core.js
node --test tests/core.test.cjs
```

These tests verify core parsing, range validation, filenames, checksums/signature labels, text diff, and redaction logic. They do not prove every CDN-backed browser workflow works on every device. End-to-end testing of PDF/image/media flows must be done in a modern browser over HTTPS.
