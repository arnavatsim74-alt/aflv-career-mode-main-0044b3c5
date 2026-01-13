CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'pilot'
);


--
-- Name: check_admin_email_on_signup(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_admin_email_on_signup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.admin_emails WHERE email = NEW.email) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: admin_emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: aeronautical_charts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aeronautical_charts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    airport_icao text NOT NULL,
    chart_name text NOT NULL,
    chart_url text NOT NULL,
    chart_type text DEFAULT 'approach'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: aircraft; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aircraft (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type_code text NOT NULL,
    name text NOT NULL,
    family text NOT NULL,
    seats integer NOT NULL,
    multiplier numeric(4,2) DEFAULT 1.00 NOT NULL,
    description text,
    price numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: base_transfer_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.base_transfer_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    current_base text NOT NULL,
    requested_base text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    notes text
);


--
-- Name: bases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    icao_code text NOT NULL,
    name text NOT NULL,
    multiplier numeric DEFAULT 1.0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: career_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.career_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    notes text
);


--
-- Name: dispatch_legs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dispatch_legs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    callsign text NOT NULL,
    user_id uuid NOT NULL,
    aircraft_id uuid NOT NULL,
    route_id uuid NOT NULL,
    leg_number integer NOT NULL,
    status text DEFAULT 'assigned'::text NOT NULL,
    assigned_by uuid,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    dispatch_group_id uuid,
    tail_number text,
    CONSTRAINT dispatch_legs_status_check CHECK ((status = ANY (ARRAY['assigned'::text, 'dispatched'::text, 'awaiting_approval'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: notams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    expires_at timestamp with time zone
);


--
-- Name: pireps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pireps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dispatch_leg_id uuid,
    user_id uuid NOT NULL,
    aircraft_id uuid NOT NULL,
    route_id uuid,
    flight_number text NOT NULL,
    departure_airport text NOT NULL,
    arrival_airport text NOT NULL,
    flight_time_hrs numeric(5,2) NOT NULL,
    flight_time_mins integer DEFAULT 0 NOT NULL,
    passengers integer,
    cargo_weight_kg integer,
    landing_rate integer,
    fuel_used integer,
    status text DEFAULT 'pending'::text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    xp_earned integer DEFAULT 0,
    money_earned numeric(12,2) DEFAULT 0,
    rejection_reason text,
    tail_number text,
    CONSTRAINT pireps_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    callsign text NOT NULL,
    name text NOT NULL,
    rank text DEFAULT 'Cadet'::text NOT NULL,
    xp integer DEFAULT 0 NOT NULL,
    money numeric(12,2) DEFAULT 0 NOT NULL,
    total_hours numeric(10,2) DEFAULT 0 NOT NULL,
    total_flights integer DEFAULT 0 NOT NULL,
    base_airport text DEFAULT 'UUEE'::text,
    active_aircraft_family text DEFAULT 'A320'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_approved boolean DEFAULT false NOT NULL
);


--
-- Name: registration_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registration_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    callsign text NOT NULL,
    base_airport text DEFAULT 'UUEE'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    rejection_reason text
);


--
-- Name: route_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.route_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    flight_number text NOT NULL,
    code text,
    dep_city text,
    arr_city text,
    dep_icao text NOT NULL,
    arr_icao text NOT NULL,
    aircraft text,
    duration_raw text,
    duration_mins integer,
    remarks text,
    lmt timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    flight_number text NOT NULL,
    departure_airport text NOT NULL,
    arrival_airport text NOT NULL,
    distance_nm integer NOT NULL,
    estimated_time_hrs numeric(5,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: type_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.type_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    aircraft_id uuid NOT NULL,
    acquired_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT false NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'pilot'::public.app_role NOT NULL
);


--
-- Name: virtual_fleet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.virtual_fleet (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tail_number text NOT NULL,
    aircraft_id uuid NOT NULL,
    livery text DEFAULT 'Aeroflot'::text,
    current_location text DEFAULT 'UUEE'::text,
    status text DEFAULT 'idle'::text NOT NULL,
    assigned_to uuid,
    total_hours numeric DEFAULT 0 NOT NULL,
    total_flights integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT virtual_fleet_status_check CHECK ((status = ANY (ARRAY['idle'::text, 'in_flight'::text, 'maintenance'::text])))
);


--
-- Name: admin_emails admin_emails_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_emails
    ADD CONSTRAINT admin_emails_email_key UNIQUE (email);


--
-- Name: admin_emails admin_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_emails
    ADD CONSTRAINT admin_emails_pkey PRIMARY KEY (id);


--
-- Name: aeronautical_charts aeronautical_charts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aeronautical_charts
    ADD CONSTRAINT aeronautical_charts_pkey PRIMARY KEY (id);


--
-- Name: aircraft aircraft_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aircraft
    ADD CONSTRAINT aircraft_pkey PRIMARY KEY (id);


--
-- Name: aircraft aircraft_type_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aircraft
    ADD CONSTRAINT aircraft_type_code_key UNIQUE (type_code);


--
-- Name: base_transfer_requests base_transfer_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.base_transfer_requests
    ADD CONSTRAINT base_transfer_requests_pkey PRIMARY KEY (id);


--
-- Name: bases bases_icao_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bases
    ADD CONSTRAINT bases_icao_code_key UNIQUE (icao_code);


--
-- Name: bases bases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bases
    ADD CONSTRAINT bases_pkey PRIMARY KEY (id);


--
-- Name: career_requests career_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_requests
    ADD CONSTRAINT career_requests_pkey PRIMARY KEY (id);


--
-- Name: dispatch_legs dispatch_legs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispatch_legs
    ADD CONSTRAINT dispatch_legs_pkey PRIMARY KEY (id);


--
-- Name: notams notams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notams
    ADD CONSTRAINT notams_pkey PRIMARY KEY (id);


--
-- Name: pireps pireps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pireps
    ADD CONSTRAINT pireps_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_callsign_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_callsign_key UNIQUE (callsign);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: registration_approvals registration_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_approvals
    ADD CONSTRAINT registration_approvals_pkey PRIMARY KEY (id);


--
-- Name: registration_approvals registration_approvals_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_approvals
    ADD CONSTRAINT registration_approvals_user_id_key UNIQUE (user_id);


--
-- Name: route_catalog route_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_catalog
    ADD CONSTRAINT route_catalog_pkey PRIMARY KEY (id);


--
-- Name: routes routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_pkey PRIMARY KEY (id);


--
-- Name: type_ratings type_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.type_ratings
    ADD CONSTRAINT type_ratings_pkey PRIMARY KEY (id);


--
-- Name: type_ratings type_ratings_user_id_aircraft_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.type_ratings
    ADD CONSTRAINT type_ratings_user_id_aircraft_id_key UNIQUE (user_id, aircraft_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: virtual_fleet virtual_fleet_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.virtual_fleet
    ADD CONSTRAINT virtual_fleet_pkey PRIMARY KEY (id);


--
-- Name: virtual_fleet virtual_fleet_tail_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.virtual_fleet
    ADD CONSTRAINT virtual_fleet_tail_number_key UNIQUE (tail_number);


--
-- Name: route_catalog_arr_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX route_catalog_arr_idx ON public.route_catalog USING btree (arr_icao);


--
-- Name: route_catalog_dep_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX route_catalog_dep_idx ON public.route_catalog USING btree (dep_icao);


--
-- Name: route_catalog_unique_leg; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX route_catalog_unique_leg ON public.route_catalog USING btree (flight_number, dep_icao, arr_icao);


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dispatch_legs dispatch_legs_aircraft_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispatch_legs
    ADD CONSTRAINT dispatch_legs_aircraft_id_fkey FOREIGN KEY (aircraft_id) REFERENCES public.aircraft(id);


--
-- Name: dispatch_legs dispatch_legs_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispatch_legs
    ADD CONSTRAINT dispatch_legs_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id);


--
-- Name: dispatch_legs dispatch_legs_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispatch_legs
    ADD CONSTRAINT dispatch_legs_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id);


