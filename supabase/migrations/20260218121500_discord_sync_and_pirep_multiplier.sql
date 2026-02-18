-- Discord synchronization and dynamic PIREP multipliers

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discord_user_id text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_discord_user_id_uidx
  ON public.profiles (discord_user_id)
  WHERE discord_user_id IS NOT NULL;

ALTER TABLE public.pireps
  ADD COLUMN IF NOT EXISTS multiplier numeric(6,2) DEFAULT 1.00;

CREATE TABLE IF NOT EXISTS public.flight_hour_multipliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  min_hours numeric(6,2) NOT NULL,
  max_hours numeric(6,2),
  multiplier numeric(6,2) NOT NULL DEFAULT 1.00,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS flight_hour_multipliers_active_idx
  ON public.flight_hour_multipliers (is_active, min_hours);

ALTER TABLE public.flight_hour_multipliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Flight hour multipliers viewable by authenticated"
ON public.flight_hour_multipliers
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage flight hour multipliers"
ON public.flight_hour_multipliers
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
