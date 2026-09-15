# Stamp booking rewards v644

Connects earned stamp-card menu rewards to the existing booking coupon and checkout flow.

- Issues one idempotent coupon grant for each completed stamp card.
- Represents a free menu reward as an exact-menu 100% discount.
- Automatically selects the reward when booking from the stamp card.
- Returns a reward after appointment cancellation and consumes it through the existing checkout path.
- Preserves the booking page scroll position while menu state is re-rendered.
