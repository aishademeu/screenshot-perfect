-- Restrict tenant data reads to the user's assigned region or employee.
-- The previous policies only checked that a related outlet/alert existed,
-- which did not enforce the current user's scope.

DROP POLICY IF EXISTS sales_read ON public.sales_records;
CREATE POLICY sales_scope_read ON public.sales_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.retail_outlets o
      WHERE o.id = outlet_id
        AND public.can_scope(o.region_id, o.employee_id)
    )
  );

DROP POLICY IF EXISTS equipment_read ON public.equipment;
CREATE POLICY equipment_scope_read ON public.equipment
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.retail_outlets o
      WHERE o.id = outlet_id
        AND public.can_scope(o.region_id, o.employee_id)
    )
  );

DROP POLICY IF EXISTS plan_read ON public.planned_visits;
CREATE POLICY plan_scope_read ON public.planned_visits
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.retail_outlets o
      WHERE o.id = outlet_id
        AND public.can_scope(o.region_id, o.employee_id)
    )
  );

DROP POLICY IF EXISTS visit_scope ON public.visits;
CREATE POLICY visit_scope_read ON public.visits
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.retail_outlets o
      WHERE o.id = outlet_id
        AND public.can_scope(o.region_id, o.employee_id)
    )
  );

-- Check-ins may only be inserted by the signed-in user for an outlet
-- inside their assigned scope. Client-provided coordinates are never
-- accepted as verified by this policy.
GRANT INSERT ON public.visits TO authenticated;
CREATE POLICY visit_insert_own_scope ON public.visits
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND verified = false
    AND EXISTS (
      SELECT 1 FROM public.retail_outlets o
      WHERE o.id = outlet_id
        AND public.can_scope(o.region_id, o.employee_id)
    )
  );

DROP POLICY IF EXISTS photo_read ON public.photo_reports;
CREATE POLICY photo_scope_read ON public.photo_reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.retail_outlets o
      WHERE o.id = outlet_id
        AND public.can_scope(o.region_id, o.employee_id)
    )
  );

-- Only managers responsible for the outlet may review a photo report.
GRANT UPDATE (status, rejection_reason) ON public.photo_reports TO authenticated;
CREATE POLICY photo_review_manager ON public.photo_reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.retail_outlets o
      WHERE o.id = outlet_id
        AND public.is_manager(o.region_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.retail_outlets o
      WHERE o.id = outlet_id
        AND public.is_manager(o.region_id)
    )
  );

DROP POLICY IF EXISTS task_scope ON public.tasks;
CREATE POLICY task_scope_read ON public.tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.alerts a
      JOIN public.employees e ON e.id = a.employee_id
      WHERE a.id = alert_id
        AND public.can_scope(a.region_id, e.id)
    )
  );

DROP POLICY IF EXISTS event_scope ON public.task_events;
CREATE POLICY event_scope_read ON public.task_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.alerts a ON a.id = t.alert_id
      JOIN public.employees e ON e.id = a.employee_id
      WHERE t.id = task_id
        AND public.can_scope(a.region_id, e.id)
    )
  );
