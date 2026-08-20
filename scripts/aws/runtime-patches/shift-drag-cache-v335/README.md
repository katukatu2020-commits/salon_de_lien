# Shift drag cache v335

Next.js serves static chunks with a one-year immutable browser cache. Replacing
the old chunk in place could leave an already-used browser on the former drag
implementation.

This patch publishes the corrected shift chunk under a new versioned filename
and updates both build manifests. Every browser therefore requests the fixed
drag code without requiring a manual hard refresh.
