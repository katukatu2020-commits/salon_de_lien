# Customer store unlink v654

Allows customer accounts to remove any registered salon, including the final one, while preserving salon-side customer records and visit history.

The release also:

- records an explicit exclusion so removed stores are not silently restored;
- keeps a storeless customer on the store-management screen until another salon is registered;
- promotes the first newly registered salon to the account's active salon and refreshes the signed session;
- keeps the existing five-salon limit and current-store replacement flow;
- enables the remove control for a one-salon account and explains the temporary loss of store features before confirmation.

The runtime patch is an immutable child of the reviewed v653 production image. Integration coverage uses PostgreSQL, and browser coverage exercises the final-store removal and re-registration flow at mobile and desktop widths.
