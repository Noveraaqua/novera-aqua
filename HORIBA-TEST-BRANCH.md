# HORIBA OCR — experimental test branch

This is the TEST version of NOVERA AQUA. **The live main branch and current records are not modified.**

## Launch for testing

1. Wait for the GitHub Actions workflow **Prepare verified HORIBA OCR model for test branch** to finish successfully. It downloads the exact PP-OCRv3 model and verifies SHA-256 before adding it only to this branch.
2. Open this GitHub branch, choose **Code → Download ZIP**, extract it on a computer.
3. In a terminal in the extracted folder run `python -m http.server 8000` (on Windows, `py -m http.server 8000` also works). Open http://localhost:8000/ in Chrome or Edge.
4. Create disposable tank/officer entries in the browser or use a backup of test data. Do **not** overwrite your routine-production browser data.
5. Go to **Log → Water test → Photo scanner → HORIBA PaddleOCR (experimental)**. Open a nine-reading HORIBA photograph. Select **Try experimental visual reconciliation** if you want to evaluate the newest signs/decimal checks, then **Scan HORIBA screen**.
6. Compare the preview with every extracted number, especially negative pH mV, positive ORP, decimal placements, and the leading digit of %DO. Review each field and explicitly apply readings before saving the form.
7. If the scanner fails or a value is uncertain, leave it blank and use the preserved standard scanner or manual entry.

## Limits and safety

- Branch-only: NOT deployed as the active GitHub Pages site. To test, use a local HTTP server (not file://).
- Browser model loading additionally fetches pinned JS/WASM runtime files from jsDelivr; internet access is required for initial loads.
- The model is from SWHL/RapidOCR at an immutable Hugging Face revision. Its required SHA-256 is ef7abd8bd3629ae57ea2c28b425c1bd258a871b93fd2fe7c433946ade9b5d9ea.
- Photographs are processed locally in a temporary Web Worker; records are not automatically saved. No photo is uploaded to an OCR server by this worker.
- The website’s structured Water log supports temperature, pH, TDS (ppm) and DO (mg/L). Other HORIBA measures (pH mV, ORP, EC, %DO, salinity) remain **optional, reviewed additions to notes**; they are not new structured monitoring fields.
- The previously reported 63/63 is a **development replay** using saved recognition text and new crops, not an end-to-end ONNX browser benchmark. Fresh photo testing is required.
- The first branch-only setup workflow needs repository Actions to run with write permission. If it fails, `assets/models/en-rec.onnx` will be missing and the experimental scanner cannot load the model; manual and standard scanning remain available.

## Regression tests

Run these in the repository root:
```
node tests/horiba-core.cjs
node tests/horiba-reconcile.cjs
node tests/horiba-photo-switch.cjs
```

Report: browser/device and OS version, sample photo ID, extracted readings, wrong or blank fields, runtime errors, and whether Cancel, Review, and Save behaved as expected. Do not record real measurements during testing without reviewing them against the photograph.

## Unit verification and temperature segmentation update (31 October 2026)

- Experimental numeric segmentation now records digit bounding boxes and only splits a merged digit component when a narrow ink-density valley provides supporting evidence. Incorrect or insufficient evidence leaves the number unresolved. This is not an exact-value lookup or hidden ground-truth override.
- Additional narrow-label OCR crops are attempted for missing temperature, pH and TDS labels. The diagnostics include each attempted region, text and confidence.
- Each reading distinguishes **unit verified by OCR**, **unit inferred from a verified nine-reading layout**, and **unit missing**. Inferred or missing temperature/pH/etc. units display explicit warnings and a per-parameter unit confirmation checkbox.
- Missing or ambiguous TDS units **never** trigger automatic g/L-to-mg/L conversion. The reading stays blank until the operator checks the original photograph and explicitly selects g/L or mg/L. Conversions are shown, and the existing freshwater-ppm acknowledgement remains mandatory.
- The operator must still review chosen readings, verify units, confirm layout when required, explicitly apply values, and confirm measurement date/time before saving. No background storage or uploaded photo was added.
- Use **Try experimental visual reconciliation** for this update and export diagnostics tagged `visual-reconcile-v3-unit-review`. Old JSON files do not test the new rules. Do not merge to main until fresh end-to-end tests on seven originals plus unseen photos and mobile use are complete.

## Strict TDS unit safety patch (31 October 2026)

- TDS label detection, `layout.matched.tds`, `unitStatus`, `sourceUnit`, and numerical conversion now use one exact source-unit classifier. Only `g/L TDS` or `mg/L TDS` (case/spacing-insensitive) permits automated conversion.
- Ambiguous labels such as `Y g/L TDS`, `} g/L TDS`, and `S/L TDS` stay **missing**, not OCR-verified. The original numeric OCR candidate remains available for review but the converted TDS output is blank.
- The photo review always shows a source-unit selector when TDS lacks a valid verified source unit, even if contradictory status metadata appears. The TDS value cannot be entered before source-unit selection; changing/clearing selection clears the proposed conversion.
- All selected readings and freshwater approximations still require human confirmation before applying; no changes are made to existing records, the standard scanner, or `main` by this patch.
- Diagnostics from the patch carry `visual-reconcile-v3-unit-review-tds-fix1`. Test both ambiguous source labels and valid g/L / mg/L meter labels before release.
