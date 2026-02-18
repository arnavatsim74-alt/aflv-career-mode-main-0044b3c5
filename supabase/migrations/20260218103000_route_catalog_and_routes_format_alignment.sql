-- Align route schema with route import format:
-- routeNumber,depICAO,arrICAO,aircraft,routeType,estFlightTime,rank,notes

ALTER TABLE public.route_catalog
  ADD COLUMN IF NOT EXISTS route_number text,
  ADD COLUMN IF NOT EXISTS route_type text,
  ADD COLUMN IF NOT EXISTS rank text,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS route_number text,
  ADD COLUMN IF NOT EXISTS aircraft text,
  ADD COLUMN IF NOT EXISTS route_type text,
  ADD COLUMN IF NOT EXISTS rank text,
  ADD COLUMN IF NOT EXISTS notes text;

UPDATE public.route_catalog
SET
  route_number = COALESCE(route_number, flight_number),
  notes = COALESCE(notes, remarks)
WHERE route_number IS NULL OR notes IS NULL;

UPDATE public.routes
SET route_number = COALESCE(route_number, flight_number)
WHERE route_number IS NULL;

