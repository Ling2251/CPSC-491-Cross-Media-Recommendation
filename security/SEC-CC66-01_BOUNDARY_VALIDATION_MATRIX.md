# SEC-CC66-01 — Project Input Boundaries and Validation Rules

**Control:** SOC 2-aligned CC6.6 — Logical and System Boundary Protection  
**Owner:** Peijun Zhao  
**Sprint:** Sprint 4  
**Scope reviewed:** uploaded `CPSC-491-Cross-Media-Recommendation` project archive  

## Status legend

- **PASS** — validation and/or database protection is implemented and supported by code/tests.
- **PARTIAL** — some protection exists, but one or more required checks are missing or rely on only one layer.
- **GAP** — expected validation is not implemented in the reviewed path.
- **NOT YET IMPLEMENTED** — the boundary exists in the design but the feature is not implemented enough to verify it.

## Completed boundary-validation matrix

| ID | Subsystem | Boundary / entry point | Input / expected type | Required fields | Range / allowed values | Existing validation and rejection behavior | Database defensive layer | Status | Gap / engineering action | Owner / Jira mapping | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| UP-01 | User Profile / Auth | React Signup → `POST /api/auth/signup` | `name:string`, `email:string`, `password:string` | All 3 required | Email should be valid format; password policy not defined in code | React uses `required` and `type=email`; backend only checks truthiness and duplicate email, then hashes password. Invalid/missing fields return 400. No backend email-format/type/length/password-strength validation. | `users.name/email/password_hash NOT NULL`; `email UNIQUE`; varchar lengths | **PARTIAL** | Add backend type/trim/email-format checks and define minimum password/name rules. | User Profile owner; **SEC-CC66-06** or dedicated auth-validation subtask | `frontend/src/pages/Signup.jsx`; `backend/server.js`; migration `0004_create_friend_recommendation_tables.sql` |
| UP-02 | User Profile / Auth | React Login → `POST /api/auth/login` | `email:string`, `password:string` | Both required | Email format should be valid; password non-empty | React uses `type=email`/`type=password`; main backend route checks presence only and returns 400/401. A separate `routes/auth.js` has stronger string/trim checks but is not mounted by `server.js`. | User row must exist; email is unique | **PARTIAL** | Consolidate on one login route and enforce string/trim/email validation in the active route. | User Profile owner; **SEC-CC66-06** | `frontend/src/pages/Login.jsx`; `backend/server.js`; `backend/routes/auth.js` |
| UP-03 | User Profile / Auth | JWT → protected `/api/profile` | Bearer token; JWT claim `userId` expected positive integer | Authorization header, valid token | HS256; unexpired token; `userId > 0` expected | `authenticateToken` verifies JWT and algorithm, returns 401 on invalid/expired token. Active middleware does not explicitly validate `userId` type/range before DB use. | Query is parameterized; missing user returns 404 | **PARTIAL** | Validate `userId` claim as positive integer, matching friend/AI auth middleware behavior. | User Profile owner; **SEC-CC66-06** | `backend/server.js`; compare `backend/routes/friendshipRoutes.js` and `backend/app/friend_recommendation/api.py` |
| AI-01 | AI Recommendation | `GET /recommend/{user_id}?top_n=` | `user_id:int`, `top_n:int` | `user_id`; authenticated token | `top_n >= 1`; user may access only own ID | FastAPI enforces integer route/query types; `Query(ge=1)`; JWT dependency validates identity; endpoint returns 403 for cross-user, 404 if user absent. No upper bound on `top_n`; path `user_id` has no explicit positive bound. | In-memory generated dataset in current AI backend | **PARTIAL** | Add practical `top_n` maximum and positive user-id constraint if endpoint is retained for production. | AI Recommendation owner; **SEC-CC66-06** | `backend/ai-backend/app/main.py`; `backend/ai-backend/app/security.py`; `backend/ai-backend/tests/test_api.py` |
| AI-02 | AI Recommendation | Preference schema / onboarding data | lists of strings, enum list, float, bool | favorite genres/languages required | Genres 1–10; languages 1–5; content types `movie/tv_series/book/podcast`; threshold 0–10 | Pydantic `Field` and `Literal` enforce list sizes, numeric bounds, and allowed content types; malformed schema produces FastAPI/Pydantic controlled validation errors when used at API boundary. | None shown for these in current AI module | **PASS** | No immediate CC6.6 gap in schema definition; keep endpoint tests if/when exposed. | AI Recommendation owner | `backend/ai-backend/app/preferences.py` |
| AI-03 | AI Recommendation | Ratings and generated cross-component data → validator | `user_id:int`, `media_id:int`, `rating:float` | IDs/rating | rating 1–5; IDs must reference known in-memory users/media | `DataValidator.validate_ratings` checks referential membership and score range; validation returns errors instead of throwing. Pydantic provides base types. | No PostgreSQL boundary in this AI path | **PASS** | Consider positive-ID Pydantic constraints later, but existing validation safely rejects unknown IDs through validator. | AI Recommendation owner | `backend/ai-backend/app/models.py`; `app/services/validator.py`; `tests/test_validator.py` |
| FR-01 | Friend Recommendation | Existing interaction data → `MediaInteraction.validate()` | `media_id:int`, `media_type:str`, `interaction_type:str`, `tags:list[str]`, optional `rating:int` | media ID/type/interaction/tags; rating when rated | media type `video/audio/text`; interaction `consumed/saved/rated`; rating 1–5 | Model validates type enums, list, rating type/range; `clean_tag` rejects non-string tags. `media_id` only checks `isinstance(int)` and does not explicitly reject bool/zero/negative. | DB FK ensures real stored `media_id`; interaction CHECK and rating CHECK in migration 0004 | **PARTIAL** | Require positive non-boolean `media_id` for service-level defense in depth. | Peijun / preference owner; **SEC-CC66-04** | `backend/app/friend_recommendation/models.py`; `preference_service.py`; `backend/tests/test_friend_preferences.py`; migration 0004 |
| FR-02 | Friend Recommendation | Similarity vector → `cosine_similarity` | `dict[str, number]` | dictionary; string tag keys | weights finite and `>= 0` | `_validate_tag_vector` rejects non-dict, non-string tags, bool/non-numeric, NaN/inf, negative weights with controlled `ValueError`; empty/zero vectors return 0. | Stored similarity scores separately constrained 0–1 | **PASS** | None for current vector boundary. | Peijun; **SEC-CC66-02** | `backend/app/friend_recommendation/similarity.py`; `backend/tests/test_similarity.py` |
| FR-03 | Friend Recommendation | Media-specific similarity | `media_type:str`; two preference mappings | media type | exactly `video/audio/text` | `calculate_media_similarity` rejects unsupported type with `ValueError`; missing profile categories safely default to `{}`. | N/A | **PASS** | None. | Peijun; **SEC-CC66-02** | `similarity.py`; `test_similarity.py` |
| FR-04 | Friend Recommendation | Candidate ranking | candidate `user_id:int`, `preferences:dict`; optional `limit:int`, `current_user_id:int` | candidate ID/preferences | IDs positive; unique IDs; limit `>=0` | `rank_candidates` rejects invalid IDs, duplicate candidates, invalid/missing preference mapping, invalid limit; excludes current user. | Similarity storage later enforces user/candidate uniqueness | **PASS** | None. | Peijun; **SEC-CC66-02** | `similarity.py`; `backend/tests/test_friend_similarity.py` |
| FR-05 | Friend Recommendation | Authenticated recalc route | Bearer JWT → `userId:int` | valid bearer token | `userId` positive integer | FastAPI dependency checks token prefix, HS256 verification, and positive-int claim; 401/500 controlled responses. Service also rejects invalid `user_id`; inactive user becomes 404; service `ValueError` becomes 400. | User lookup only returns active users | **PASS** | No immediate gap in this route. | Peijun; **SEC-CC66-06** evidence | `backend/app/friend_recommendation/api.py`; `recommendation_service.py`; `backend/tests/test_friend_recommendation_api.py` |
| FR-06 | Friend Recommendation | Similarity score persistence | user/candidate IDs; overall/video/audio/text numeric scores | all IDs/scores | IDs positive; scores finite 0–1; user != candidate | Python validates IDs, self-score, score type/range, score dictionary; rolls back DB transaction on error. | FK to users; CHECK 0–1; self CHECK; UNIQUE pair in migration 0005 | **PASS** | None. | Peijun / DB owner; **SEC-CC66-05** evidence | `score_storage.py`; `test_friend_score_storage.py`; `test_friend_score_storage_postgres.py`; migration 0005 |
| FR-07 | Friend Recommendation / React | Backend recommendation JSON → frontend service | response object with `recommendations:Array`; each item should contain user ID/name/score/scores/shared tags | recommendation array | score fields expected 0–1; required object fields expected | Frontend only verifies `recommendations` is an array; it does not validate each recommendation object's field types/ranges. Backend formatter constructs expected fields. | N/A | **PARTIAL** | Add response-shape validation or typed schema at frontend/API contract boundary, especially IDs/scores/shared-tags. | Peijun / frontend owner; **SEC-CC66-07** | `frontend/src/services/friendRecommendationApi.js`; `backend/app/friend_recommendation/api.py`; frontend API tests |
| SOC-01 | Social / Friendship | `POST /api/friends/requests` body | `receiverId` string/number convertible to positive safe integer | receiverId required | 1..2,147,483,647; receiver != authenticated user | Route `isValidId` rejects malformed IDs, self-request gets 400; JWT identity is validated; FK error becomes 404; duplicate becomes 409. | FK users; `friendships_no_self`; unique unordered pair; status CHECK | **PASS** | Route boundary is strong. | Social owner; **SEC-CC66-03** | `backend/routes/friendshipRoutes.js`; `backend/tests/friendshipRoutes.test.js`; migration 0004 |
| SOC-02 | Social / Friendship | `PATCH/DELETE /api/friends/.../:id` route parameter | request/friendship ID string → positive safe integer | route ID; authenticated user | positive safe integer; operation must belong to authenticated requester/receiver | Route validates IDs; service SQL includes receiver/requester/current-user ownership and pending/accepted status; unauthorized/not-found handled in controlled response. | PK/FK/status checks | **PASS** | None at HTTP boundary. | Social owner; **SEC-CC66-03** | `friendshipRoutes.js`; `friendshipService.js`; route/service tests |
| SOC-03 | Social / Friendship | Direct internal calls to backend `friendshipService` | requester/receiver/request IDs | depends on method | expected positive integer IDs | Backend service directly checks self-request and authorization through SQL predicates, but does not itself validate type/range for all IDs; it relies on routes/DB for malformed ID protection. | FK, self CHECK, unique pair, status CHECK | **PARTIAL** | Add shared service-level ID validation to satisfy defense-in-depth if service is called outside routes. | Social owner; **SEC-CC66-03** | `backend/services/friendshipService.js`; `frontend/src/services/friendshipService.js` demonstrates stronger local validation pattern |
| TAG-01 | Media Tagging / DB | `assignTag` → `media_tags` | `mediaId`, `tagId`, optional confidence:number, source/status:string | IDs/source/status | confidence null or 0–1; source `external/auto/manual/user`; status `approved/pending_review/rejected` | `assignTag` performs no application validation; SQL is parameterized. `classifyCandidate` checks finite 0–1 confidence for auto classification, but direct `assignTag` can rely entirely on DB rejection. | Strong CHECK confidence/source/status; PK media+tag; FK media/tag | **PARTIAL** | Add service-layer validation for IDs, confidence, source, status before DB operation; retain DB as second layer. | Media Tagging/DB owner; **SEC-CC66-05** | `database/scripts/mediaTags.js`; `tagThreshold.js`; migration 0003; `test-schema.js`; `test-threshold.js` |
| TAG-02 | Media Tagging / DB | `createTag` → taxonomy | `name:string`, `category:string`, optional parentTagId | name/category | Controlled category set is expected by design, but no enum is enforced here | `createTag` has no type/blank/category validation; DB only enforces NOT NULL and unique `(name, category)` plus parent FK. | NOT NULL, UNIQUE, parent FK | **GAP** | Define/validate allowed tag categories and reject blank/non-string names/categories; optionally add DB CHECK. | Media Tagging/DB owner; **SEC-CC66-05** | `database/scripts/tags.js`; migration 0002 |
| MEDIA-01 | Media Storage | `createMedia` / internal media writes | title:string, mediaType:string, external IDs/metadata | title/mediaType | Expected project media types exist, but table/service accepts arbitrary strings | Service has no field/type/enum validation; DB only requires title/media_type NOT NULL and external source+ID uniqueness. | NOT NULL title/media_type; UNIQUE external pair | **GAP** | Add service validation and a documented allowed media-type set or DB CHECK consistent with project mappings. | Media Storage/DB owner; **SEC-CC66-05** or dedicated media-validation subtask | `database/scripts/media.js`; migration 0001; friend DB loader mapping in `database_service.py` |
| DB-01 | Shared PostgreSQL | `user_media_interactions` writes | user/media IDs, interaction type, optional rating | IDs/type; rating for rated | type `consumed/saved/rated`; rating 1–5 only for rated | Application Friend Recommendation model validates these when it constructs interactions; DB has strong CHECKs and UNIQUE. | FK user/media; CHECK type/rating; UNIQUE user/media/type | **PASS** | None for database boundary. | DB owner / Peijun evidence | migration 0004; `database/scripts/test-schema.js` |
| DB-02 | Shared PostgreSQL / User Profile | `users.account_state` | string state | state always present | expected states are used in code, but no shared enum/allowed list is enforced | DB column is NOT NULL with default `'active'`; no CHECK. Code uses lowercase `'active'` in queries while `activateUser` uses uppercase `'ACTIVE'` and `'ONBOARDING_REQUIRED'`, showing inconsistent allowed values. | NOT NULL only | **GAP** | Define canonical account states/casing, add service validation and DB CHECK/migration, update inconsistent code. | User Profile/DB owner; **SEC-CC66-05** or dedicated Jira subtask | `backend/server.js`; migration 0004; `database_service.py` |
| XCOMP-01 | Cross-component | PostgreSQL media type → Friend Recommendation preference category | database media_type string → `video/audio/text` | media row/type | mapping accepts video/movie/tv/tv_series/show/game, audio/music/podcast/audiobook, text/book/ebook/article | SQL CASE explicitly maps known values and returns NULL for unsupported values; unsupported media are excluded from preference queries instead of crashing. | `media.media_type` itself has no enum CHECK | **PARTIAL** | Receiving Friend Recommendation boundary is safe, but upstream storage should validate media types (MEDIA-01). | Peijun + Media Storage owner; **SEC-CC66-07** / **SEC-CC66-05** | `backend/app/friend_recommendation/database_service.py`; migration 0001 |
| XCOMP-02 | Cross-component | DB interaction/tag rows → Preference Calculator | row fields transformed to `MediaInteraction` | media_id/type/interaction/tags | interaction/rating/tag requirements as FR-01 | Database loader constructs `MediaInteraction`; `build_preference_profile` calls `interaction.validate`, so receiving service revalidates important cross-component data. | DB interaction and media-tag constraints | **PASS** | Tighten `media_id` positivity as noted in FR-01. | Peijun; **SEC-CC66-04/07** | `database_service.py`; `preference_service.py`; `models.py` |
| XCOMP-03 | Cross-component | Friendship state → Friend Suggestions filtering/UI | friendship objects with IDs/status | IDs/status | status expected pending/accepted/declined | Backend formats DB rows; frontend API client largely trusts returned friendship array/object contents. UI/local friendship service has validation logic, but API response schema is not formally validated on client. | DB status CHECK and ID FKs | **PARTIAL** | Add explicit response-shape validation or typed contract for friendship API data consumed by React. | Social/frontend owner; **SEC-CC66-07** | `backend/routes/friendshipRoutes.js`; `frontend/src/services/friendshipApi.js`; related API tests |

