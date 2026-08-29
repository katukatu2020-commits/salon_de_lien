# Customer store primary link v456

Keeps the customer's registration-origin store visible after another store is linked.

The runtime patch:

- records the currently selected customer/store pair in `CustomerStoreLink` before adding another store;
- repairs missing registration-origin links from completed `CustomerRegistrationInvite` records;
- performs only idempotent `INSERT ... ON CONFLICT DO NOTHING` writes;
- leaves existing store links, customers, points, appointments, and sessions unchanged.

