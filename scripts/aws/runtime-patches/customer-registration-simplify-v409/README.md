# Customer registration simplify v409

This immutable runtime patch is based on the exact production v408 image. It changes only the customer registration screen:

- removes the staff preference field;
- removes the phone-number explanatory note in both SMS-enabled and SMS-paused rendering paths;
- keeps phone input, SMS verification, uniqueness checks, and all other screens unchanged.

The build fails unless every expected production bundle fragment is matched exactly once.
