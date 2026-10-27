# Daily monitoring layout

Overview now uses a compact heading, urgent issues, quick logging, compact figures and shared tank cards. Tank World offers Compact (default when no valid preference exists) and Illustrated views. The choice is stored in existing settings as worldView and survives settings merging, refresh, cross-tab synchronization and backup/restore. No data migration is required.

Cards show tank name, variant, recorded stock, separate condition/freshness, specific warning causes, measurement timestamp, and direct logging/details actions. Routine readings are collapsed below warnings. Internal IDs remain implementation keys and are not shown in ordinary card/detail text. Infrequent appearance and tank controls sit in expandable settings; reduced motion remains directly accessible. Representative shrimp illustrations and the count disclaimer remain available.

## Verification

- 9 daily-layout checks, 21 water-status checks and 20 tank-world checks passed (50 total).
- Browser checked Overview and Tank World at 320 and 390 CSS-pixel frame widths: no horizontal body overflow.
- Illustrated preference persisted after reload; Compact could be selected again.
- Direct log action opened the existing water form with B2 selected; cancelled without saving.
- Details opened the correct tank, with abnormal parameters before normal readings.
- Reduced-motion Illustrated view remained readable; existing OS reduced-motion support retained.
- Layout switching does not change records, tank IDs, thresholds or ledger-derived stock totals (automated checks).

## Scope and limitations

Only index.html, tests/daily-layout.cjs and this document are changed. OCR development remains paused; no OCR asset is modified. Browser checks used isolated preview example data, not user records. Viewport checks are not physical iOS/Android device testing. Very long custom names and all browser/device combinations have not been exhaustively tested. Missing historical times are explicitly displayed as time not recorded; no timestamps are invented.
