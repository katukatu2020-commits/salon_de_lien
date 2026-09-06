# Customer chart attachment delete v567

- Adds an organization- and customer-scoped DELETE endpoint for private chart attachments.
- Deletes the private S3 object before removing its database record.
- Adds delete controls to both the latest chart and chart history views.
- Requires an explicit confirmation checkbox and never uses a typed confirmation message.
