# Customer chart route scope v571

This runtime patch keeps the customer chart attachment UI strictly inside a committed customer-detail page.

- Excludes the reserved `/admin/customers/messages` route from customer-ID matching.
- Requires the canonical admin shell, the matching hidden customer ID, and both customer-detail section anchors before mounting.
- Removes the unsafe generic `main` fallback.
- Drops stale attachment responses after navigation.
- Restores hidden customer-detail content and removes chart dialogs/cards when leaving the route.
- Uses a leading throttle rather than a resettable debounce so continuous DOM mutations cannot starve rendering.
- Applies the same customer identity guard to the appointment-history enhancer so reserved pages no longer issue invalid customer API requests.

The patch is based on the immutable v570 production image and preserves attachment upload, preview, download, history, and deletion behavior.
