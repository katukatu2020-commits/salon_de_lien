# Style community browser-back v490

Repairs the staff style-community management grid after opening a post and returning with the browser Back button.

## Root cause

The v482 mutation observer used a trailing 40 ms debounce. Next.js route restoration and other runtime observers continued mutating the page, so every pending repair was cancelled before it could fetch and rebuild the management grid. The restored server grid therefore kept its images but lost the publish/private and delete controls.

## Fix

- Coalesce mutation notifications without cancelling the first pending repair.
- Retry after `popstate` and `pageshow` while Next.js restores cached route content.
- Validate the complete managed-card structure instead of trusting a marker alone.
- Clear the stale detail enhancement marker when the list route is restored.
- Serve the client from a new immutable URL so existing browser caches cannot retain v482.

`smoke-production.mjs` drives Chrome through list, detail, browser Back, and repeated detail navigation.
