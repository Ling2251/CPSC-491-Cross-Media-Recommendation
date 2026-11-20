
-- Sprint 3: Activity Feed Privacy
-- Controls whether a user's activity is visible to friends.

ALTER TABLE users
ADD COLUMN IF NOT EXISTS activity_public BOOLEAN
NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_activity_public
ON users(id)
WHERE activity_public = TRUE;
