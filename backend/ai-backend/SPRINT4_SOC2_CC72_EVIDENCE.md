# Sprint 4 SOC 2 Evidence: CC7.2 Security Logging and Monitoring

Student: Maxwell Tan
Control: SOC 2 CC7.2 - System monitoring and security event logging
Subsystem implemented: AI Recommendation System (backend/ai-backend/)
Branch: feat/sprint4-soc2-cc72-logging-maxwell

This document separates verified results from proposed work. The CC6.1 access-control tests (test_security.py) are a separate control. Their results are not evidence that CC7.2 logging works.

## 1. Scope and claim

This implementation covers the AI backend only. It makes security-relevant failures in that service produce timestamped, sanitized, structured logs that can be correlated by request ID. It does not claim SOC 2 compliance, and it does not cover the Node.js, PostgreSQL, media import, or friend recommendation code, which are owned by teammates (see section 8).

## 2. Security logging risks identified

- L1 (high): Failed authentication and authorization attempts were not logged. Repeated attempts from one client would not be visible.
- L2 (high): No request correlation. An error could not be tied to a specific request.
- L3 (medium): Startup validation problems were printed with print(), without timestamps, severity, or a component name.
- L4 (medium): Unexpected exceptions returned a 500 response with no logged record.
- L5 (medium): External provider failures were logged as free-form text that included full request URLs, including query strings.
- L6 (medium, Node.js, not changed): console.error(error) logs entire error objects in backend/server.js, which can include SQL and connection details. backend/routes/auth.js logs error.message.
- L7 (low, Node.js, not changed): No structured format, request IDs, or repeated-failure detection in the Express backend.

## 3. Existing logging gaps (audit results)

AI backend (before this change):
- Logged: collector retries and malformed records (Python logging, unstructured). Startup validation problems (print).
- Not logged: authentication failures, authorization failures, invalid requests (422), recommendation errors, unexpected exceptions, repeated failures.
- Exposure check: no secret logging found. Public data logs included the full request URL.

Node.js backend (audited, not changed):
- Logged: console.error in server.js, friendshipRoutes.js, and auth.js. Several log whole error objects.
- Not logged in a structured way. No request IDs. No repeated-failure detection.

Database and migrations (partially audited):
- database/scripts/db.js and backend/db.js read credentials from environment variables and do not log them directly. Migration files exist under database/migrations/. No migration-failure logging was found in the files reviewed. Not fully inspected.

Media import, tagging, friend recommendation, and social interactivity (partially audited):
- Not fully inspected in this sprint. Invalid media and friend request validation failures are not logged by the AI backend. Node-side handling needs a separate review.

Shared CI workflows (audited):
- backend-ci.yml and ci.yml run the AI backend tests. soc2-cc92.yml runs teammate CC9.2 checks. No CI workflow prints secrets, and none needs them.

## 4. Changes made

- backend/ai-backend/app/security_logging.py (new): JSON formatter with UTC timestamp, level, service, component, and event type. Redaction for JWTs, bearer tokens, connection-string passwords, and key/value secrets. Request ID validation and generation. Repeated-failure tracker. The module uses only the Python standard library.
- backend/ai-backend/app/security.py: logs each authentication failure with a reason code (missing_token, expired_token, invalid_token, invalid_identity). Logs a configuration error when JWT_SECRET is missing. Tokens and claims are never logged.
- backend/ai-backend/app/main.py: request ID middleware, invalid-request handler (422, values not echoed), safe 500 handler with request ID, authorization failure logging, recommendation calculation failure logging, startup validation events in place of print().
- backend/ai-backend/app/services/public_data.py: provider names, host-only URLs in logs, EXTERNAL_API_FAILURE event after retries are exhausted. Exception messages are replaced with exception type names.
- backend/ai-backend/tests/test_logging_cc72.py (new): 14 tests (section 6).
- backend/ai-backend/SPRINT4_SOC2_CC72_EVIDENCE.md (this file).

No Node.js, database, or workflow files were changed.

## 5. Implemented logging behavior

