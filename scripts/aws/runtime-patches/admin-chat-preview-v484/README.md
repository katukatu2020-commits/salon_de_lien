# Admin chat preview v484

Protected child-image correction on top of the approved v483 production release.

- Keeps each latest-message preview in the admin conversation sidebar on one line.
- Constrains the grid item and flex item widths so long unbroken or Japanese text cannot widen the card.
- Clips only overflowing preview text and displays the standard ellipsis.
- Keeps the timestamp visible and prevents it from shrinking.
- Preserves the complete message body in the conversation pane and the stored chat data.
- Includes a real headless-browser production smoke test that substitutes a long preview locally in the DOM and verifies computed layout without writing any application data.
