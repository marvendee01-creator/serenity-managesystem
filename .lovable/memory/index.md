# Project Memory

## Core
- **Stack**: Lovable Cloud (Supabase) relational DB. No local IndexedDB.
- **UI/UX**: Keyboard-optimized (no steppers). Enter to save, Tab to navigate, Esc to cancel.
- **Layout**: Flat, 3-col icon grid on home. No nested menus. Prevent auto-logout/sleep.
- **Currency**: Always 2 decimal places (₱0.00), 0.01 step increment globally.

## Memories
- [Visual Identity](mem://style/visual-identity) — Application visual theme, colors, animations, and splash screen design
- [Operations Scope](mem://features/resort-operations-scope) — Core modules, Day/Overnight categorization, cash/GCash support
- [System Maintenance](mem://features/system-maintenance) — Local database backup, restoration, and full system reset capabilities
- [Reporting Standards](mem://features/reporting-standards) — Single-date filters, explicit timestamp formats, and strict headcount categories
- [Barcode Ticketing](mem://features/barcode-ticketing) — Automated CODE128 barcode generation for transaction tracking
- [Pricing Automation](mem://features/pricing-automation) — Rules for automated calculation of transaction amounts based on rates and guest categories
- [Cashier Reporting](mem://features/cashier-reporting-logic) — 3-part daily reports including specific GCash breakdown and petty cash details
- [Reservation Calendar](mem://features/reservation-calendar) — Monthly reservation board displaying multi-day bookings and export capabilities
- [Financial Controls](mem://features/financial-controls) — 3-tier payment status rules, booking tab logic, and outstanding balance alerts
- [Booking Conflicts](mem://features/booking-conflict-prevention) — Logic preventing overlapping reservations and exclusive booking clashes
- [Tour Classification](mem://features/tour-classification-logic) — Logic for classifying Day Tours (before 3 PM) and Overnight (after 3 PM) plus stay alerts
- [Room Stay Rules](mem://features/room-stay-rules) — Management of active room stays, timers, capacity, and checkout extensions
- [Company Profile](mem://features/company-profile-branding) — Branding settings for transaction receipt headers
- [Receipt Generation](mem://features/receipt-generation-system) — Automated 80mm thermal receipt production for completed transactions
- [Cashier Daily Lifecycle](mem://features/cashier-daily-lifecycle) — Expected Ending Cash persistence to configure Next Day's Beginning Cash
- [Petty Cash Monitoring](mem://features/petty-cash-monitoring) — Cumulative tracking of income across modules versus petty cash expenses
- [Printing Specs](mem://features/printing-specifications) — A4 portrait exports and 80mm thermal layouts designed as exact Excel clones
- [Manual Datetime](mem://features/manual-datetime-control) — Capability to manually override automatic timestamps for specific transactions
- [Transaction Editing](mem://features/transaction-editing-capability) — Rules for post-save manual corrections and automatic headcount recalculations
- [Games Session Tracking](mem://features/games-session-tracking) — Time-based Billiard/Videoke/Other with countdown timers, extend/end/cancel, overdue alerts
