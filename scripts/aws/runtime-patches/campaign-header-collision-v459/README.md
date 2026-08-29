# Campaign header collision v459

Applies only the campaign page-header class fix on top of the approved v458
production image.

The generic `.hero` class collided with the shared admin runtime and made the
campaign header unusually tall and dark. The page now uses the scoped
`.campaign-page-header` class. Campaign CRUD and the shared AppShell remain
unchanged.
