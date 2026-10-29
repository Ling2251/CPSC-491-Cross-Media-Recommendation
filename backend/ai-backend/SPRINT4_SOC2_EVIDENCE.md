# Sprint 4 SOC 2 Evidence: CC6.1 Logical Access Security

Student: Maxwell Tan
Sprint: 4
Subsystem: AI Recommendation System (backend/ai-backend/)
SOC 2 control: CC6.1 - Logical Access Security
Branch: feat/sprint4-soc2-ai-security-maxwell

## 1. Scope and claim

This document covers only the AI recommendation backend. It shows that the personalized recommendation endpoint now requires a valid signed token and blocks access to other users' recommendations, and it records what was tested. It does not claim full SOC 2 compliance. A SOC 2 attestation covers the whole organization over a period and is outside what one backend module can show.

## 2. Identified security risks

- R1 (high): GET /recommend/{user_id} had no authentication. Any caller could request any user's personalized recommendations by changing the ID in the URL. Confirmed before the change: requests with no Authorization header returned 200 with recommendations.
- R2 (high): No ownership check. Even an authenticated caller would have been served any user's recommendations.
- R3 (medium): The AI backend had no JWT verification code and no JWT library in requirements.txt, so it could not check the identity issued by the rest of the system.
- R4 (low): /health and /generate are public. /generate returns generated dummy users, media, and sample records. The data is synthetic, but it is still an unauthenticated endpoint.
- R5 (medium, future): Preference data has no HTTP endpoints yet, so it is not exposed today. Any future preference endpoint will need the same access control.
- R6 (medium, integration): The Node User Profile backend uses PostgreSQL user IDs, and the AI backend uses dummy user IDs 1-50. The two ID spaces are not linked. Authorization compares the token's userId with the URL user ID, so once real users are connected, the ID mapping must be made explicit.
- R7 (low): The Node backend issues one-hour tokens with no revocation list. A token remains valid until it expires after logout.
- R8 (low): The AI backend has no rate limiting or audit logging.

## 3. Previous implementation (inspected before changes)

- Node backend (backend/server.js, backend/routes/auth.js, backend/routes/friendshipRoutes.js): issues JWTs with HS256, payload { userId }, expiresIn 1h, signed with process.env.JWT_SECRET. server.js and friendshipRoutes.js verify with algorithms: ["HS256"]. Friendship routes return 500 when the secret is missing.
- AI backend before this sprint: no authentication on any endpoint. /recommend/{user_id} accepted any integer ID.
- Existing tests: 75 pytest tests, none covering access control.

No Node code was changed. The AI backend verifies tokens in the same format, so no second authentication system was introduced.

## 4. Changes made

- backend/ai-backend/app/security.py (new): get_current_user_id dependency. Reads the Bearer token, verifies the HS256 signature against JWT_SECRET, requires the exp and userId claims, rejects expired and invalid tokens with 401, and requires an integer userId. Returns 500 if JWT_SECRET is not set (fail closed). Does not log tokens or claims.
- backend/ai-backend/app/main.py: /recommend/{user_id} now depends on get_current_user_id and returns 403 when the token's userId differs from the path user_id. The ownership check runs before the user lookup, so unknown IDs are not revealed to other users. Ranking, filtering, and validation are unchanged.
- backend/ai-backend/requirements.txt: added PyJWT==2.10.1.
- backend/ai-backend/tests/conftest.py (new): test-only JWT secret set per test, plus token helper fixtures.
- backend/ai-backend/tests/test_api.py: /recommend calls now send a valid token. Assertions are unchanged.
- backend/ai-backend/tests/test_security.py (new): 17 security tests.
- backend/ai-backend/README.md: authentication section and JWT_SECRET setup.
- backend/ai-backend/SPRINT4_SOC2_EVIDENCE.md (this file).

## 5. Acceptance criteria

