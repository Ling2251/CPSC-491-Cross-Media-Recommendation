// SPRINT 4 AC4 CONTROLLED TEST — deliberately failing check to verify whether
// GitHub blocks a merge with a failing required check (CC8.1 Test 3). This
// branch/PR is a controlled security test and is not intended to be merged.
const assert = require('assert');
assert.strictEqual(1, 2, 'Deliberate failure for Sprint 4 AC4 verification');
