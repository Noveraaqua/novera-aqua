# Water condition and freshness — 27 October 2026

Water condition comes only from recorded numeric values and the existing configured pH-swing rule. Missing or old data never raises condition severity. No valid values produces Not assessed, not Within range.

Freshness uses the existing worldStaleDays setting across Overview, Water and Tank World (default seven days; overdue at or beyond the limit). Required values remain the existing eight parameters; DO remains optional. No valid values = Missing; absent required fields = Partially recorded; complete records = Current or Overdue. Overdue is also shown for partial records, so freshness counts can overlap. The latest saved test is assessed as a whole; older values are not silently carried into partial tests.

All three views share the same status, summary and cause functions. Out-of-range counts include only tanks with a recorded high/low value. pH instability can produce Warning even with no out-of-range value; its actual swing and configured threshold are displayed separately. Causes include measured value, unit and high/low direction. Old normal data says Within range when last tested. Partial normal data qualifies that only recorded values are within range. Invalid/future dates require review and do not change water severity. Missing/blank/nonfinite/boolean values are not zero and are excluded from charts and pH-swing calculations; actual numeric zero is valid.

No threshold values, IDs, records, schema, stock calculations, feeding calculations or OCR assets changed. OCR development is paused. This patch is based on live main, not the experimental OCR branch.

Verification: 21 isolated water-status tests plus 20 Tank World/management tests pass. Includes normal, warning/danger, overdue boundary, custom freshness/ranges, missing, partial, partial+danger, partial+overdue, optional DO, zero vs missing, pH-swing behavior, same summaries across views, attention filter, retired tanks, tank deletion, persisted records and unchanged stock totals. Cloud-browser preview checked Overview, Water and Tank World using isolated example data.

Limitations: freshness is calendar-day based, following the existing configuration; it is not an hourly or per-parameter schedule. Readings describe the latest recorded test, not live sensors. Physical-phone testing is not covered by the automated suite. Existing demonstration-data behavior is unchanged; no examples are injected into existing records by this update.

Files: index.html, tests/water-status.cjs, tests/tank-world.cjs, WATER-STATUS-README.md.

Run: node tests/water-status.cjs && node tests/tank-world.cjs