## Key findings

### Strong controls already present

1. **Friend Recommendation similarity vectors** reject malformed, non-finite, non-numeric, and negative weights before calculation.
2. **Friend Recommendation ranking** validates candidate IDs, duplicate candidates, preference mappings, and limits.
3. **Friend Recommendation score storage** validates IDs and score ranges in Python and again in PostgreSQL.
4. **Friendship HTTP routes** validate authenticated identity, route/body IDs, self-requests, duplicates, ownership, and known DB constraint failures.
5. **PostgreSQL interaction, friendship, media-tag, and similarity tables** provide strong defense-in-depth through FK, UNIQUE, and CHECK constraints.
6. **AI Recommendation** uses FastAPI/Pydantic and explicit validator logic for several boundary cases.

### Material gaps / partial controls

1. **Signup and active login backend validation is incomplete.** Required-field checks exist, but backend email/type/format and password-policy validation are not consistently enforced.
2. **JWT `userId` in the main Node profile middleware is not explicitly checked as a positive integer**, unlike the friendship and Friend Recommendation auth implementations.
3. **`MediaInteraction.media_id` service validation does not enforce positive/non-boolean IDs.** PostgreSQL FKs protect database-loaded data, but direct service calls are weaker.
4. **Frontend API clients do not fully validate recommendation/friendship response object schemas.** They mostly trust backend-created objects once the top-level request succeeds.
5. **Backend friendship service methods rely partly on route validation** instead of consistently validating ID types/ranges themselves.
6. **`assignTag` relies on PostgreSQL for direct confidence/source/status rejection.** Service-layer validation is incomplete.
7. **Tag taxonomy `category` has no allowed-value validation**, and blank/string validation is absent in `createTag`.
8. **Media `media_type` has no service-level or database enum restriction.** Friend Recommendation safely ignores unsupported values, but invalid values can still exist upstream.
9. **`users.account_state` has no database enum/check and currently has inconsistent casing in source code** (`active` vs `ACTIVE`/`ONBOARDING_REQUIRED`).
10. **AI `top_n` has a lower bound but no upper bound**, leaving an avoidable resource-boundary gap.

