-- Galiza Project Manager - Update Tasks Table for KPI Integration
-- Execute this in your Supabase SQL Editor

-- 1. Add new columns for KPI integration
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS kpi_enabled BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS kpi_code VARCHAR(100);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS kpi_category VARCHAR(100);

-- 2. Update existing tasks to have kpi_enabled as false
UPDATE tasks SET kpi_enabled = false WHERE kpi_enabled IS NULL;

-- 3. Create index for kpi_code to improve search performance if needed later
CREATE INDEX IF NOT EXISTS idx_tasks_kpi_code ON tasks(kpi_code);

COMMENT ON COLUMN tasks.kpi_enabled IS 'Indicates if this task should be collected by the KPI system';
COMMENT ON COLUMN tasks.kpi_code IS 'The specific KPI code this task contributes to (e.g., OPE 009)';
COMMENT ON COLUMN tasks.kpi_category IS 'The category of the KPI (Operational, Engineering, etc.)';
