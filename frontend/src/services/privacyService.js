// src/services/privacyService.js

import { users } from "../data/users";

/**
 * Finds a user from the temporary local user data.
 */
export function getUserById(userId) {
  return users.find(
    (user) =>
      Number(user.id) === Number(userId)
  );
}

/**
 * Returns whether one user is allowed to view
 * another user's activity.
 *
 * Rules for Sprint 2:
 *
 * 1. A user may always view their own activity.
 * 2. If the target user does not exist, deny access.
 * 3. If activityPrivate is true, other users cannot
 *    view that user's activity.
 * 4. Otherwise activity is visible.
 */
export function canViewUserActivity(
  viewerUserId,
  targetUserId
) {
  const viewerId = Number(viewerUserId);
  const targetId = Number(targetUserId);

  // Users can always see their own activity.
  if (viewerId === targetId) {
    return true;
  }

  const targetUser = getUserById(targetId);

  // Fail safely if user does not exist.
  if (!targetUser) {
    return false;
  }

  return targetUser.activityPrivate !== true;
}