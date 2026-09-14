# Style list performance v640

- Replaces the staff and customer style-list server render with a lightweight shell so the browser does not receive a duplicate 50-post list.
- Loads one 12-post page through the existing audience-specific API and cancels superseded or stalled requests after eight seconds.
- Stops the hidden legacy 300-post staff management list from loading while retaining publish, unpublish, delete, filters, pagination, and manual No ordering in the active list.
- Serves generated WebP thumbnails for bundled demo styles and signed, cached WebP thumbnails for private S3 style photos.
- Prioritizes only the first visible images and lazy-loads the rest.
- Lets the navigation loader clear as soon as the style list reports ready or error instead of waiting for a fixed fallback delay.
