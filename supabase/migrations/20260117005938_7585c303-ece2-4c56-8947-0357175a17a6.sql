-- Add SimBrief PID and IFC Username columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS simbrief_pid TEXT,
ADD COLUMN IF NOT EXISTS ifc_username TEXT;

-- Add SimBrief PID and IFC Username columns to registration_approvals table  
ALTER TABLE public.registration_approvals
ADD COLUMN IF NOT EXISTS simbrief_pid TEXT,
ADD COLUMN IF NOT EXISTS ifc_username TEXT;