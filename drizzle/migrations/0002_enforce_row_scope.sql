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


-- Allow an authenticated employee to complete only planned visits within
-- their assigned employee/region scope. The client may update completion time,
-- but cannot alter the outlet or schedule.
GRANT UPDATE (completed_at) ON public.planned_visits TO authenticated;
CREATE POLICY planned_visit_complete_own_scope ON public.planned_visits
  FOR UPDATE TO authenticated
  USING (
    completed_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.retail_outlets o
      WHERE o.id = outlet_id
        AND public.can_scope(o.region_id, o.employee_id)
    )
  )
  WITH CHECK (
    completed_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.retail_outlets o
      WHERE o.id = outlet_id
        AND public.can_scope(o.region_id, o.employee_id)
    )
  );


-- Photo uploads must belong to an outlet in the uploader's assigned scope.
DROP POLICY IF EXISTS photo_insert ON public.photo_reports;
CREATE POLICY photo_insert_own_scope ON public.photo_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND storage_path LIKE auth.uid()::text || '/%'
    AND EXISTS (
      SELECT 1 FROM public.retail_outlets o
      WHERE o.id = outlet_id
        AND public.can_scope(o.region_id, o.employee_id)
    )
  );

-- Managers may resolve alerts only in regions they manage.
GRANT UPDATE (status) ON public.alerts TO authenticated;
CREATE POLICY alert_resolve_manager ON public.alerts
  FOR UPDATE TO authenticated
  USING (status <> 'resolved' AND public.is_manager(region_id))
  WITH CHECK (status IN ('resolved', 'in_progress') AND public.is_manager(region_id));

-- Task assignment is manager-only and the selected employee must belong
-- to the same region as the alert. Upsert requires both INSERT and UPDATE.
GRANT INSERT (alert_id, assigned_employee_id, deadline, status),
      UPDATE (assigned_employee_id, deadline, status)
  ON public.tasks TO authenticated;
CREATE POLICY task_assign_manager ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    status = 'assigned'
    AND EXISTS (
      SELECT 1 FROM public.alerts a
      JOIN public.employees e ON e.id = assigned_employee_id
      WHERE a.id = alert_id
        AND e.region_id = a.region_id
        AND public.is_manager(a.region_id)
    )
  );
CREATE POLICY task_update_manager ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.alerts a
      WHERE a.id = alert_id
        AND public.is_manager(a.region_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.alerts a
      JOIN public.employees e ON e.id = assigned_employee_id
      WHERE a.id = alert_id
        AND e.region_id = a.region_id
        AND public.is_manager(a.region_id)
    )
  );


-- Keep automated detection aligned with the current calendar month.
CREATE OR REPLACE FUNCTION public.detect_problems(
  target_period date DEFAULT date_trunc('month', CURRENT_DATE)::date
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  s record;
BEGIN
  SELECT coalesce(max(missed_visits),5) AS misses,
         coalesce(max(sales_drop),30) AS drop_pct,
         coalesce(max(plan_threshold),50) AS plan_pct
    INTO s
    FROM public.detection_settings;

  INSERT INTO public.alerts(condition_key,kind,title,priority,region_id,employee_id,evidence,demo)
  SELECT 'miss:'||e.id||':'||target_period,'missed_visits','Five planned visits missed','high',
         e.region_id,e.id,
         jsonb_build_object('count',count(*),'outlets',jsonb_agg(p.outlet_id),'dates',jsonb_agg(p.scheduled_at)),
         e.demo
  FROM public.planned_visits p
  JOIN public.retail_outlets o ON o.id=p.outlet_id
  JOIN public.employees e ON e.id=o.employee_id
  WHERE p.completed_at IS NULL AND p.scheduled_at<now()
    AND date_trunc('month',p.scheduled_at)::date=target_period
  GROUP BY e.id HAVING count(*)>=s.misses
  ON CONFLICT(condition_key) DO NOTHING;

  INSERT INTO public.alerts(condition_key,kind,title,priority,region_id,employee_id,evidence,demo)
  SELECT 'drop:'||e.id||':'||target_period,'sales_drop','Sales decreased by 30% or more','high',
         e.region_id,e.id,
         jsonb_build_object('current',sum(c.amount),'previous',sum(p.amount),
           'change',round((sum(c.amount)/nullif(sum(p.amount),0)-1)*100,2)),
         e.demo
  FROM public.employees e
  JOIN public.retail_outlets o ON o.employee_id=e.id
  JOIN public.sales_records c ON c.outlet_id=o.id AND c.period=target_period
  JOIN public.sales_records p ON p.outlet_id=o.id AND p.period=(target_period-interval '1 month')::date
  GROUP BY e.id HAVING sum(p.amount)>0 AND sum(c.amount)<=sum(p.amount)*(1-s.drop_pct/100)
  ON CONFLICT(condition_key) DO NOTHING;

  INSERT INTO public.alerts(condition_key,kind,title,priority,region_id,employee_id,outlet_id,evidence,demo)
  SELECT 'missing:'||q.id,'missing_freezer','Company freezer confirmed missing','critical',
         o.region_id,o.employee_id,o.id,
         jsonb_build_object('equipment',q.id,'last_verified',q.last_verified_at),o.demo
  FROM public.equipment q JOIN public.retail_outlets o ON o.id=q.outlet_id
  WHERE q.expected AND q.status='missing'
  ON CONFLICT(condition_key) DO NOTHING;

  INSERT INTO public.alerts(condition_key,kind,title,priority,region_id,employee_id,outlet_id,evidence,demo)
  SELECT 'idle:'||q.id||':'||target_period,'freezer_without_sales','Installed freezer has no sales','medium',
         o.region_id,o.employee_id,o.id,
         jsonb_build_object('equipment',q.id,'sales',c.amount,'period',target_period),o.demo
  FROM public.equipment q
  JOIN public.retail_outlets o ON o.id=q.outlet_id
  JOIN public.sales_records c ON c.outlet_id=o.id AND c.period=target_period
  WHERE q.status='installed' AND c.amount=0
  ON CONFLICT(condition_key) DO NOTHING;

  INSERT INTO public.alerts(condition_key,kind,title,priority,region_id,employee_id,evidence,demo)
  SELECT 'plan:'||e.id||':'||target_period,'low_plan','Sales plan completion at or below 50%','medium',
         e.region_id,e.id,
         jsonb_build_object('current',sum(c.amount),'target',sum(c.plan),
           'achievement',round(sum(c.amount)/nullif(sum(c.plan),0)*100,2),'gap',sum(c.plan)-sum(c.amount)),
         e.demo
  FROM public.employees e
  JOIN public.retail_outlets o ON o.employee_id=e.id
  JOIN public.sales_records c ON c.outlet_id=o.id AND c.period=target_period
  GROUP BY e.id
  HAVING sum(c.plan)>0 AND sum(c.amount)<=sum(c.plan)*s.plan_pct/100
  ON CONFLICT(condition_key) DO NOTHING;

  INSERT INTO public.notifications(user_id,alert_id)
  SELECT u.user_id,a.id
  FROM public.alerts a
  JOIN public.user_roles u ON u.role IN ('sd','ceo') OR (u.role='rd' AND u.region_id=a.region_id)
  WHERE a.status<>'resolved'
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_detection()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  PERFORM public.detect_problems(date_trunc('month', CURRENT_DATE)::date);
  RETURN NEW;
END;
$$;
