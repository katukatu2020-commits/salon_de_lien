# Appointment datetime editor v663

Adds a responsive date/time editor to active salon appointment detail pages.
The editor reuses the existing appointment schedule API, so staff working hours,
concurrency limits, locked statuses, and tenant authorization remain enforced.

The release is layered on the immutable v662 production digest and exposes
`X-Lien-Appointment-Datetime-Editor: v663` on `/api/health/ready`.
