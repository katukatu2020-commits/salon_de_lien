# Style order input stability v666

This protected runtime release fixes two staff style-list interaction regressions:

- Retains an in-progress `No.` value and focus when the hydrated application replaces the list DOM.
- Removes positional hover transforms from style cards so pointer hit testing cannot oscillate at card edges.

The existing reorder API, page destination behavior, visibility controls, and delete controls remain unchanged.
