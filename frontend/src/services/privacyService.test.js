import {
  describe,
  expect,
  test,
} from "vitest";

import {
  canViewUserActivity,
  getUserById,
} from "./privacyService.js";

describe("PrivacyService", () => {
  test("finds an existing user", () => {
    const user = getUserById(1);

    expect(user).toBeDefined();
    expect(user.id).toBe(1);
  });

  test("returns undefined for a user that does not exist", () => {
    const user = getUserById(999);

    expect(user).toBeUndefined();
  });

  test("allows a user to view their own activity", () => {
    const result =
      canViewUserActivity(2, 2);

    expect(result).toBe(true);
  });

  test("allows another user to view public activity", () => {
    // User 3 has activityPrivate: false
    const result =
      canViewUserActivity(1, 3);

    expect(result).toBe(true);
  });

  test("blocks another user from viewing private activity", () => {
    // User 2 has activityPrivate: true
    const result =
      canViewUserActivity(1, 2);

    expect(result).toBe(false);
  });

  test("denies activity access for a user that does not exist", () => {
    const result =
      canViewUserActivity(1, 999);

    expect(result).toBe(false);
  });
});