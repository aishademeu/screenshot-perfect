DROP POLICY IF EXISTS settings_read ON public.detection_settings;
CREATE POLICY settings_read ON public.detection_settings FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));