| Criterion | Status | Evidence |
|---|---|---|
| Unauthenticated requests to /recommend return 401 | Verified | test_missing_token_returns_401, test_non_bearer_scheme_returns_401 |
| Invalid tokens return 401 | Verified | malformed, wrong secret, unsigned none-algorithm, no exp, no userId, non-integer userId tests |
| Expired tokens return 401 | Verified | test_expired_token_returns_401 |
| Cross-user access returns 403 | Verified | test_user_cannot_read_another_users_recommendations |
| Own recommendations succeed | Verified | test_user_can_read_own_recommendations, test_own_recommendations_match_recommender_output |
| URL tampering cannot bypass authorization | Verified | test_changing_user_id_in_url_does_not_bypass_authorization, test_ownership_is_checked_before_user_lookup |
| Pydantic validation unchanged | Verified | test_valid_token_still_subject_to_pydantic_validation, test_api.py 422 tests |
| Existing recommendation behavior unchanged | Verified | Existing 75 tests pass; output matches the recommender directly |
| Fails closed without JWT_SECRET | Verified | test_server_without_jwt_secret_fails_closed |
| Tokens from the real Node backend are accepted | Verified manually (not in pytest) | See section 7 |
| CI runs the security tests | Pending | See section 8 |

## 6. Test results (actual, run locally)

Command: python -m pytest backend/ai-backend/tests -q
Result: 92 passed, 0 failed, 0 skipped, 0 errors (75 existing + 17 new security tests)

Security tests (test_security.py): 17 passed, 0 failed.

Mapping to the requested test list:

1. Missing token returns 401: PASSED (test_missing_token_returns_401)
2. Invalid token returns 401: PASSED (test_malformed_token_returns_401, test_token_signed_with_wrong_secret_returns_401, test_unsigned_none_algorithm_token_returns_401)
3. Expired token returns 401: PASSED (test_expired_token_returns_401)
4. Valid token for another user returns 403: PASSED (test_user_cannot_read_another_users_recommendations)
5. Valid token for own recommendations succeeds: PASSED (test_user_can_read_own_recommendations)
6. URL tampering cannot bypass authentication: PASSED (test_changing_user_id_in_url_does_not_bypass_authorization)
7. Pydantic validation still works: PASSED (test_valid_token_still_subject_to_pydantic_validation; test_api.py 422 tests)
8. Existing recommendation functionality still works: PASSED (test_own_recommendations_match_recommender_output; all existing recommender tests)

Additional tests: expired-token detail message, tokens without exp or userId, non-integer userId claim, missing JWT_SECRET (fail closed), and public /health access.

## 7. Cross-check with the real Node backend (manual, not in pytest)

The Node jsonwebtoken library (version 9.0.3) signed a token with payload { userId: 7 } and the same HS256 scheme. The Python backend returned 200 for /recommend/7 and 403 for /recommend/8.

The cross-check ran in a scratch directory outside the repository. The backend/node_modules folder in the repository is incomplete on this machine, so it was not used.

## 8. GitHub Actions

- The backend workflow (.github/workflows/backend-ci.yml) runs pytest backend/ai-backend/tests on pull requests to main and AI-Recommendation, and on pushes to main, AI-Recommendation, or feature/* branches (path-filtered to backend/ai-backend/).
- No CI run exists yet for this branch. Its name (feat/...) does not match the workflow's feature/* push filter, so the workflow runs when a pull request into main is opened.
- Status: pending. Replace this line with the run URL and result after the pull request runs.

## 9. Reproducing the tests

From the repository root:

    pip install -r backend/ai-backend/requirements.txt
    python -m pytest backend/ai-backend/tests -v

To run only the security tests:

    python -m pytest backend/ai-backend/tests/test_security.py -v

The tests set JWT_SECRET themselves (tests/conftest.py), so no real secret is required.

## 10. Remaining risks and limitations

- The AI backend and the Node backend share one symmetric secret. Any service that holds JWT_SECRET can mint tokens. Asymmetric signing would reduce this risk.
- Tokens have no issuer or audience claims, so any service that uses the same secret would accept them.
- There is no token revocation. A stolen token works until it expires, which can be one hour.
- The AI backend is not yet connected to real User Profile accounts. Until the ID mapping is defined (R6), the check only proves the caller owns the numeric ID in the token.
- /generate and /health remain public (R4). They expose synthetic data and counts only.
- No rate limiting or audit logging (R8).
- No penetration testing or independent review has been performed.
- Preference endpoints do not exist yet. Any future endpoint must use the same dependency.
