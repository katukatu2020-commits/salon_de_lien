# Customer staff booking v520

- Removes inactive and on-leave staff from the customer booking selector, including the legacy salon tenant.
- Uses the same staff eligibility rules for availability lookup and final booking submission.
- Prevents one staff member from starting two customers within the same 30-minute start window while preserving configured concurrent capacity for staggered services.
- Keeps recurring days off, schedule breaks, store hours, daily capacity, and cancellation exclusions intact.
- Corrects the monthly availability range so appointments on the last day of a month are included.

Parent image: campaign image crop v519 (`sha256:141a5b8e95a2dd1584e6bc43eda18e7efab550925b899bf8bce86eb4c10500aa`).
