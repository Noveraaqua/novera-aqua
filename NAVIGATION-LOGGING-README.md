# Navigation and manual logging

Five primary destinations: Overview, Tanks (the existing Tank World screen), Log, Trends, More. More links to the retained Water, Feeding, Stock, Deaths, Schedule and Settings/backup screens. Operational subpages highlight More and provide a back action. Trends reuses the existing chart renderer; tank card/detail links select that tank in this shared destination. History links return to the existing Water history rather than creating another log screen.

Log offers water tests, feeding, deaths and stock changes. Global forms have an explicit blank tank choice. Tank-context actions preselect a valid active tank and display its name prominently. Transfer destinations must also be explicitly chosen. Save handlers reject blank, unknown and retired tanks. They validate dates/times and whole-number stock/death quantities. Manual officer registration stays within the form. Validation errors retain the form and entered values. Successful saves close the form and show a persistent dismissible confirmation.

Water measurement date/time are grouped near the start, units and notes remain clear, and partial tests are explicitly supported. Missing numeric fields remain absent, while actual zero stays zero. Existing records keep their original schema/values. No migration is required or performed. Old water entries with no time remain readable; new water tests require a valid time.

OCR scripts, CSS, parser, attachment API and recognition implementation are unchanged. The existing Read from photo control remains available. OCR development is paused.

## Verification

72 automated checks passed: 12 navigation/logging, 10 Water layout, 21 water condition/freshness, 9 daily layout and 20 Tank World checks. Covered five navigation destinations, retained features, global and tank-context forms, invalid tank/date/time/quantity rejection, partial saves, true zeros, duplicate water save prevention, existing save flows, persistence, and officer registration only on valid save.

Browser preview at 320 and 390 CSS pixels checked Log/More/Tanks/Trends navigation, explicit tank selection, retained pH/notes after validation errors, prominent B2 context, partial-test saving, confirmation, history, reload persistence and no horizontal overflow. One isolated preview record was saved; no live user records were created or deleted. OCR asset SHA-256 hashes match the prior version. No full photo-recognition regression was run because OCR implementation is outside scope.

Physical mobile keyboard/device testing, exhaustive browser coverage and large-history performance remain unverified.
