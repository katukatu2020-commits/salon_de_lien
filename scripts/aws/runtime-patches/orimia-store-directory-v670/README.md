# ORIMIA store directory v670

- Replaces customer-managed salon registration and unlinking with a directory of every salon currently published on ORIMIA.
- Groups the customer directory by prefecture and lazily prepares the existing tenant-specific customer record when a salon is selected.
- Adds an owner-only ORIMIA publication switch to the salon store settings page.
- Applies the publication rule to cross-salon icons and store switching.
- Removes customer registration QR/code cards and updates customer navigation copy.

The release is an immutable runtime child of v669 and includes schema, integration, responsive browser, protected production smoke, and read-only production browser checks.
