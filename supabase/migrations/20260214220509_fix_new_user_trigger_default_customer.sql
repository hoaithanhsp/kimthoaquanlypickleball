/*
  # Fix new user trigger to always default to customer role

  1. Changes
    - Update `handle_new_user` trigger function so all new signups get role = 'customer'
    - Only admins can manually promote users via the profiles table
  2. Security
    - Prevents users from self-assigning admin/staff roles during registration
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'customer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;