# Style admin rerender v619

Keeps the v618 store-side style filters mounted after delayed React hydration and later page rerenders.

- Detects when React reuses the enhanced list root for legacy content.
- Restores the v618 filter controls and cards from the last successful API response.
- Re-fetches when no successful response has been retained yet.
- Preserves the current-staff filter, three gender choices, age-filter removal, and current-staff editor.
- Adds a delayed browser assertion so detached or overwritten controls cannot pass release verification.
