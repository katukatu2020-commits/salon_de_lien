# Admin product tab state v586

Fixes the stale product-shelf selection that remained after leaving the inventory and ordering workspace through client-side navigation.

The shared workspace now restores its temporary DOM changes and then selects the preserved navigation link that best matches the current pathname and query parameters. The correction is repeated on the next animation frame and after the client transition settles.
