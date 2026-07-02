-- Adds an optional username so users can sign in with (username|email) +
-- password instead of only email OTP. Username is always stored lowercase
-- (normalized in lib/actions.ts) so a plain unique index is sufficient,
-- unlike profiles.email which needed a lower() index because email casing
-- isn't normalized at write time.
ALTER TABLE profiles ADD COLUMN username TEXT;

ALTER TABLE profiles ADD CONSTRAINT profiles_username_format
  CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$');

CREATE UNIQUE INDEX profiles_username_unique_idx ON profiles (username) WHERE username IS NOT NULL;

-- No new RLS policy needed: the existing "users update own profile" UPDATE
-- policy (auth.uid() = id, used as both USING and WITH CHECK since none was
-- specified) already lets a user set their own username. Password itself
-- lives in auth.users and is changed via supabase.auth.updateUser(), which
-- Supabase Auth scopes to the current session rather than the profiles RLS.
