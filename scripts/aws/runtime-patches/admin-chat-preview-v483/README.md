# Admin chat preview v483

Protected child-image patch on top of the approved v482 production release.

- Keeps each latest-message preview in the admin conversation sidebar on one line.
- Clips only overflowing preview text and displays the standard ellipsis.
- Keeps the timestamp visible and prevents it from shrinking.
- Preserves the complete message body in the conversation pane and the stored chat data.
- Includes a real headless-browser production smoke test that substitutes a long preview locally in the DOM and verifies computed layout without writing any application data.
