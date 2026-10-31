# HORIBA OCR — optional photo-assisted water entry

The HORIBA nine-reading scanner is available on **main** alongside the existing standard scanner and manual water-entry form. It is opt-in and currently labelled **experimental** while end-to-end validation of the v3 unit-review changes is completed.

## How to use

1. Open **Log → Water**, select the correct tank, then choose **HORIBA PaddleOCR (experimental)**.
2. Select **Read from photo**, provide an upright HORIBA nine-reading photo, and tick **Try experimental visual reconciliation** to use the latest digit and sign handling.
3. Scan. Compare every OCR candidate, unit, and sign against the original photograph. If a number cannot be resolved, leave it blank or type it manually after checking.
4. For an unreadable unit label, the screen may suggest the expected unit *only if the nine-reading layout was detected*. Explicitly confirm it against the image. For TDS, OCR must verify **g/L** or **mg/L** or the operator must choose which was shown before any conversion.
5. Explicitly tick the freshwater acknowledgement for mg/L-to-ppm approximation where applicable, confirm all chosen units and values, and select **Use reviewed readings**.
6. Confirm measurement date, time and tank before selecting **Save test**. OCR NEVER saves a record by itself.

## Safety and limitations

- Photos are processed on the device in a temporary worker and are not sent to an OCR recognition server. OCR model and JavaScript/WASM runtime assets are fetched from static hosts.
- The original standard photo scanner remains available. This OCR implementation does not replace manual entry.
- Only the website's existing structured water fields are populated. Additional HORIBA readings can be included in notes only after review.
- Missing measurements are never interpreted as zero; OCR output is not trusted without manual confirmation.
- Model: exact verified PP-OCRv3 recognition model `assets/models/en-rec.onnx` (SHA-256 `ef7abd8bd3629ae57ea2c28b425c1bd258a871b93fd2fe7c433946ade9b5d9ea`).
- Prior seven-photo testing of **v2** reconciled 62 of 63 values automatically without an incorrect numeric decision against the provided reference dataset. **This does not validate v3 browser performance.** Re-run all seven originals and test unseen photos on desktop and mobile, including Cancel and Save confirmation safeguards, before treating the new scanner as production-proven.

## Tests

Run `node tests/horiba-core.cjs`, `node tests/horiba-reconcile.cjs`, `node tests/horiba-photo-switch.cjs`, `node tests/horiba-partial-layout.cjs` and `node tests/horiba-unit-review.cjs`. GitHub Actions runs these safety tests for new OCR code on `main`.
