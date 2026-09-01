# Business hours consistency v514

- Preserves an explicitly empty weekly-closure selection instead of converting it to Sunday.
- Gives a selected date's daily hours and closure state precedence on the shift calendar.
- Refetches daily hours whenever staff navigate to another date.
- Adds a clear return link from daily business hours to the shift and reservation calendar.
- Audits the production profile parser before protected deployment and keeps the release immutable.