--
-- Name: dispatch_legs dispatch_legs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispatch_legs
    ADD CONSTRAINT dispatch_legs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: pireps pireps_aircraft_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pireps
    ADD CONSTRAINT pireps_aircraft_id_fkey FOREIGN KEY (aircraft_id) REFERENCES public.aircraft(id);


--
-- Name: pireps pireps_dispatch_leg_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pireps
    ADD CONSTRAINT pireps_dispatch_leg_id_fkey FOREIGN KEY (dispatch_leg_id) REFERENCES public.dispatch_legs(id);


--
-- Name: pireps pireps_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pireps
    ADD CONSTRAINT pireps_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: pireps pireps_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pireps
    ADD CONSTRAINT pireps_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id);


--
-- Name: pireps pireps_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pireps
    ADD CONSTRAINT pireps_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: type_ratings type_ratings_aircraft_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.type_ratings
    ADD CONSTRAINT type_ratings_aircraft_id_fkey FOREIGN KEY (aircraft_id) REFERENCES public.aircraft(id) ON DELETE CASCADE;


--
-- Name: type_ratings type_ratings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.type_ratings
    ADD CONSTRAINT type_ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: virtual_fleet virtual_fleet_aircraft_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.virtual_fleet
    ADD CONSTRAINT virtual_fleet_aircraft_id_fkey FOREIGN KEY (aircraft_id) REFERENCES public.aircraft(id) ON DELETE CASCADE;


