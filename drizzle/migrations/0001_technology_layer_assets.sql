ALTER TABLE public.cmdb_ci
  ADD COLUMN IF NOT EXISTS asset_category text,
  ADD COLUMN IF NOT EXISTS asset_type text,
  ADD COLUMN IF NOT EXISTS data_center text,
  ADD COLUMN IF NOT EXISTS vendor text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS serial_number text,
  ADD COLUMN IF NOT EXISTS hostname text,
  ADD COLUMN IF NOT EXISTS operating_system text,
  ADD COLUMN IF NOT EXISTS version text,
  ADD COLUMN IF NOT EXISTS installation_date date,
  ADD COLUMN IF NOT EXISTS lifecycle_status text DEFAULT 'In Use',
  ADD COLUMN IF NOT EXISTS capacity jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.cmdb_ci.capacity IS 'Supporting technology resources (CPU, RAM, disk, bandwidth, IOPS...) as capacity metrics of the asset';