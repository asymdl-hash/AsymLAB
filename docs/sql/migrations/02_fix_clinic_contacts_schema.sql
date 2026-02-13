-- Migration: Fix clinic_contacts table schema to match TypeScript types
-- This migration renames and adds columns to align with the UI expectations

-- Step 1: Rename existing columns (if there's data, it will be preserved)
ALTER TABLE public.clinic_contacts 
    RENAME COLUMN description TO name;

ALTER TABLE public.clinic_contacts 
    RENAME COLUMN contact TO phone;

-- Step 2: Add missing column for contact type
ALTER TABLE public.clinic_contacts 
    ADD COLUMN IF NOT EXISTS type text DEFAULT 'general';

-- Step 3: Make 'name' allow empty strings (was NOT NULL before)
-- This allows creating empty contacts that will be filled later
ALTER TABLE public.clinic_contacts 
    ALTER COLUMN name DROP NOT NULL;

-- Step 4: Make 'phone' allow empty strings
ALTER TABLE public.clinic_contacts 
    ALTER COLUMN phone DROP NOT NULL;

-- Step 5: Update any existing records to have a default type if null
UPDATE public.clinic_contacts 
SET type = 'general' 
WHERE type IS NULL;
