-- Add maintenance_until column to track when maintenance ends
ALTER TABLE public.virtual_fleet 
ADD COLUMN IF NOT EXISTS maintenance_until timestamp with time zone DEFAULT NULL;

-- Create function to check and release aircraft from maintenance
CREATE OR REPLACE FUNCTION public.check_maintenance_release()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Release aircraft from maintenance if 2 hours have passed
  UPDATE public.virtual_fleet
  SET status = 'idle', maintenance_until = NULL
  WHERE status = 'maintenance' 
    AND maintenance_until IS NOT NULL 
    AND maintenance_until <= now();
END;
$$;

-- Create function to handle flight completion and maintenance scheduling
CREATE OR REPLACE FUNCTION public.complete_aircraft_flight(
  p_tail_number text,
  p_arrival_airport text,
  p_flight_hours numeric DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_flights integer;
BEGIN
  -- Update aircraft: increment flights, update location, add hours
  UPDATE public.virtual_fleet
  SET 
    total_flights = total_flights + 1,
    current_location = p_arrival_airport,
    total_hours = total_hours + p_flight_hours,
    assigned_to = NULL,
    status = CASE 
      WHEN (total_flights + 1) % 3 = 0 THEN 'maintenance'
      ELSE 'idle'
    END,
    maintenance_until = CASE 
      WHEN (total_flights + 1) % 3 = 0 THEN now() + interval '2 hours'
      ELSE NULL
    END
  WHERE tail_number = p_tail_number
  RETURNING total_flights INTO v_new_flights;
END;
$$;