--
-- Name: virtual_fleet virtual_fleet_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.virtual_fleet
    ADD CONSTRAINT virtual_fleet_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: notams Admins can manage NOTAMs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage NOTAMs" ON public.notams USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_emails Admins can manage admin emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage admin emails" ON public.admin_emails USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: aircraft Admins can manage aircraft; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage aircraft" ON public.aircraft USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: bases Admins can manage bases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage bases" ON public.bases USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: career_requests Admins can manage career requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage career requests" ON public.career_requests USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: aeronautical_charts Admins can manage charts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage charts" ON public.aeronautical_charts USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: dispatch_legs Admins can manage dispatch legs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage dispatch legs" ON public.dispatch_legs USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: pireps Admins can manage pireps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage pireps" ON public.pireps USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: registration_approvals Admins can manage registrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage registrations" ON public.registration_approvals USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: route_catalog Admins can manage route catalog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage route catalog" ON public.route_catalog USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: routes Admins can manage routes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage routes" ON public.routes USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: base_transfer_requests Admins can manage transfer requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage transfer requests" ON public.base_transfer_requests USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: type_ratings Admins can manage type ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage type ratings" ON public.type_ratings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: virtual_fleet Admins can manage virtual fleet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage virtual fleet" ON public.virtual_fleet USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: dispatch_legs Admins can view all dispatch legs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all dispatch legs" ON public.dispatch_legs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: pireps Admins can view all pireps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all pireps" ON public.pireps FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: aircraft Aircraft viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Aircraft viewable by authenticated" ON public.aircraft FOR SELECT TO authenticated USING (true);


--
-- Name: bases Bases viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Bases viewable by everyone" ON public.bases FOR SELECT USING (true);


--
-- Name: aeronautical_charts Charts viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Charts viewable by authenticated users" ON public.aeronautical_charts FOR SELECT USING (true);


--
-- Name: notams NOTAMs viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "NOTAMs viewable by authenticated users" ON public.notams FOR SELECT USING ((is_active = true));


--
-- Name: profiles Profiles are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);


--
-- Name: route_catalog Route catalog viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Route catalog viewable by authenticated" ON public.route_catalog FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: routes Routes viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Routes viewable by authenticated" ON public.routes FOR SELECT TO authenticated USING (true);


--
-- Name: career_requests Users can create own career requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own career requests" ON public.career_requests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: pireps Users can create own pireps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own pireps" ON public.pireps FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: registration_approvals Users can create own registration; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own registration" ON public.registration_approvals FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: base_transfer_requests Users can create own transfer requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own transfer requests" ON public.base_transfer_requests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: dispatch_legs Users can delete own dispatch legs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own dispatch legs" ON public.dispatch_legs FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: career_requests Users can delete own processed career requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own processed career requests" ON public.career_requests FOR DELETE USING (((auth.uid() = user_id) AND (status = ANY (ARRAY['approved'::text, 'rejected'::text]))));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: type_ratings Users can insert own type ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own type ratings" ON public.type_ratings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: dispatch_legs Users can update own dispatch leg status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own dispatch leg status" ON public.dispatch_legs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: pireps Users can update own pireps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own pireps" ON public.pireps FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: type_ratings Users can update own type ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own type ratings" ON public.type_ratings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: career_requests Users can view own career requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own career requests" ON public.career_requests FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: dispatch_legs Users can view own dispatch legs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own dispatch legs" ON public.dispatch_legs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: pireps Users can view own pireps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own pireps" ON public.pireps FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: registration_approvals Users can view own registration; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own registration" ON public.registration_approvals FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: base_transfer_requests Users can view own transfer requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own transfer requests" ON public.base_transfer_requests FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: type_ratings Users can view own type ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own type ratings" ON public.type_ratings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: virtual_fleet Virtual fleet viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Virtual fleet viewable by authenticated" ON public.virtual_fleet FOR SELECT USING (true);


--
-- Name: admin_emails; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

--
-- Name: aeronautical_charts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.aeronautical_charts ENABLE ROW LEVEL SECURITY;

--
-- Name: aircraft; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.aircraft ENABLE ROW LEVEL SECURITY;

--
-- Name: base_transfer_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.base_transfer_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: bases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bases ENABLE ROW LEVEL SECURITY;

--
-- Name: career_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.career_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: dispatch_legs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dispatch_legs ENABLE ROW LEVEL SECURITY;

--
-- Name: notams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notams ENABLE ROW LEVEL SECURITY;

--
-- Name: pireps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pireps ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: registration_approvals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.registration_approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: route_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.route_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: routes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

--
-- Name: type_ratings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.type_ratings ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: virtual_fleet; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.virtual_fleet ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;