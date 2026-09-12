# Style demo engagement and ordering v634

- Adds demo likes and comments only to published Salon de Lien style posts that had no engagement.
- Stores a persistent, organization-scoped display number on every visible style post.
- Uses insertion semantics when a number is changed: the post at the requested position and following posts move back.
- Shows compact No controls, like totals, and comment totals on the salon style-management cards.
- Makes the configured No order the default on salon and customer style lists while retaining alternate sort choices.
- Normalizes missing, duplicate, or gapped numbers inside a transaction protected by an organization advisory lock.
