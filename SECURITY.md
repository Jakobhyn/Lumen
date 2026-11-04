# Security

Lumen runs inside the Steam client, so its scripts can see store and library pages.
They only read page content to build the layout, fetch trailers from Steam's own video CDN,
and never send data anywhere else.

Please report a vulnerability privately through
[GitHub's private vulnerability reporting](../../security/advisories/new) rather than an issue.

Every pull request runs CodeQL, dependency review, linting and tests; secret scanning with
push protection is on for the repository.
