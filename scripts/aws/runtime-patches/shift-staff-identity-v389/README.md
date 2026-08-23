# Shift staff stable identity v389

- Resolves the destination staff by `StaffBookingSetting.staffKey` instead of relying on the display name.
- Treats the Japanese name variants `渡邊`, `渡邉`, and `渡辺` as the same staff member for backward compatibility.
- Keeps appointment cards on the selected staff lane after the API response and after a page reload.
- Includes runtime verification for the server handler and compiled shift-table client.
