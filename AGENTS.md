# Project rules
- Keep personal loyalty eligibility calculations in a shared pure module used by both Entrance and Booking Management so thresholds and rounding remain consistent.
- Apply loyalty discounts and append audit records in one database transaction, validating membership again on save so stale verification cannot bypass eligibility.
- Preserve historical booking payments when applying discounts; only change the payable total and outstanding balance, not prior receipts.