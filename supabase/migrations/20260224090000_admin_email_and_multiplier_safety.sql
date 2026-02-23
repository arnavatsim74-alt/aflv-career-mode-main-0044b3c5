-- Ensure admin bootstrap email exists
INSERT INTO public.admin_emails (email)
VALUES ('admin@aflv.ru')
ON CONFLICT (email) DO NOTHING;

-- Ensure flight hour multipliers table exists for older deployments
CREATE TABLE IF NOT EXISTS public.flight_hour_multipliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  min_hours numeric(8,2) NOT NULL DEFAULT 0,
  max_hours numeric(8,2),
  multiplier numeric(6,2) NOT NULL DEFAULT 1.00,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS flight_hour_multipliers_active_idx
  ON public.flight_hour_multipliers (is_active, min_hours);

ALTER TABLE public.flight_hour_multipliers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'flight_hour_multipliers'
      AND policyname = 'Flight hour multipliers viewable by authenticated'
  ) THEN
    CREATE POLICY "Flight hour multipliers viewable by authenticated"
    ON public.flight_hour_multipliers
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'flight_hour_multipliers'
      AND policyname = 'Admins can manage flight hour multipliers'
  ) THEN
    CREATE POLICY "Admins can manage flight hour multipliers"
    ON public.flight_hour_multipliers
    USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;
