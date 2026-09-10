# Style publisher and customer comments v615

- Uses the active post organization name for every customer style publisher header.
- Restores the customer-owned comment three-dot menu with edit and delete actions.
- Initializes comment ownership controls at DOM readiness, independently of slow style images.
- Rebinds ownership controls after React comment updates without duplicating menus.
- Keeps all comment mutations protected by the existing session, tenant, ownership, and same-origin checks.
