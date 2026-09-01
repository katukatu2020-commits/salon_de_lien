# Customer account lifecycle v532

This release keeps customer account operations attached to the global app account after the customer switches to another registered store.

- Nicknames load and save through the authenticated `AppUser` from every linked store.
- Community posts resolve that same global nickname.
- Withdrawal requests use the real account email from every linked store.
- Withdrawal confirmation disables the app account and marks every linked customer chart as withdrawn while preserving operational history.
- The existing new-customer registration transaction is not changed and is verified during the image build.
