# Community desktop aspect v391

The community list renders each style image at `4:5`, but a legacy desktop-only
runtime rule replaced the detail image ratio with `aspect-ratio: auto` and a
fixed `560px` height. At the production desktop width this rendered the detail
image at roughly `683 x 560`, changing the crop when opening a post.

This release removes the fixed-height override and makes the desktop detail
photo use the same `4:5` aspect ratio and `cover` crop as the list card. Mobile
layout rules and community data behavior are unchanged.
