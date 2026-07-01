-- Admin-gated signups: an auth/profile account only ever exists for an
-- approved email, so account existence implies approval.

ALTER TABLE profiles
  ADD COLUMN email TEXT,
  ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing accounts (grandfathered in as already-approved)
UPDATE profiles p SET email = u.email
FROM auth.users u WHERE u.id = p.id;

ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;

CREATE UNIQUE INDEX profiles_email_unique_idx ON profiles (lower(email));

UPDATE profiles SET is_admin = true WHERE lower(email) = 'andrewjiang6789@gmail.com';

-- Trigger now also copies email onto the profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), NEW.email);
  RETURN NEW;
END;
$$;

-- Helper for RLS: is the current user an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid()), false);
$$;

-- Pending signup requests, created before any auth account exists.
-- No INSERT policy: requests are created by the service-role client in
-- lib/actions.ts (sendOtp), since the requester isn't authenticated yet.
CREATE TABLE access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES profiles(id)
);

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins view access requests" ON access_requests FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "admins update access requests" ON access_requests FOR UPDATE TO authenticated USING (is_admin());
