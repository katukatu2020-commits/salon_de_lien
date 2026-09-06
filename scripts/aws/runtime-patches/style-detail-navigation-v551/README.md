# Customer style detail navigation v551

- Removes the redundant `スタイル一覧へ` link from customer style details; the shared header remains the single back affordance.
- Reconciles the customer route stack when a previously visited page is restored.
- Drops detail routes that would otherwise create `list -> detail -> list -> detail` back-navigation loops.
- Leaves the staff style-detail back link and the admin route stack unchanged.
- Uses a new shell cache key so existing mobile browsers receive the repaired navigation logic immediately.

Local build:

```powershell
docker build --build-arg BASE_IMAGE=salon-de-lien:owner-shared-switch-v550-local -t salon-de-lien:style-detail-navigation-v551-local scripts/aws/runtime-patches/style-detail-navigation-v551
```
