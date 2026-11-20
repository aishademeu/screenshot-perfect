-- Correct the manager-side private photo lookup path.
-- The earlier policy accidentally resolved the unqualified name to outlets.name.
DROP POLICY IF EXISTS photo_reports_read_scoped ON storage.objects;
CREATE POLICY photo_reports_read_scoped ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'photo-reports'
    AND (
      (storage.foldername(objects.name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1
        FROM public.photo_reports p
        JOIN public.retail_outlets o ON o.id = p.outlet_id
        WHERE p.storage_path = objects.name
          AND public.is_manager(o.region_id)
      )
    )
  );

-- A manager may review only pending reports; terminal reports cannot be
-- silently changed back to pending or approved/rejected repeatedly.
DROP POLICY IF EXISTS photo_review_manager ON public.photo_reports;
CREATE POLICY photo_review_manager ON public.photo_reports
  FOR UPDATE TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.retail_outlets o
      WHERE o.id = outlet_id
        AND public.is_manager(o.region_id)
    )
  )
  WITH CHECK (
    status IN ('approved', 'rejected')
    AND EXISTS (
      SELECT 1 FROM public.retail_outlets o
      WHERE o.id = outlet_id
        AND public.is_manager(o.region_id)
    )
  );


-- Employees must see tasks assigned to them, even when the originating alert
-- belongs to a different employee in the same region.
DROP POLICY IF EXISTS task_scope_read ON public.tasks;
CREATE POLICY task_scope_read ON public.tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.alerts a
      WHERE a.id = alert_id
        AND (
          public.can_scope(a.region_id, a.employee_id)
          OR public.can_scope(a.region_id, assigned_employee_id)
        )
    )
  );

DROP POLICY IF EXISTS event_scope_read ON public.task_events;
CREATE POLICY event_scope_read ON public.task_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.alerts a ON a.id = t.alert_id
      WHERE t.id = task_id
        AND (
          public.can_scope(a.region_id, a.employee_id)
          OR public.can_scope(a.region_id, t.assigned_employee_id)
        )
    )
  );
