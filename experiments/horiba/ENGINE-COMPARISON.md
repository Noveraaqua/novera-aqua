# PaddleOCR comparison — 26 October 2026

## Outcome
The alternative merits browser integration testing, but is not deployed. The live scanner and saved records are unchanged.

Both engines received the exact same existing grayscale and binary region PNGs. No screen detection, crop coordinates, labels or recognition outputs were adjusted during this comparison. All seven/ten-reading screens were excluded. The previously failed screen detection remains unresolved for all nine parameters.

| Batch | Readings | Paddle correct / incorrect / unresolved | Tesseract correct / incorrect / unresolved |
| --- | ---: | --- | --- |
| Original eight photos | 72 | 49 / 0 / 23 | 31 / 2 / 39 |
| Two newer nine-reading photos | 18 | 18 / 0 / 0 | 14 / 0 / 4 |
| Total | 90 | 67 / 0 / 23 | 45 / 2 / 43 |

Agreement rule: both preprocessing variants must produce identical syntactically numeric strings. No confidence threshold, decimal repair, range-based correction, expected-value fallback or inferred missing data. This rule is a comparison metric, not a production acceptance policy. It differs from the prior prototype's three-pass, confidence and fixed-precision gate, so the prior 20/72 figure is not a directly equivalent baseline. Tesseract's two errors were pH 7.477 instead of 7.47 and electrode potential -34 instead of -54. Two passes can repeat the same error. Zero errors in this small sample does not imply zero error risk.

## Engine and model
- esearch-ocr 8.5.0 (Apache-2.0), using its recognition-only `initRec` API.
- English PP-OCRv3 recognition model, `en_PP-OCRv3_rec_infer.onnx`, from upstream release 4.0.0/en.zip. This is the actual English model in that release, not PP-OCRv4 and not necessarily the model chosen by qduc/ocr.
- ONNX Runtime Web 1.23.2, WASM, one thread.
- Tesseract.js 6.0.1, English best_int data 1.0.0, PSM 7, numeric whitelist.
- Node canvas adapter @napi-rs/canvas 0.1.80 for this local comparison.
- Model SHA256: ef7abd8bd3629ae57ea2c28b425c1bd258a871b93fd2fe7c433946ade9b5d9ea
- Archive SHA256: 9423bfc78b29858562f7e9e6825212d0975888726b3bf0649ee0fe762f5c2d6e

Official references consulted:
- https://github.com/xushengfeng/eSearch-OCR
- https://github.com/xushengfeng/eSearch-OCR/releases/tag/4.0.0
- https://github.com/qduc/ocr

## Performance and cost
Local median inference per crop: Paddle 34–37 ms; Tesseract 15–16 ms. These are warmed inference measurements, not first-download latency or mobile camera-to-result timings. Engines were run sequentially on each identical crop. Model loading from disk was measured separately in engine-benchmark.json.

The recognition model is 8,967,018 bytes; dictionary 285 bytes. The standard ONNX WASM binary is 11,905,541 bytes. Combined about 20.9 MB uncompressed, excluding JavaScript and HTTP compression. Model ZIP alone is 8,146,377 bytes. No detection model is required for fixed numeric crops. Actual browser transfer and cache behavior remain unmeasured.

Reported RSS is the whole Node process with BOTH engines, native canvas and accumulated runtime allocations. It is not per-engine memory, peak mobile memory or evidence of a leak-free browser implementation.

## Privacy and resources
Images/crops stayed in the local test workspace; no photos or OCR outputs were submitted to a recognition service. Only dependency/model downloads used the network. The repository contains code and aggregate evaluation results, not photos/crops/models. ONNX sessions are explicitly released and the Tesseract worker terminated in finally blocks. Production integration must use temporary memory-only image buffers and inspect actual network and storage behavior.

## Next gates
1. Browser worker adapter with pinned runtime/model assets, explicit cleanup, cancellation and WASM fallback.
2. Independent label/unit verification and nine-reading layout rejection before field mapping.
3. Mobile first-load, steady-state speed, peak memory, cancellation and network/storage checks.
4. Improve detector and crop boundaries; engine switching cannot fix missing/cut-off digits.
5. Prefer Paddle as the candidate primary engine based on these results; use Tesseract selectively as supporting evidence, not an automatic fallback accepted as correct.
6. Human review remains required. Saline samples must never automatically use mg/L≈ppm.

## Reproduce
Install pinned packages into a separate development directory; set NODE_PATH to its node_modules. Download upstream en.zip and verify the above SHA256, then extract it locally.

```
node compare-engines.cjs <prepared-crops> <models/en> <tesseract-eng-best_int-dir>
python summarize-comparison.py <batch1/engine-comparison.json> <batch2/engine-comparison.json>
```

Expected numeric labels live only in evaluation scripts; compare-engines.cjs never reads them.
