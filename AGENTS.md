# Project rules
- Keep personal loyalty eligibility calculations in a shared pure module used by both Entrance and Booking Management so thresholds and rounding remain consistent.
- Apply loyalty discounts and append audit records in one database transaction, validating membership again on save so stale verification cannot bypass eligibility.
- Preserve historical booking payments when applying discounts; only change the payable total and outstanding balance, not prior receipts.- Serenity reward roles live in serenity_reward_staff, checked only by SECURITY DEFINER functions; first signed-in user may claim admin only while no admin exists.