Each security event is one JSON line with these fields:

- timestamp (UTC, millisecond precision, ends in +00:00)
- level (WARNING for client errors, ERROR for server-side failures)
- service (ai-recommendation-backend)
- component (authentication, recommendation, api, public-data, data-validation)
- event (AUTH_FAILURE, AUTHZ_FAILURE, INVALID_REQUEST, UNEXPECTED_ERROR, RECOMMENDATION_ERROR, EXTERNAL_API_FAILURE, REPEATED_FAILURES, INVALID_MEDIA_RECORD, INVALID_DATA, CONFIGURATION_ERROR)
- message (safe description, redacted, max 300 characters)
- request_id (when available)
- status_code (when applicable)
- reason (a code, such as an exception class name)
- provider (external provider name, when applicable)
- client (a salted SHA-256 hash of the client address, truncated; the raw address is not logged)

Request IDs: an incoming X-Request-ID header is accepted only if it matches 8 to 64 letters, digits, dots, underscores, or hyphens. Otherwise a new random ID is generated. Every response includes X-Request-ID.

Repeated failures: when one client produces 5 authentication failures or 5 authorization failures within 300 seconds, one REPEATED_FAILURES warning is logged per crossing. The tracker is in memory and per process (see section 9).

## 6. Acceptance criteria and test results

Verified by pytest (run on this branch):

| # | Criterion | Test(s) | Result |
|---|---|---|---|
| 1 | Important failures generate identifiable logs | test_invalid_token_logs_auth_failure_with_request_id_and_timestamp, test_missing_token_logs_auth_failure_with_reason, test_expired_token_logs_auth_failure, test_authorization_failure_is_logged, test_invalid_request_is_logged_without_echoing_input, test_recommendation_calculation_error_is_logged_and_sanitized | PASSED |
| 2 | Logs contain timestamps | test_invalid_token_logs_auth_failure_with_request_id_and_timestamp, test_formatter_output_is_json_with_required_fields | PASSED |
| 3 | Logs identify the service or component | test_invalid_token_logs_auth_failure_with_request_id_and_timestamp, test_formatter_output_is_json_with_required_fields | PASSED |
| 4 | Logs do not expose sensitive credentials | test_redaction_removes_all_secret_shapes, test_recommendation_calculation_error_is_logged_and_sanitized, test_external_provider_timeout_is_logged_without_query_or_secrets | PASSED |
| 5 | Errors can be associated with a request | test_unexpected_exception_returns_safe_500_and_logs_request, test_invalid_token_logs_auth_failure_with_request_id_and_timestamp | PASSED |
| 6 | CI failures contain useful diagnostics | Verified in CI (section 8). Logs use the pytest captured output; the workflow prints pytest -v --tb=short output. | Partially verified (CI run pending) |
| 7 | External-provider failures are logged | test_external_provider_timeout_is_logged_without_query_or_secrets | PASSED |
| 8 | Database failures are logged without credentials | Not applicable to the AI backend, which has no database. See section 8. | Not applicable here |

Additional tests:
- test_repeated_auth_failures_are_flagged_once
- test_unexpected_exception_returns_safe_500_and_logs_request
- test_invalid_media_record_is_logged_at_validation
- test_request_id_header_is_validated
- test_public_health_endpoint_is_logged_without_security_events

Required failure scenarios from the Sprint 4 CC7.2 plan:
- Invalid authentication: covered.
- Unauthorized access: covered.
- Invalid FastAPI request: covered.
- Invalid friendship request: not applicable to the AI backend (see section 8).
- PostgreSQL connection failure: not applicable to the AI backend (see section 8).
- External provider timeout: covered.
- Invalid media record: covered.
- Recommendation calculation error: covered.

## 7. Test results (actual)

Command: python -m pytest backend/ai-backend/tests -q

