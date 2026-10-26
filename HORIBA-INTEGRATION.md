# HORIBA browser integration — development checkpoint, 27 October 2026

This branch is a development candidate, not the live GitHub Pages deployment. Do not merge or deploy without the remaining device and privacy checks below. Existing records, thresholds and tank-management behavior are retained.

## Implemented

- PaddleOCR English PP-OCRv3 recognition through esearch-ocr 8.5.0, ONNX Runtime Web 1.23.2 WASM (single thread), OpenCV.js 4.11.0-release.1. Local js-sha256 0.11.1 verifies the model. Vendor licenses included.
- Lazy asset loading inside a short-lived worker; cancel, close, replacement, errors and successful recognition terminate workers. Generation tokens reject stale replies. Session release and OpenCV Mat cleanup are explicit. Photo canvases remain for review only and are cleared on close/cancel/replacement/save. No image persistence.
- Automatic quadrilateral detection, orientation using the blue HORIBA band, perspective correction, divider removal and grayscale/binary crops. Up to three candidate screens are checked. Manual upright LCD crop and rotation remain available.
- Original nine-reading layout only. At least seven labels plus required anchors must match; missing label values stay blank. Spare-area readings reject extended layouts. Gray/binary numeric passes must agree and meet the conservative acceptance rule. No decimal repair, inferred values, or expected-value fallback.
- Temperature, pH, TDS and DO concentration map to existing fields. Electrode potential, ORP, conductivity, saturation and salinity remain separate additional readings. g/L TDS converts to mg/L; ppm mapping requires explicit dilute-freshwater confirmation. Human review, overwrite confirmation, officer and measurement-time confirmation remain mandatory. No automatic save.
- Worker request guard permits fixed static GET assets only, with no query/body. POST, arbitrary destinations and sockets are rejected. The audit contains static asset URLs only.

## Assets and local setup

Production remains static, with paths relative to the repository subpath. Model binaries are intentionally not committed. Before serving this development branch, run:

```
python experiments/horiba/prepare-models.py
```

This downloads the upstream eSearch-OCR release 4.0.0 English model archive, verifies archive and model SHA256, and writes the model/dictionary under assets/models and dist/assets/models. Serve the repository root over HTTP, or copy index.html, favicon.png and assets into dist for the managed preview. For QA copy tests/browser-harness.html to dist/qa/index.html. Do not copy photos, test outputs or node_modules into a deployment.

The generated model files MUST be included in a future Pages build artifact; the current branch alone is not a ready-to-deploy Pages artifact. No deployment workflow has been changed. OpenCV and ONNX JS/WASM are fetched from exact versioned jsDelivr paths. Vendored esearch and SHA scripts are same-origin. The model is verified at runtime. CDN failure leaves manual logging available.

Model: 8,967,018 bytes, SHA256 ef7abd8bd3629ae57ea2c28b425c1bd258a871b93fd2fe7c433946ade9b5d9ea.
Archive SHA256: 9423bfc78b29858562f7e9e6825212d0975888726b3bf0649ee0fe762f5c2d6e.
Standard ONNX WASM: approximately 11.9 MB; OpenCV adds approximately 11 MB. Total initial assets are roughly 32 MB uncompressed, not the recognition-only 20.9 MB in the earlier comparison. Actual compressed transfer/cache behavior remains unmeasured. Browser HTTP caching may retain static model assets, never input images.

## Verification results

Actual shared pipeline (OpenCV + Paddle WASM, original photos, Node canvas adapter): 69 correct, 0 incorrect accepted, 21 unresolved out of 90 readings across ten supported photos. All four alternate-layout photos were blocked: two failed layout verification and two failed screen detection. This is development data, not an untouched holdout set or evidence of reliable recognition across models. The blurry photo still fails label verification.

Initial reference: eight accepted readings, temperature unresolved; TDS 0.177 g/L correctly becomes 177 mg/L. Unread values stay blank for manual correction.

80 automated checks pass: 21 HORIBA layout/numeric/network-policy checks, 23 mocked-worker form lifecycle/persistence checks, 20 Tank World/tank-management checks and 16 legacy-parser checks. Mocked-worker and legacy-parser tests do not establish Paddle recognition accuracy. Form tests cover cancellation, replacement, closing, stale responses, manual preservation, single submission, saved source/time metadata, reload and image-free backup data. Tank tests include deletion and retired hiding.

Final WASM-only browser run on one supplied photo: all nine readings correct, 9.296 seconds including loading in this cloud-browser run, zero active workers afterward, localStorage unchanged, IndexedDB database inventory unchanged. Earlier 6.446-second result used the larger JSEP runtime; these are separate runs, not a controlled speed comparison. The final audit shows the standard ort-wasm-simd-threaded.wasm, not JSEP.

390-pixel iframe: actual photo selection, scan, review and expanded crop controls worked. Photo panel clientWidth and scrollWidth both 326 px, with no horizontal overflow. This is a narrow desktop-browser viewport, not physical mobile testing.

## Remaining checks and limitations

- Physical Android/iOS speed, touch/camera/HEIC handling, peak memory and repeated-scan memory recovery have not been measured. Source images are capped at 15 MB and scaled to 1600 pixels after decoding; decode-time peak memory is still a risk to measure.
- Network evidence is the worker's instrumented asset-request audit and policy tests, not a complete packet capture. Dynamic module imports are not intercepted by that audit. Full network inspection is still needed.
- IndexedDB inventory equality is not a per-store content audit. Cache Storage and full storage exports across repeated browser runs need inspection. Automated backup checks inspect serialized records, not a complete interactive restore round trip.
- Improve temperature/electrode/TDS label and crop failures without weakening unit/layout gates. Test new untouched photos before claiming general accuracy.
- Complete final Pages build packaging and deployment checks only after these gates. Live site remains unchanged.

## Files

index.html; assets/ocr.js; assets/horiba-{core,pipeline,worker,network}.js; assets/vendor scripts/licenses; tests/horiba-core.cjs; tests/photo-flow.cjs; tests/browser-harness.html; experiments/horiba/prepare-models.py; experiments/horiba/test-pipeline.cjs; experiments/horiba/integration-benchmark.json; .gitignore; OCR-README.md; this report.

The repository contains code and aggregate evaluation results only. User photos, crops, raw OCR text and photo metadata are excluded.
