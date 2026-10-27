# Local records, correction and recovery

Records remain in the existing `noveraAqua.v2` localStorage key. There is no backend, account, cloud backup or team synchronisation. More → Records & backups links directly to the existing Settings screen's revised backup panel. Keyboard focus moves to that panel.

Full JSON download and clipboard copy reuse the existing state format. Per-tank CSV exports remain reports, not restorable backups; recorded water/death times are now included when available. Last successful clipboard-copy and file-export-request timestamps are tracked in this browser only. A download request is explicitly not proof that the file was saved. These timestamps are not imported from another device.

## Import and recovery

File and pasted-text import share one validator and replacement preview. Full version 2/schema 2 backups up to 5 MB are accepted. Validation checks required collections, IDs and sequence, tank references, dates/times, finite numeric readings, quantities, settings/ranges, schedule and correction-history structure; unsafe object keys and excessive nesting are rejected. Invalid files do not change farm records. Unknown historical provenance metadata is preserved, not generated. Legacy/partial formats and CSV are rejected rather than silently converted or having settings reset.

Import replaces the entire farm and its settings; it never merges. The preview shows current/incoming record counts, states replacement explicitly and requires typing REPLACE. A stale review is rejected. Clear-all and load-example actions also use this confirmation flow.

Before replacement, water/feeding/stock correction or water/feeding/stock record deletion, the previous farm is saved to `noveraAqua.v2.recovery`. If either storage write fails, in-memory farm replacement is aborted and an error explains that the operation did not save. The one recovery snapshot can be reviewed/restored through the same validated import flow. It is not an external backup: the next protected action overwrites it, and clearing site data loses it. Existing tank deletion, task editing and routine settings do not create snapshots; this limitation is shown in the UI.

## Correction

Water, feeding, stock and death histories provide Correct actions using the existing sheet UI. Record IDs, record type, original officer/source and existing provenance stay attached. A correction requires an actor and reason, and appends the previous changed values plus correction timestamp to the record's optional `corrections` array. Missing historical time stays missing when left blank. Unmeasured readings stay absent; actual zero remains zero. Missing source metadata is displayed as “Entry method not recorded”.

The existing ledger calculation and render flow update stock, monitoring, Tank World and trends. Transfers affect both tanks; later recounts retain their established semantics. Existing thresholds and stock calculation rules are unchanged. The correction history is included in full JSON backups; the UI shows the latest correction. It is an editable local audit trail, not a tamper-proof or multi-user audit system.

No migration is required or performed. Optional correction metadata and two separate local keys (recovery and backup-action timestamps) are additive. Existing records are not rewritten on deployment. OCR assets and the water form's photo integration are byte-for-byte unchanged.

## Verification

`node --test tests/*.cjs`: 89 checks across six scripts passed, including 17 new recovery checks. Coverage includes real sample/empty backup validation, exact round trip with provenance/settings/schedule, malformed rejection without mutation, typed confirmation, stale review, simulated quota failures, recovery restore, correction validation, partial values, transfer/count recalculation, deletion snapshots, audit round trip and clipboard timestamp success/failure.

Browser preview used disposable data only. A downloaded JSON containing 6 tanks, 85 water tests, 88 feeding records and 24 stock/death records was imported through the file chooser. Blank confirmation was rejected, confirmed replacement succeeded, and records persisted after reload. A stock correction changed the total from 1,055 to 1,056; validation retained the entered quantity, Overview reflected the correction, cancellation retained it, and recovery restored 1,055. Backup panels and correction forms were inspected at 320px and 390px iframe widths without horizontal overflow.

Not verified: physical Android/iOS file pickers and keyboards, Safari/Firefox, exhaustive screen-reader behavior, very large-history performance, or real device quota exhaustion. No real user records were altered for testing. No OCR recognition regression was run because OCR development remains paused. Cloud sync, merging, legacy conversion and recovery after browser-data deletion without an external backup remain unsupported.
