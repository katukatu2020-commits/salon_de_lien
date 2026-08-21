# Customer registration resend v347

Cache-busts the public resend controller asset after browser verification found the previous immutable URL still serving the first revision. This guarantees the server-provided retry interval is honored immediately in existing browsers.
