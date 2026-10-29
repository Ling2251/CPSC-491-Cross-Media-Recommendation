# Sprint 4 - CC9.2 third-party risk assessment

**Scope:** Entire Cross-Media Recommendation System. **Owner:** Matthew Sanchez.

This is a first-pass inventory and automated documentation control, not proof of SOC 2 compliance.
Risk ratings in `third_party_inventory.json` are preliminary and require human review.

## Implemented in this change

- Inventory of TMDB, TVMaze, Open Library, and GitHub/GitHub Actions.
- Validation of inventory fields, duplicate IDs, source references, and evidence requirements.
- Unit tests and a GitHub Actions workflow for repeatable checks.

## Run and collect evidence

From repository root:

```bash
python3 security/check_third_party_inventory.py
python3 -m unittest discover -s security/tests -v
```

For the assessment, save the output plus relevant GitHub Actions job URL and commit SHA.
Document provider information, security terms, data exchanged, existing mitigation evidence,
and residual risks before changing `assessment_status` to `verified`.

## Remaining Sprint 4 tasks

1. Review all external integrations and expand the inventory if more service providers are found.
2. Assess each provider's security and availability risks; validate preliminary risk ratings.
3. Review secrets configuration (do not paste secrets into evidence files).
4. Execute mocked failure/invalid-response tests for each external API; link evidence.
5. Run npm and Python dependency vulnerability scans; document findings separately.
6. Assign remediation owners/dates for high risks and record whether risks remain open.

**Interpretation:** CI passing only means inventory formatting and references are valid.
It does not verify providers' security posture or that risk mitigations work.
