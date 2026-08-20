# Shift drag capture v333

The drag source held pointer capture but was changed to `visibility:hidden` as
soon as dragging began. Browsers can stop delivering pointer events when the
capturing element is removed from visibility, which caused jerky movement,
premature termination, and failure to reach non-adjacent staff rows.

The source now stays visible to hit testing and pointer capture while remaining
fully transparent. The existing requestAnimationFrame ghost and all-row target
calculation can therefore receive a continuous pointer stream.
