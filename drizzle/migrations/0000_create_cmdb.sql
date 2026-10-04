CREATE TABLE public.cmdb_ci (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  ci_class text NOT NULL,
  category text, criticality text NOT NULL DEFAULT 'Medium',
  environment text DEFAULT 'Production', status text DEFAULT 'Active',
  location text, department text,
  business_owner text, technical_owner text, support_team text,
  ip_address text, mac_address text, subnet text, gateway text, vlan text,
  network_zone text, device_role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cmdb_relationship (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.cmdb_ci(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.cmdb_ci(id) ON DELETE CASCADE,
  rel_type text NOT NULL, layer text NOT NULL DEFAULT 'business',
  source_port text, target_port text, link_status text DEFAULT 'up',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.cmdb_ci TO anon, authenticated;
GRANT SELECT ON public.cmdb_relationship TO anon, authenticated;
GRANT ALL ON public.cmdb_ci, public.cmdb_relationship TO service_role;
ALTER TABLE public.cmdb_ci ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmdb_relationship ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo read ci" ON public.cmdb_ci FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "demo update ci" ON public.cmdb_ci FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "demo read rel" ON public.cmdb_relationship FOR SELECT TO anon, authenticated USING (true);
CREATE OR REPLACE FUNCTION public.cmdb_touch() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER cmdb_ci_touch BEFORE UPDATE ON public.cmdb_ci FOR EACH ROW EXECUTE FUNCTION public.cmdb_touch();
ALTER PUBLICATION supabase_realtime ADD TABLE public.cmdb_ci, public.cmdb_relationship;