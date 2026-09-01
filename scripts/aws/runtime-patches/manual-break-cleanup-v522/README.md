# Manual break cleanup v522

- Suppresses the retired `この時間を休憩にする` action that is still created by an older production client layer.
- Keeps the v521 checkbox flow as the only break-registration entry point.
- Ensures break mode exposes exactly the staff, start-time, and end-time fields.

Parent image: manual break booking v521 (`sha256:55566a426b9eb5b41b2663b8b18414b557d0009355379bef765331ef9ca988e9`).
