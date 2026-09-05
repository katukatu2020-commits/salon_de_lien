# Navigation Loading Experience v536

- Replaces the static logo pulse with a branded status message and animated progress rail.
- Keeps the existing first-paint guard for full reloads and real page changes.
- Ignores same-path query, tab, filter, and local settings updates so minor interactions do not blank the page.
- Restores the enhanced loader if React removes pre-hydration body children.
- Covers narrow standalone customer shells across the full mobile viewport.
- Preserves the v516 readiness contract used by existing admin and customer runtimes.
