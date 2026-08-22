# community-image-aspect-v383

- Uses the same `4:5` image aspect ratio in the style list and detail view.
- Removes the mobile-only `4:3` override that changed the crop after opening a style.
- Publishes new immutable common, customer-layout, and mobile-runtime asset names so cached v377/v378 assets cannot restore the old ratio.
