# Content edit/delete v465

Protected runtime child-image patch for the canonical AWS release.

- Adds tenant- and owner-scoped edit/delete APIs for community posts, comments, and chat messages.
- Community post/comment deletion is non-destructive (`published=false` / `deletedAt`).
- Chat controls are shown only when the API confirms that the current login user sent the message.
- Adds the same editing UI to customer and staff surfaces without replacing the recovered AWS application.

The Dockerfile is pinned to the exact v464 production parent digest. Deployment must use the protected canonical workflow and deployment lock.
