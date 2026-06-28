-- Add Front Desk Access to Staff Activity Logs
-- Run this in Supabase SQL Editor

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Manager can view logs" ON staff_activity_logs;

-- Create new policies that allow front_desk to view and create logs
CREATE POLICY "Staff can view activity logs" ON staff_activity_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'front_desk'))
  );

CREATE POLICY "Staff can create activity logs" ON staff_activity_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'front_desk'))
  );

-- Also update facility_maintenance to allow front_desk to create maintenance requests
DROP POLICY IF EXISTS "Manager can view maintenance" ON facility_maintenance;
DROP POLICY IF EXISTS "Manager can manage maintenance" ON facility_maintenance;

CREATE POLICY "Staff can view maintenance" ON facility_maintenance
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'front_desk'))
  );

CREATE POLICY "Staff can create maintenance" ON facility_maintenance
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'front_desk'))
  );

CREATE POLICY "Manager can manage maintenance" ON facility_maintenance
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );
