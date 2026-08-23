# Customer record merge placement v408

Keeps the customer-record merge action inside the individual customer chart's
management tab. The previous client appended the card to the end of `main` when
its intended anchor was not ready, which made the action appear as a detached,
full-width panel.

This patch is based on the immutable AWS v407 image. It changes only the merge
client placement and presentation; merge APIs, database schema, and customer
records are unchanged.
