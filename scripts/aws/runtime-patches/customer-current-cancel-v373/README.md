# Customer current reservation cancellation v373

- Places a direct `予約をキャンセル` action beside each card in `現在の予約`.
- Uses the existing authenticated cancellation API and a confirmation dialog.
- Loads the enhancement after both full page loads and client-side navigation.
- Removes the reservation card after a successful cancellation and shows feedback.
