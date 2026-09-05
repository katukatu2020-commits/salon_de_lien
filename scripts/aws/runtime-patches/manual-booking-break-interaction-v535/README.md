# Manual booking and break interaction v535

Runtime patch layered on the protected v534 production image.

- Excludes hidden break-only fields from normal manual-booking validation.
- Enables and requires those fields only while `休憩として登録` is selected.
- Copies the time chosen on the shift grid into the break start field, including late modal presets.
- Retains and regression-tests break-card drag and right-edge resize persistence.