## Gap-to-Jira ownership map

| Gap | Assigned owner / follow-up |
|---|---|
| Friend Recommendation vector/input validation verification | Peijun — **SEC-CC66-02** |
| Friend request service-level and route boundary verification | Social owner, Peijun verifies — **SEC-CC66-03** |
| Rating / preference / `MediaInteraction.media_id` validation | Preference/Profile owner + Peijun — **SEC-CC66-04** |
| Tag confidence/source/status, tag category, media type, account-state DB constraints | Relevant DB/subsystem owners — **SEC-CC66-05** |
| Login/signup/JWT claim validation and consistent 4xx API responses | User Profile/API owners — **SEC-CC66-06** |
| Recommendation/friendship response schemas and other cross-component contracts | Shared subsystem owners, Peijun coordinates — **SEC-CC66-07** |
| Add representative boundary tests to CI | Peijun / CI owner — **SEC-CC66-08** |
| Collect final Sprint 4 CC6.6 evidence | Peijun — **SEC-CC66-09** |

## SEC-CC66-01 acceptance-criteria assessment

- **Major trust boundaries are documented:** **PASS** — React forms, API payloads, route parameters, database IDs, recommendation vectors, friend-request inputs, ratings, tag/confidence data, and cross-component paths are included.
- **Every subsystem has at least one identified validation boundary:** **PASS** — User Profile/Auth, AI Recommendation, Friend Recommendation, Social/Friendship, Media Tagging/Storage, PostgreSQL, and cross-component integration are represented.
- **Existing validation and missing validation are distinguishable:** **PASS** — each row is marked PASS/PARTIAL/GAP with the current protection and missing work identified separately.
- **Gaps are assigned to an owner or Jira issue:** **PASS for planning** — all identified gaps are mapped to an existing SEC-CC66 follow-up work item and subsystem owner category. Actual Jira URLs still need to be attached after the issues are created/updated in Jira.

