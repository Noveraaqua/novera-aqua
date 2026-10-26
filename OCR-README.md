> Development branch: the PaddleOCR worker candidate is documented in [HORIBA-INTEGRATION.md](HORIBA-INTEGRATION.md). The following describes the earlier deployed Tesseract implementation.

# Photo-assisted water logging

## Integration
The existing static application still saves to `noveraAqua.v2` in localStorage. `openWater` attaches a photo controller to its existing form. Confirmed values use the normal water-log save, status, trends, backup and cross-tab paths. New records retain `source: manual` and add `entryMethod: photo-ocr`, confirmation, OCR version and conversion descriptions. Measurement date/time are separate from `recordedAt`. Existing records need no migration.

## OCR assets
Tesseract.js 6.0.1 runs in a Web Worker. Assets load on first recognition, from these pinned jsDelivr package paths:
- `tesseract.js@6.0.1/dist/tesseract.min.js`
- `tesseract.js@6.0.1/dist/worker.min.js`
- `tesseract.js-core@6.0.0` (directory, allowing the library to select compatible SIMD/LSTM files)
- `@tesseract.js-data/eng@1.0.0/4.0.0_best_int`

Official documentation checked: https://github.com/naptha/tesseract.js and the installed 6.0.1 package's docs/api.md. `cacheMethod: none` avoids language-data writes to IndexedDB. Recognition explicitly enables the `blocks` output needed for positioned lines and words. No runtime API key or backend is used. Internet is needed for uncached OCR assets; manual entry remains available if those assets cannot load.

## Workflow and privacy
Select a tank, open Read from photo, choose/capture an image, crop using pointer gestures or labelled sliders, optionally rotate/enhance contrast, recognise, review, then apply readings. Existing populated fields require explicit overwrite consent. Saving requires measurement date/time confirmation and an officer; a new officer can be entered directly without abandoning the photo form.

Images, canvases and OCR text are temporary controller-local data. No image data is written to localStorage, IndexedDB, the repository, backups, analytics or a server. Worker termination and canvas clearing occur on cancel, replacement, close, error and save. The only intended external requests are static OCR asset downloads. Complete browser/worker network tracing was not available in this testing environment; this network claim is based on code review, library architecture and the tested data-storage boundary, not a packet capture.

## Parsing
Supported destination fields: temperature °C, pH, TDS ppm and dissolved oxygen mg/L. Additional reviewed readings (oxygen saturation %, conductivity mS/cm, salinity ppt, ORP mV, pH electrode potential mV) can be included in notes. GH, KH, ammonia, nitrite and nitrate remain untouched/blank unless entered manually.

Values must be associated with explicit labels/units in positioned OCR lines. Words are sorted by horizontal bounding box. Duplicate candidates, low-confidence recognition, malformed numbers, decimal-comma ambiguity and suspicious integer-only results remain blank for correction. Confidence is a heuristic, not a probability of correctness. The parser never inserts reference-photo values as defaults. TDS g/L is converted to mg/L; applying the dilute-freshwater mg/L≈ppm equivalence requires explicit confirmation when recognition identifies mass-per-volume units. Meter clock text is only a warning and never sets the form date.

## Verification (2026-10-26)
- 20 existing tank/monitoring regression checks passed (`node tests/tank-world.cjs`).
- 16 OCR parser checks passed (`node tests/photo-ocr.cjs`).
- 17 DOM/form integration checks passed (`node tests/photo-flow.cjs`, test-only jsdom 26.1.0 required). These use a simulated OCR worker to isolate form behavior; they are not evidence of recognition accuracy.
- Actual Tesseract.js 6.0.1 was run on the supplied HORIBA photo in Node and in the browser, with multiple crops/preprocessing settings.
- Final browser run: pH 7.58 was accepted; temperature, TDS, DO, oxygen saturation, conductivity, salinity, ORP and pH electrode voltage were left blank for review. In particular, OCR misread conductivity as `0213`; the parser rejected it. Different crops produced correct raw TDS and DO candidates but insufficient confidence. Small LCD units/moire remain a significant limitation. No claim of automatic extraction of all parameters, or reliability across other meters, is made.
- Conversion tests verify 0.177 g/L → 177 mg/L and user-confirmed freshwater ppm equivalence. This is a parser result, not a claim that the final browser photo run automatically populated TDS.
- Browser verified local image selection, crop sliders, worker asset loading, actual OCR, review panel, editable correction fields and blank uncertainty handling.
- Integration checks verify no automatic save, manual overwrite protection, cancellation restoration, separate timestamps, one saved record despite repeat submission, image-free serialization, reload persistence and manual fallback after worker failure.

Unverified: physical mobile camera/touch behavior; complete network capture including worker requests; prolonged memory profiling; systematic glare/blur/HEIC and orientation coverage; simultaneous cross-tab edits with OCR active; broad meter-model accuracy. Responsive styles and existing cross-tab sheet cleanup are implemented. Retired-tank and deletion regression checks pass. Reference images and local OCR output files are intentionally excluded from the public repository.
