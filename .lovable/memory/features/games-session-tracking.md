---
name: Games Session Tracking
description: Time-based game rental with Billiard/Videoke/Other, auto-rate prefill from settings, countdown timers, extend/end/cancel actions, and overdue alerts
type: feature
---
Games Rental now supports time-based session tracking:
- Game types: Billiard, Videoke, Other (dropdown)
- Auto-rate prefill from settings (billiard_rate, videoke_rate)
- Start time + default hours → computed end time
- Status: ONGOING → ENDED or CANCELLED
- Games Management module shows live countdown timers (ticks every second)
- Overdue popup alert: "TIME ALERT" with EXTEND/END buttons
- Extend action: additional hours + extension fee, updates end_time and amount_paid
- DB fields: start_time, end_time, default_hours, extend_hours, extend_amount, status, rate