Result on this branch: 117 passed, 0 failed, 0 skipped, 0 errors.
- 103 existing tests (includes the CC6.1 security tests and the teammates' CC9.2 tests): all pass.
- 14 new CC7.2 logging tests: all pass.

The 103 existing tests were not modified or removed.

Sanitized example output (generated from the running application, with example credentials):

    {"client":"4a81a92984ccced3","component":"authentication","event":"AUTH_FAILURE","level":"WARNING","message":"Authentication rejected","reason":"invalid_token","request_id":"sample-req-0001","service":"ai-recommendation-backend","status_code":401,"timestamp":"2026-11-06T00:11:15.853+00:00"}
    {"client":"4a81a92984ccced3","component":"recommendation","event":"AUTHZ_FAILURE","level":"WARNING","message":"Authenticated user requested another user's recommendations","reason":"user_mismatch","request_id":"sample-req-0002","service":"ai-recommendation-backend","status_code":403,"timestamp":"2026-11-06T00:11:15.873+00:00"}
    {"component":"recommendation","event":"RECOMMENDATION_ERROR","level":"ERROR","message":"Recommendation calculation failed","reason":"RuntimeError","request_id":"sample-req-0003","service":"ai-recommendation-backend","status_code":500,"timestamp":"2026-11-06T00:11:15.883+00:00"}

The third request raised a RuntimeError whose message contained a password and a connection string. Neither appears in the log or the response.

## 8. CI and cross-service status

CI: backend-ci.yml runs `pytest backend/ai-backend/tests` on pull requests to main and AI-Recommendation. The new tests are inside that directory and run automatically. Status: pending. Replace this line with the run URL and result after the pull request runs.

Not applicable to the AI backend:
- Database connection and migration failures: the AI backend has no database or migrations.
- Friend request validation failures: implemented in the Node.js friendship routes, not in the AI backend.

Not implemented in this change (teammate subsystems, need review by their owners):
- Node.js backend (server.js, routes/auth.js, routes/friendshipRoutes.js): replace console.error(error) with redacted structured events. Stop logging whole error objects and error.message values that could include SQL or connection details.
- Node.js authentication: add authentication-failure and repeated-failure events matching the AI backend format.
- Database scripts and migrations: add migration-failure and connection-failure events without printing connection settings.
- Media import and tagging: add invalid-record events for ingestion (the AI backend already logs invalid TVMaze and Open Library records via existing warnings).
- Friend recommendation and social interactivity: add validation-failure events.

## 9. Monitoring and review guidance

Log location: standard error of the AI backend process. In production, collect this output with the hosting platform's log service. No monitoring service is added by this sprint.

Review steps for developers:
1. Filter by event type. AUTH_FAILURE and REPEATED_FAILURES with reason "auth" indicate credential attacks or broken clients. Investigate a client if it appears more than once in a short period.
2. AUTHZ_FAILURE with reason "user_mismatch" indicates a client requesting another user's data. Investigate it promptly, even when it appears once.
3. UNEXPECTED_ERROR and RECOMMENDATION_ERROR are server-side bugs. Use the request_id to find related events and reproduce the failure.
4. CONFIGURATION_ERROR with reason jwt_secret_missing means the environment is misconfigured. Fix the configuration before the service handles traffic.
5. EXTERNAL_API_FAILURE shows a provider outage or rate limiting. It is expected during provider incidents, but repeated failures should be recorded for review.

Limitations of this review method: the repeated-failure tracker is in memory, so it resets when the process restarts and does not combine counts across multiple server instances. A shared log store is needed for that.

## 10. Remaining risks and engineering work

- Project-wide coverage is incomplete. Node.js, database, media import, and friend recommendation logging remain (section 8).
- Repeated-failure detection is per process and in memory only.
- Log retention, shipping, and alerting are not configured. There is no alerting for any event.
- Unexpected-exception logs do not include stack traces. This reduces the risk of leaking secrets through local variables, but it makes debugging harder.
- Redaction is pattern-based. Secrets with unusual formats may not be caught. Avoid putting secrets in exception messages in the first place.
- The client identifier is a salted hash that changes on every process restart. It supports short-term correlation only.
- No penetration testing or independent review has been performed.
