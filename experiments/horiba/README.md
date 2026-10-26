# HORIBA scanner development checkpoint

Status: offline algorithm prototype, not production browser code. The deployed form is unchanged.

## Implemented
- Detect candidate LCD quadrilaterals across grayscale thresholds and closing sizes.
- Identify the top edge using the adjacent blue HORIBA strip; handles quarter-turn photos without reading EXIF.
- Perspective-warp detected LCDs to 900 x 675 pixels.
- Divide the known display into nine numeric regions (including signs and decimals).
- Recognize each region with Tesseract.js 6.0.1 using grayscale, thresholded, and alternate segmentation passes.
- Require agreement and expected display decimal formatting. Conflicts and malformed numbers remain unresolved. Confidence is a heuristic, not a probability.
- Separate evaluation labels from all recognition code. No fallback readings.

## Measured result
Eight supplied photos, 72 reference readings. Seven screen candidates located; the blurred 1000490956 screen was not found. Final conservative recognition accepted 20 correct values, 0 incorrect values, and left 52 unresolved. These numbers do not demonstrate production accuracy. An earlier less strict pass accepted an incorrect pH of 7.477; the formatting check now rejects it.

All eight were used in exploratory runs and detector iterations. The previously proposed held-out photos therefore must NOT be described as untouched independent validation. Obtain a fresh batch for final validation.

## Still required
- Improve screen detection on blurred/low-contrast shots, and reject incorrect casing crops with stronger layout validation.
- Refine numeric boxes/line removal: some crops still include separators or miss character edges.
- Verify labels and units independently; current experiment assumes the supplied fixed layout and units. Do not integrate into saving until this gate exists.
- Improve recognition coverage without weakening ambiguity checks.
- Port detection and warp to browser/worker code; measure bundle size, mobile latency and memory. Python/OpenCV is an offline experiment only, not a proposed server.
- Integrate with the existing review and cancellation lifecycle, retaining conversion rules and no image retention.
- Test a new untouched photo batch, mobile capture and no-network-upload behavior before deployment.

## Reproduce locally
Dependencies: Python opencv-python-headless==5.0.0.93; Node tesseract.js==6.0.1 and @tesseract.js-data/eng==1.0.0.

```
python prepare.py /path/to/photos /path/to/temporary-output
node recognize.cjs /path/to/temporary-output /path/to/eng/4.0.0_best_int
python evaluate.py /path/to/temporary-output/recognition.json
```

This experiment writes temporary crops for inspection to the specified local output directory. It does not upload images, write browser storage or alter logs. No photos, crops, raw OCR text or image metadata are included in the repository. Production integration must keep all image buffers in memory and release them on close/cancel/replace/save.

## Latest engine comparison
See [ENGINE-COMPARISON.md](ENGINE-COMPARISON.md) and `engine-benchmark.json` for the subsequent frozen-crop PaddleOCR/Tesseract comparison: 67 correct / 0 incorrect / 23 unresolved for Paddle across ten nine-reading photos. The comparison uses a different, explicitly documented agreement metric from the original conservative benchmark above. Browser/mobile integration remains pending.
