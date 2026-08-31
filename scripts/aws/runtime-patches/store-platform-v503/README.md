# Store platform v503

This protected child release extends the running v502 image without rebuilding the historical application source.

It adds:

- product purchase demographics by age group and gender;
- route-specific service branding (`ORIMIA for Salon` for store users and `Powered by ORIMIA` for customers) while preserving tenant store names;
- unframed service icons and route-specific installable-app manifests;
- linked-store synchronization for customer profile fields and profile images;
- default business hours and weekly holidays inside the calendar's daily-hours screen, while preserving per-day overrides;
- a quantity editor that allows clearing and replacing the current value normally, then restores `1` only when an empty field loses focus;
- one questionnaire per product and one lottery draw per purchased unit.

The shared layout and checkout chunks are cache-busted so installed browser apps receive the update immediately.
