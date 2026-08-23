# Sales ledger layout and navigation v388

- Uses the same max-width, segmented navigation, hero, spacing, colors, and radii as the management analytics pages.
- Mounts the sales ledger outside React-managed DOM and hides the original page without deleting it.
- Cleans up the isolated ledger before client-side navigation, preventing `removeChild` conflicts.
- Applies the same React-safe mounting and non-destructive hiding to the customer chat workflow found by the navigation audit.
