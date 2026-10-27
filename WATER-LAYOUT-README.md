# Compact Water page

Water monitoring starts with compact active-tank summaries. Each includes condition, freshness, warning values/units/reasons, timestamp, and direct logging. Gauges open on demand, abnormal parameters first. The three labelled filters show All tanks, Out-of-range readings, and Overdue or missing measurements. The last includes partial records and dates requiring review; explanatory text lives in the expandable condition/freshness summary. Filter counts use the existing shared status calculations.

A tank's Trend button opens its 30-day chart in that card, with a labelled parameter/unit selector. Tank-specific history is expandable. All measurement history remains accessible, including retired tanks, with date/time, source, officer, notes, values, units, and existing delete controls. Historical times are not invented.

No measurement values, thresholds, stock calculations, persistence schema, or OCR assets change. UI filter/expansion choices are transient and are not written into measurement records.

## Verification

60 isolated automated checks passed: 10 Water layout, 21 water condition/freshness, 9 daily layout, 20 Tank World. They cover normal, abnormal, overdue, missing and partial readings; filter membership; collapsed/expanded gauges; selected tank trends; all-record history; unchanged records/ranges/IDs; and existing tank management.

Browser preview checked 320 px and 390 px frames: separate filter results, gauge expansion/collapse, inline trend parameter selection, history disclosure, and no horizontal body overflow in expanded states. Textual status and high/low causes remain available without relying on colour. Navy/mint/white identity is retained.

Limitations: CSS-width checks are not physical iOS/Android tests; very large history performance and every browser/device combination have not been exhaustively tested. Preview testing used example data in an isolated origin. No real measurements were saved or deleted.