## Evidence package for SEC-CC66-01

### Boundary matrix
This document is the completed boundary-validation matrix.

### Source-code evidence
- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/Signup.jsx`
- `frontend/src/services/friendRecommendationApi.js`
- `frontend/src/services/friendshipApi.js`
- `backend/server.js`
- `backend/routes/auth.js`
- `backend/routes/friendshipRoutes.js`
- `backend/services/friendshipService.js`
- `backend/app/friend_recommendation/api.py`
- `backend/app/friend_recommendation/models.py`
- `backend/app/friend_recommendation/preference_service.py`
- `backend/app/friend_recommendation/recommendation_service.py`
- `backend/app/friend_recommendation/similarity.py`
- `backend/app/friend_recommendation/score_storage.py`
- `backend/app/friend_recommendation/database_service.py`
- `backend/ai-backend/app/main.py`
- `backend/ai-backend/app/security.py`
- `backend/ai-backend/app/preferences.py`
- `backend/ai-backend/app/services/validator.py`
- `database/scripts/tags.js`
- `database/scripts/mediaTags.js`
- `database/scripts/tagThreshold.js`
- `database/scripts/media.js`
- `database/migrations/0001_create_media_table.sql`
- `database/migrations/0002_create_tag_taxonomy_table.sql`
- `database/migrations/0003_create_media_tags_table.sql`
- `database/migrations/0004_create_friend_recommendation_tables.sql`
- `database/migrations/0005_create_friend_similarity_scores.sql`

### Existing test evidence identified
- `backend/tests/test_similarity.py`
- `backend/tests/test_friend_similarity.py`
- `backend/tests/test_friend_preferences.py`
- `backend/tests/test_friend_recommendation_api.py`
- `backend/tests/test_friend_recommendation_service.py`
- `backend/tests/test_friend_score_storage.py`
- `backend/tests/test_friend_score_storage_postgres.py`
- `backend/tests/friendshipRoutes.test.js`
- `backend/tests/friendshipService.test.js`
- `backend/ai-backend/tests/test_api.py`
- `backend/ai-backend/tests/test_security.py`
- `backend/ai-backend/tests/test_validator.py`
- `frontend/src/services/friendRecommendationApi.test.js`
- `frontend/src/services/friendshipApi.test.js`
- `database/scripts/test-schema.js`
- `database/scripts/test-threshold.js`

### Jira evidence still required
After the Jira issue is created or updated, attach:
1. the SEC-CC66-01 Jira URL;
2. this matrix/document;
3. links to any follow-up SEC-CC66-02 through SEC-CC66-07 issues created for confirmed gaps;
4. later Sprint 4 PR/CI links as the gaps are addressed.

## SEC-CC66-01 result

**Status: COMPLETE FOR INVENTORY / PASS WITH FOLLOW-UP GAPS**

The project-wide boundary inventory is complete. Existing controls are clearly separated from partial or missing controls, and every confirmed gap has a subsystem owner category and a mapped Sprint 4 follow-up Jira task. The remaining work belongs to the implementation/verification tickets, not to the inventory itself.
