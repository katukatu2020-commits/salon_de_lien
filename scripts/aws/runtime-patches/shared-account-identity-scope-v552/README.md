# Shared account identity scope v552

- Allows an owner to save the existing store-shared login ID while resetting its password.
- Limits changed-ID collision checks to the back-office authentication audience.
- Keeps customer and store-side login IDs independent, matching the database identity indexes.
- Continues to reject conflicts with another owner, staff member, manufacturer, or store-shared account.
