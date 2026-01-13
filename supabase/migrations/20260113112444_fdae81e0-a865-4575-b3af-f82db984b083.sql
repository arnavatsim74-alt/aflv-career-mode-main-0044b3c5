-- Ensure 1:1 linkage by user_id
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_uidx ON public.profiles (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS registration_approvals_user_id_uidx ON public.registration_approvals (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_role_uidx ON public.user_roles (user_id, role);

-- Allow admins to approve pilots by updating profiles
CREATE POLICY "Admins can manage profiles"
ON public.profiles
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow users to self-assign ONLY the pilot role on signup
CREATE POLICY "Users can insert own pilot role"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND role = 'pilot'::app_role
);
