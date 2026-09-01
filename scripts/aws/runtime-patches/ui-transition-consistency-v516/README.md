# UI transition consistency v516

Prevents legacy store and customer layouts from becoming visible before the current UI runtime finishes.

- Guards initial rendering and client-side navigation with critical CSS.
- Covers Next.js pages and the standalone customer home/chat pages.
- Uses explicit runtime completion events instead of mutation timing alone.
- Keeps a bounded fallback so a failed enhancement cannot leave the app hidden.
- Verifies desktop, mobile, full-page navigation, client navigation, and browser back behavior.
